// Dev only: a tiny Spike Attack server for the preview (warnings, strikes, lives, places and bots), close to the backend's rules
import { SPIKES_LIVES, type SpikeDir, type SpikesMoveInput, type SpikesView } from '../../types';

const DIRS: SpikeDir[] = ['left', 'right', 'top', 'bottom'];
let nextId = 1;
const onLine = (p: [number, number], w: { dir: SpikeDir; line: number }) => (w.dir === 'left' || w.dir === 'right' ? p[1] === w.line : p[0] === w.line);

export function newSpikes(ids: string[], size: number, now: number): SpikesView {
  const corners: [number, number][] = [[0, 0], [size - 1, size - 1], [size - 1, 0], [0, size - 1]];
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

export function stepIn(v: SpikesView, id: string, dir: SpikesMoveInput['dir']): SpikesView {
  if (v.phase !== 'play' || (v.lives[id] ?? 0) <= 0) return v;
  const [c, r] = v.pos[id];
  const n = v.size;
  const p: [number, number] = dir === 'left' ? [Math.max(0, c - 1), r] : dir === 'right' ? [Math.min(n - 1, c + 1), r] : dir === 'up' ? [c, Math.max(0, r - 1)] : [c, Math.min(n - 1, r + 1)];
  return { ...v, pos: { ...v.pos, [id]: p } };
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
    const hit = Object.keys(lives).filter((id) => lives[id] > 0 && (safe[id] ?? 0) <= now && onLine(s.pos[id], w));
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

/** a bot's next step: off any line about to strike, else a little wander */
export function botStep(v: SpikesView, id: string, late: boolean, rnd = Math.random): SpikesMoveInput['dir'] | null {
  const p = v.pos[id];
  const danger = (q: [number, number]) => v.warnings.some((w) => onLine(q, w) && w.strikeAt - v.now < (late ? 700 : 1800));
  const moves: { d: SpikesMoveInput['dir']; q: [number, number] }[] = [
    { d: 'left', q: [p[0] - 1, p[1]] },
    { d: 'right', q: [p[0] + 1, p[1]] },
    { d: 'up', q: [p[0], p[1] - 1] },
    { d: 'down', q: [p[0], p[1] + 1] },
  ];
  const ok = moves.filter((m) => m.q.every((x) => x >= 0 && x < v.size));
  if (danger(p)) {
    const out = ok.filter((m) => !danger(m.q));
    return (out[Math.floor(rnd() * out.length)] ?? ok[0])?.d ?? null;
  }
  if (rnd() < 0.25) {
    const calm = ok.filter((m) => !v.warnings.some((w) => onLine(m.q, w)));
    return calm[Math.floor(rnd() * calm.length)]?.d ?? null;
  }
  return null;
}
