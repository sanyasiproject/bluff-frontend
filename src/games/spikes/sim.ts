// Dev only: a tiny Spike Attack server for the preview (boxes, whole-side walls, lives, places, bots), close to the backend's rules
import { SPIKES_LIVES, SPIKES_RADIUS, SPIKES_SPEED, type SpikeDir, type SpikesView } from '../../types';
import { cellSafe, drawBoxes, freeCells, hitBy, makeBoxes, pairUp, pathTo, reachesOf, safePairs, slide, SPIKE_DIRS, walk, type Cell, type Point } from './rules';

const SLACK = 0.35;
const FIRST_WARN_MS = 800;
const PACE = {
  normal: { warn: [3000, 1500], gap: [[1500, 3000], [700, 1500]], ramp: 90000, twoFrom: 45000, two: 0.35 },
  fast: { warn: [2000, 1300], gap: [[1200, 2400], [600, 1200]], ramp: 60000, twoFrom: 30000, two: 0.4 },
} as const;
/** crates shift on arenas this big and up (server: SPIKES_SHIFT_FROM) */
const SHIFT_FROM = 8;
/** time between crate shifts (ms); the preview may shorten it */
export const SHIFT = { every: 40_000 };
/** ghosts show this long before the crates land, and walls wait this long after (ms) */
const SHIFT_WARN_MS = 2_000;
const SHIFT_CALM_MS = 700;
const SHIFT_TRIES = 3;
/** the chance a wall is aimed at the sides hitting the most players */
const AIM = 0.6;
/** extra warning per size step over 6 (ms) */
const WARN_PER_SIZE = 125;
let nextId = 1;
/** sim state the view doesn't carry */
const extra = { game: 0, nextWarnAt: 0, lastDirs: [] as SpikeDir[], nextShiftAt: Infinity, shiftTries: 0 };

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
  return { warn: lerp(p.warn[0], p.warn[1]) + Math.max(0, v.size - 6) * WARN_PER_SIZE, gap: [lerp(p.gap[0][0], p.gap[1][0]), lerp(p.gap[0][1], p.gap[1][1])], two: played >= p.twoFrom ? p.two : 0 };
};

/** one server tick: start, warn a side (later sometimes two), fire walls, end */
export function tick(v: SpikesView, now: number, fast: boolean, rnd = Math.random): SpikesView {
  let s = { ...v, now };
  if (s.phase === 'countdown') return now >= s.startsAt ? { ...s, phase: 'play' } : s;
  if (s.phase !== 'play') return s;
  // a new game: the first wall shortly after the start
  if (extra.game !== s.startsAt)
    Object.assign(extra, { game: s.startsAt, nextWarnAt: s.startsAt + FIRST_WARN_MS, lastDirs: [], nextShiftAt: s.size >= SHIFT_FROM ? s.startsAt + SHIFT.every : Infinity, shiftTries: 0 });
  // crate shifts: land (or re-plan if someone stands on a target), else warn the next one between walls
  if (s.boxesNext && now >= (s.boxesAt ?? 0)) return shiftLand(s, now);
  if (!s.boxesNext && !s.warnings.length && now >= extra.nextShiftAt) return planShift(s, now);
  const p = pace(s, now, fast);
  if (!s.warnings.length && !s.boxesNext && now >= extra.nextWarnAt) {
    const pairs = safePairs(s.size, s.boxes).filter(([a, b]) => !extra.lastDirs.includes(a) && !extra.lastDirs.includes(b));
    let one = SPIKE_DIRS.filter((d) => !extra.lastDirs.includes(d));
    // often aimed at whoever stands still: the sides that would hit the most players right now
    if (rnd() < AIM) {
      const rs = reachesOf(s.size, s.boxes);
      const count = (d: SpikeDir) => Object.keys(s.lives).filter((id) => s.lives[id] > 0 && hitBy(s.size, rs[d], d, s.pos[id])).length;
      const best = Math.max(...one.map(count));
      if (best > 0) one = one.filter((d) => count(d) === best);
    }
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

/** a living player's circle overlaps square [c, r] (with `margin` to spare) */
const onCell = (v: SpikesView, [c, r]: Cell, margin: number) =>
  Object.keys(v.lives).some((id) => {
    if (v.lives[id] <= 0) return false;
    const [x, y] = v.pos[id];
    return Math.hypot(x - Math.min(c + 1, Math.max(c, x)), y - Math.min(r + 1, Math.max(r, y))) < SPIKES_RADIUS + margin;
  });

/** ghosts of a new fair layout clear of every player, paired crate by crate; called off when none turns up */
function planShift(v: SpikesView, now: number): SpikesView {
  const was = new Set(v.boxes.map(([c, r]) => `${c},${r}`));
  const rand = (n: number) => Math.floor(Math.random() * n);
  for (let t = 0; t < 4; t++) {
    const next = drawBoxes(v.size, rand, (cell) => onCell(v, cell, 0.15), 120);
    if (next && next.some(([c, r]) => !was.has(`${c},${r}`))) {
      extra.nextWarnAt = Math.max(extra.nextWarnAt, now + SHIFT_WARN_MS + SHIFT_CALM_MS);
      return { ...v, boxesNext: pairUp(v.boxes, next), boxesAt: now + SHIFT_WARN_MS };
    }
  }
  return callOff(v, now);
}

function callOff(v: SpikesView, now: number): SpikesView {
  Object.assign(extra, { shiftTries: 0, nextShiftAt: now + SHIFT.every });
  const { boxesNext: _n, boxesAt: _a, ...rest } = v;
  return rest;
}

/** the crates land, unless a player stands on a target square: then another layout (a few times at most) */
function shiftLand(v: SpikesView, now: number): SpikesView {
  if (v.boxesNext!.some((cell) => onCell(v, cell, 0))) return ++extra.shiftTries >= SHIFT_TRIES ? callOff(v, now) : planShift(v, now);
  const boxes = v.boxesNext!;
  return { ...callOff(v, now), boxes };
}

/** how far a point is from square [c, r] */
const gapTo = ([c, r]: Cell, [x, y]: Point) => Math.hypot(x - Math.min(c + 1, Math.max(c, x)), y - Math.min(r + 1, Math.max(r, y)));

const cellOf = (p: Point, size: number): Cell => [Math.min(size - 1, Math.max(0, Math.floor(p[0]))), Math.min(size - 1, Math.max(0, Math.floor(p[1])))];

/** where a bot heads next: along a path round the boxes to the nearest square shielded from every warned side (seen `late` = only the last 0.7 s), else its wander spot */
export function botGoal(v: SpikesView, id: string, late: boolean, wander: [number, number]): [number, number] {
  const p = v.pos[id];
  const seen = v.warnings.filter((w) => w.strikeAt - v.now < (late ? 700 : 2600));
  // while crates are about to shift, their target squares count as taken
  const ghosts = v.boxesNext ?? [];
  const onGhost = (q: Point) => ghosts.some((c) => gapTo(c, q) < SPIKES_RADIUS + 0.1);
  const blocks = ghosts.length ? [...v.boxes, ...ghosts] : v.boxes;
  const found = walk(v.size, blocks, cellOf(p, v.size));
  if (!seen.length) {
    if (!onGhost(p)) return onGhost(wander) ? p : wander;
    // standing on a square a crate is about to land on: step off to the nearest clear one
    const off = [...found.values()].filter((f) => f.steps > 0 && !onGhost([f.cell[0] + 0.5, f.cell[1] + 0.5]));
    if (!off.length) return p;
    const to = off.reduce((a, b) => (b.steps < a.steps ? b : a)).cell;
    const next = pathTo(found, to)[0] ?? to;
    return [next[0] + 0.5, next[1] + 0.5];
  }
  const reaches = reachesOf(v.size, v.boxes);
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
  const free = freeCells(v.size, [...v.boxes, ...(v.boxesNext ?? [])]);
  const c = free[Math.floor(Math.random() * free.length)];
  return [c[0] + 0.5, c[1] + 0.5];
}
