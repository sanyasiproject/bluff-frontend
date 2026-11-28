// Dev only: a tiny Spike Attack server for the preview (boxes, whole-side walls, lives, places, bots), close to the backend's rules
import { SPIKES_LIVES, SPIKES_SPEED, type SpikeDir, type SpikesView } from '../../types';
import { cellSafe, freeCells, hitBy, makeBoxes, pathTo, reachesOf, safePairs, slide, SPIKE_DIRS, walk, type Cell, type Point } from './rules';

const SLACK = 0.35;
const FIRST_WARN_MS = 800;
const PACE = {
  normal: { warn: [3000, 1500], gap: [[1500, 3000], [700, 1500]], ramp: 90000, twoFrom: 45000, two: 0.35 },
  fast: { warn: [2000, 1300], gap: [[1200, 2400], [600, 1200]], ramp: 60000, twoFrom: 30000, two: 0.4 },
} as const;
let nextId = 1;
/** sim state the view doesn't carry */
const extra = { game: 0, nextWarnAt: 0, lastDirs: [] as SpikeDir[] };

export function newSpikes(ids: string[], size: number, now: number): SpikesView {
  const lo = 0.5;
  const hi = size - 0.5;
  const corners: [number, number][] = [[lo, lo], [hi, hi], [hi, lo], [lo, hi]];
  const startsAt = now + 3000;
  return {
    size,
    phase: 'countdown',
    startsAt,
    pos: Object.fromEntries(ids.map((id, i) => [id, corners[i]])),
    lives: Object.fromEntries(ids.map((id) => [id, SPIKES_LIVES])),
    safeUntil: {},
    boxes: makeBoxes(size, (n) => Math.floor(Math.random() * n)),
    warnings: [],
    strikes: [],
    places: {},
    now,
  };
}

/** last accepted move time per player (the server keeps the same) */
const movedAt: Record<string, number> = {};

/** a move as the server takes it: cut to the distance allowed since the last one, then walked round the boxes */
export function moveIn(v: SpikesView, id: string, x: number, y: number, now: number): SpikesView {
  if (v.phase !== 'play' || (v.lives[id] ?? 0) <= 0) return v;
  const [px, py] = v.pos[id];
  const dt = Math.max(0, (now - (movedAt[id] ?? now - 100)) / 1000);
  movedAt[id] = now;
  const max = SPIKES_SPEED * dt + SLACK;
  let dx = x - px;
  let dy = y - py;
  const d = Math.hypot(dx, dy);
  if (d > max) {
    dx = (dx / d) * max;
    dy = (dy / d) * max;
  }
  const q = slide(v.size, v.boxes, [px, py], [px + dx, py + dy]);
  return { ...v, pos: { ...v.pos, [id]: q } };
}

const pace = (v: SpikesView, now: number, fast: boolean) => {
  const p = fast ? PACE.fast : PACE.normal;
  const played = Math.max(0, now - v.startsAt);
  const k = Math.min(1, played / p.ramp);
  const lerp = (a: number, b: number) => Math.round(a - (a - b) * k);
  return { warn: lerp(p.warn[0], p.warn[1]), gap: [lerp(p.gap[0][0], p.gap[1][0]), lerp(p.gap[0][1], p.gap[1][1])], two: played >= p.twoFrom ? p.two : 0 };
};

/** one server tick: start, warn a side (later sometimes two), fire walls, end */
export function tick(v: SpikesView, now: number, fast: boolean, rnd = Math.random): SpikesView {
  let s = { ...v, now };
  if (s.phase === 'countdown') return now >= s.startsAt ? { ...s, phase: 'play' } : s;
  if (s.phase !== 'play') return s;
  // a new game: the first wall shortly after the start
  if (extra.game !== s.startsAt) Object.assign(extra, { game: s.startsAt, nextWarnAt: s.startsAt + FIRST_WARN_MS, lastDirs: [] });
  const p = pace(s, now, fast);
  if (!s.warnings.length && now >= extra.nextWarnAt) {
    const pairs = safePairs(s.size, s.boxes).filter(([a, b]) => !extra.lastDirs.includes(a) && !extra.lastDirs.includes(b));
    const one = SPIKE_DIRS.filter((d) => !extra.lastDirs.includes(d));
    const dirs: SpikeDir[] = p.two > 0 && pairs.length && rnd() < p.two ? [...pairs[Math.floor(rnd() * pairs.length)]] : [one[Math.floor(rnd() * one.length)]];
    extra.lastDirs = dirs;
    s.warnings = dirs.map((dir) => ({ id: nextId++, dir, warnAt: now, strikeAt: now + p.warn }));
    return s;
  }
  const due = s.warnings.filter((w) => w.strikeAt <= now);
  if (!due.length) return s;
  s.warnings = s.warnings.filter((w) => w.strikeAt > now);
  if (!s.warnings.length) extra.nextWarnAt = now + p.gap[0] + rnd() * (p.gap[1] - p.gap[0]);
  const reaches = reachesOf(s.size, s.boxes);
  const lives = { ...s.lives };
  const safe = { ...s.safeUntil };
  const strikes = [...s.strikes];
  const places = { ...s.places };
  for (const w of due) {
    const hit = Object.keys(lives).filter((id) => lives[id] > 0 && (safe[id] ?? 0) <= now && hitBy(s.size, reaches[w.dir], w.dir, s.pos[id]));
    for (const id of hit) {
      lives[id] -= 1;
      safe[id] = now + 1000;
    }
    const alive = Object.keys(lives).filter((id) => lives[id] > 0).length;
    for (const id of hit) if (lives[id] <= 0) places[id] = alive + 1;
    strikes.push({ id: w.id, dir: w.dir, at: now, hit });
  }
  s = { ...s, lives, safeUntil: safe, strikes: strikes.slice(-8), places };
  const alive = Object.keys(lives).filter((id) => lives[id] > 0);
  if (alive.length <= 1) {
    for (const id of alive) places[id] = 1;
    s = { ...s, phase: 'over', warnings: [], places };
  }
  return s;
}

const cellOf = (p: Point, size: number): Cell => [Math.min(size - 1, Math.max(0, Math.floor(p[0]))), Math.min(size - 1, Math.max(0, Math.floor(p[1])))];

/** where a bot heads next: along a path round the boxes to the nearest square shielded from every warned side (seen `late` = only the last 0.7 s), else its wander spot */
export function botGoal(v: SpikesView, id: string, late: boolean, wander: [number, number]): [number, number] {
  const p = v.pos[id];
  const seen = v.warnings.filter((w) => w.strikeAt - v.now < (late ? 700 : 2600));
  if (!seen.length) return wander;
  const reaches = reachesOf(v.size, v.boxes);
  const found = walk(v.size, v.boxes, cellOf(p, v.size));
  let best: Cell | null = null;
  let bs = Infinity;
  for (const cell of freeCells(v.size, v.boxes)) {
    const at = found.get(`${cell[0]},${cell[1]}`);
    if (!at || !seen.every((w) => cellSafe(v.size, reaches, w.dir, cell))) continue;
    if (at.steps < bs) {
      bs = at.steps;
      best = cell;
    }
  }
  if (!best) return p;
  const next = pathTo(found, best)[0] ?? best;
  return [next[0] + 0.5, next[1] + 0.5];
}

/** a step of `dt` seconds towards a goal at full speed */
export function stepToward(p: [number, number], goal: [number, number], dt: number): [number, number] {
  const dx = goal[0] - p[0];
  const dy = goal[1] - p[1];
  const d = Math.hypot(dx, dy);
  const k = d < 1e-3 ? 0 : Math.min(1, (SPIKES_SPEED * dt) / d);
  return [p[0] + dx * k, p[1] + dy * k];
}

/** a free square's centre for a bot to wander to */
export function wanderSpot(v: SpikesView): [number, number] {
  const free = freeCells(v.size, v.boxes);
  const c = free[Math.floor(Math.random() * free.length)];
  return [c[0] + 0.5, c[1] + 0.5];
}
