// Five in a Row helpers for the app: points, star points, lines through a stone (the server decides; these draw and preview)
import { gomokuCentre } from '../../types';

export const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

export const rc = (size: number, at: number) => ({ r: Math.floor(at / size), c: at % size });

/** the hoshi dots: corners at 4th line in, sides on 19, and the centre */
export function starPoints(size: number): number[] {
  const e = 3;
  const m = Math.floor(size / 2);
  const ks = size >= 19 ? [e, m, size - 1 - e] : [e, size - 1 - e];
  const out = ks.flatMap((r) => ks.map((c) => r * size + c));
  if (!out.includes(m * size + m)) out.push(m * size + m);
  return out;
}

/** the longest run through a point for its owner, as a list of points */
export function runAt(size: number, stones: Record<number, string>, at: number): number[] {
  const who = stones[at];
  if (!who) return [];
  let best: number[] = [at];
  const { r, c } = rc(size, at);
  for (const [dr, dc] of DIRS) {
    const run = [at];
    for (const s of [1, -1]) {
      for (let k = 1; ; k++) {
        const rr = r + dr * k * s;
        const cc = c + dc * k * s;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size || stones[rr * size + cc] !== who) break;
        if (s === 1) run.push(rr * size + cc);
        else run.unshift(rr * size + cc);
      }
    }
    if (run.length > best.length) best = run;
  }
  return best;
}

/** a player's longest line on the board */
export function longestOf(size: number, stones: Record<number, string>, id: string): number {
  let best = 0;
  for (const k of Object.keys(stones)) if (stones[+k] === id) best = Math.max(best, runAt(size, stones, +k).length);
  return best;
}

/** empty points next to any stone (or the centre on an empty board) */
export function nearEmpty(size: number, stones: Record<number, string>, reach = 1): number[] {
  const keys = Object.keys(stones).map(Number);
  if (!keys.length) return [gomokuCentre(size)];
  const out = new Set<number>();
  for (const k of keys) {
    const { r, c } = rc(size, k);
    for (let dr = -reach; dr <= reach; dr++)
      for (let dc = -reach; dc <= reach; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr >= 0 && cc >= 0 && rr < size && cc < size && !stones[rr * size + cc]) out.add(rr * size + cc);
      }
  }
  return [...out];
}
