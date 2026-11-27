// Dev only: a tiny Spike Attack server for the preview (free movement, warnings, band hits, lives, places, bots), close to the backend's rules
import { SPIKES_LIVES, SPIKES_RADIUS, SPIKES_SPEED, type SpikeDir, type SpikesView } from '../../types';

const DIRS: SpikeDir[] = ['left', 'right', 'top', 'bottom'];
const SLACK = 0.35;
let nextId = 1;

/** a spike on row/column `line` hits a body overlapping its band (a little forgiving) */
export const inBand = (p: [number, number], w: { dir: SpikeDir; line: number }) => {
  const c = w.dir === 'left' || w.dir === 'right' ? p[1] : p[0];
  return Math.abs(c - (w.line + 0.5)) < 0.5 + SPIKES_RADIUS * 0.85;
};

export function newSpikes(ids: string[], size: number, now: number): SpikesView {
  const lo = 0.5;
  const hi = size - 0.5;
  const corners: [number, number][] = [[lo, lo], [hi, hi], [hi, lo], [lo, hi]];
  return {
    size,
    phase: 'countdown',
    startsAt: now + 3000,
    pos: Object.fromEntries(ids.map((id, i) => [id, corners[i]])),
    lives: Object.fromEntries(ids.map((id) => [id, SPIKES_LIVES])),
    safeUntil: {},
    warnings: [],
    strikes: [],
    places: {},
    now,
  };
}

/** last accepted move time per player (the server keeps the same) */
const movedAt: Record<string, number> = {};

/** a move as the server takes it: never refused, clamped to the distance allowed since the last one and to the arena */
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
  const r = SPIKES_RADIUS;
  const q: [number, number] = [Math.min(v.size - r, Math.max(r, px + dx)), Math.min(v.size - r, Math.max(r, py + dy))];
  return { ...v, pos: { ...v.pos, [id]: q } };
}

/** one server tick: start, spawn warnings, fire strikes, end */
export function tick(v: SpikesView, now: number, fast: boolean, rnd = Math.random): SpikesView {
  let s = { ...v, now };
  if (s.phase === 'countdown') return now >= s.startsAt ? { ...s, phase: 'play' } : s;
  if (s.phase !== 'play') return s;
  const t = (now - s.startsAt) / 1000;
  // warnings shrink from 3 s (fast 2 s) towards 1 s, and more overlap later
  const warnMs = Math.max(1000, (fast ? 2000 : 3000) - t * 30);
  const most = Math.min(4, 1 + Math.floor(t / 12));
  const lastWarn = s.warnings.reduce((m, w) => Math.max(m, w.warnAt), 0);
  if (s.warnings.length < most && now - lastWarn > Math.max(350, 1400 - t * 15)) {
    const id = nextId++;
    s.warnings = [...s.warnings, { id, dir: DIRS[Math.floor(rnd() * 4)], line: Math.floor(rnd() * s.size), warnAt: now, strikeAt: now + warnMs }];
  }
  const due = s.warnings.filter((w) => w.strikeAt <= now);
  if (!due.length) return s;
  s.warnings = s.warnings.filter((w) => w.strikeAt > now);
  const lives = { ...s.lives };
  const safe = { ...s.safeUntil };
  const strikes = [...s.strikes];
  const places = { ...s.places };
  for (const w of due) {
    const hit = Object.keys(lives).filter((id) => lives[id] > 0 && (safe[id] ?? 0) <= now && inBand(s.pos[id], w));
    for (const id of hit) {
      lives[id] -= 1;
      safe[id] = now + 1000;
    }
    const alive = Object.keys(lives).filter((id) => lives[id] > 0).length;
    for (const id of hit) if (lives[id] <= 0) places[id] = alive + 1;
    strikes.push({ id: w.id, dir: w.dir, line: w.line, at: now, hit });
  }
  s = { ...s, lives, safeUntil: safe, strikes: strikes.slice(-8), places };
  const alive = Object.keys(lives).filter((id) => lives[id] > 0);
  if (alive.length <= 1) {
    for (const id of alive) places[id] = 1;
    s = { ...s, phase: 'over', warnings: [], places };
  }
  return s;
}

/** where a bot heads: the nearest cell centre out of every band about to strike (seen `late` = only the last 0.7 s), else its wander spot */
export function botGoal(v: SpikesView, id: string, late: boolean, wander: [number, number]): [number, number] {
  const p = v.pos[id];
  const soon = v.warnings.filter((w) => w.strikeAt - v.now < (late ? 700 : 1800));
  if (!soon.some((w) => inBand(p, w)) && !v.warnings.some((w) => inBand(wander, w))) return wander;
  let best: [number, number] = p;
  let bd = Infinity;
  for (let r = 0; r < v.size; r++)
    for (let c = 0; c < v.size; c++) {
      const q: [number, number] = [c + 0.5, r + 0.5];
      if (v.warnings.some((w) => inBand(q, w))) continue;
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
  return best;
}

/** a step of `dt` seconds towards a goal at full speed */
export function stepToward(p: [number, number], goal: [number, number], dt: number): [number, number] {
  const dx = goal[0] - p[0];
  const dy = goal[1] - p[1];
  const d = Math.hypot(dx, dy);
  const k = d < 1e-3 ? 0 : Math.min(1, (SPIKES_SPEED * dt) / d);
  return [p[0] + dx * k, p[1] + dy * k];
}
