// Saanp Seedhi board maths: square centres, snake curves, ladder rails and where tokens stand (board units: 1 = one square)
import { LADDERS, SNAKES, snakesCellOf, type SnakesSeat } from '../../types';

export type Pt = [number, number];

/** where my seat and the others sit round the board, by how many seats after me */
export const CORNERS: Record<number, string[]> = { 1: ['bl'], 2: ['bl', 'tr'], 3: ['bl', 'tl', 'tr'], 4: ['bl', 'tl', 'tr', 'br'] };

/** off the board: tokens not yet on square 1 wait at the side by their player's corner */
const WAIT: Record<string, Pt> = { bl: [-0.62, 5.7], tl: [-0.62, 4.1], tr: [10.62, 4.1], br: [10.62, 5.7] };

/** centre of a square (0 = the waiting spot by the corner) */
export function centreOf(square: number, corner = 'bl'): Pt {
  const c = snakesCellOf(square);
  return c ? [c[0] + 0.5, c[1] + 0.5] : WAIT[corner] ?? WAIT.bl;
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const len = (v: Pt) => Math.hypot(v[0], v[1]);

/** points along a snake from its head to its tail: a gentle wave that settles on both ends */
export function snakePoints(head: number, tail: number, n = 48): Pt[] {
  const h = centreOf(head);
  const t = centreOf(tail);
  const d = sub(t, h);
  const L = len(d) || 1;
  const nrm: Pt = [-d[1] / L, d[0] / L];
  const waves = Math.max(1, Math.round(L / 2.4));
  // each snake bends its own way
  const sign = head % 2 ? 1 : -1;
  const amp = Math.min(0.42, 0.18 + L * 0.03) * sign;
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const off = amp * Math.sin(s * waves * Math.PI * 2) * Math.sin(Math.PI * s) ** 0.6;
    out.push([h[0] + d[0] * s + nrm[0] * off, h[1] + d[1] * s + nrm[1] * off]);
  }
  return out;
}

/** the snake's body outline: thick behind the head, thin at the tail */
export function snakeBody(pts: Pt[]): { outline: string; spine: string; spots: { p: Pt; r: number }[] } {
  const n = pts.length - 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const spots: { p: Pt; r: number }[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n, i + 1)];
    const tg = sub(b, a);
    const tl = len(tg) || 1;
    const nm: Pt = [-tg[1] / tl, tg[0] / tl];
    const s = i / n;
    const w = 0.19 * (1 - 0.75 * s) + 0.03;
    left.push([p[0] + nm[0] * w, p[1] + nm[1] * w]);
    right.push([p[0] - nm[0] * w, p[1] - nm[1] * w]);
    if (i > 2 && i < n - 2 && i % 4 === 0) spots.push({ p, r: w * 0.5 });
  });
  const f = (q: Pt) => `${q[0].toFixed(3)} ${q[1].toFixed(3)}`;
  const outline = `M${left.map(f).join('L')}L${right.reverse().map(f).join('L')}Z`;
  const spine = `M${pts.map(f).join('L')}`;
  return { outline, spine, spots };
}

/** the head's angle (degrees) so it faces away from the body */
export function headAngle(pts: Pt[]): number {
  const v = sub(pts[0], pts[2]);
  return (Math.atan2(v[1], v[0]) * 180) / Math.PI;
}

/** a ladder's two rails and its rungs, from the foot square to the top square */
export function ladderParts(foot: number, top: number): { rails: [Pt, Pt][]; rungs: [Pt, Pt][] } {
  const f = centreOf(foot);
  const t = centreOf(top);
  const d = sub(t, f);
  const L = len(d) || 1;
  const u: Pt = [d[0] / L, d[1] / L];
  const nm: Pt = [-u[1], u[0]];
  const half = 0.2;
  const a: Pt = [f[0] - u[0] * 0.18, f[1] - u[1] * 0.18];
  const b: Pt = [t[0] + u[0] * 0.18, t[1] + u[1] * 0.18];
  const side = (p: Pt, k: number): Pt => [p[0] + nm[0] * half * k, p[1] + nm[1] * half * k];
  const rails: [Pt, Pt][] = [
    [side(a, 1), side(b, 1)],
    [side(a, -1), side(b, -1)],
  ];
  const rungs: [Pt, Pt][] = [];
  const count = Math.max(2, Math.floor((L + 0.36) / 0.42));
  for (let i = 1; i <= count; i++) {
    const s = i / (count + 1);
    const p: Pt = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
    rungs.push([side(p, 1), side(p, -1)]);
  }
  return { rails, rungs };
}

export const SNAKE_LIST = Object.entries(SNAKES).map(([h, t]) => [Number(h), t] as const);
export const LADDER_LIST = Object.entries(LADDERS).map(([f, t]) => [Number(f), t] as const);

export interface TokenSpot {
  playerId: string;
  at: Pt;
  dx: number;
  dy: number;
  /** size: smaller when sharing a square or waiting */
  k: number;
}

/** where every token stands; tokens sharing a square spread a little */
export function tokenSpots(seats: SnakesSeat[], cornerOf: (id: string) => string): TokenSpot[] {
  const groups = new Map<string, SnakesSeat[]>();
  for (const s of seats) {
    const key = s.pos > 0 ? `s${s.pos}` : `w${cornerOf(s.playerId)}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const out: TokenSpot[] = [];
  for (const list of groups.values()) {
    const n = list.length;
    list.forEach((s, i) => {
      const at = centreOf(s.pos, cornerOf(s.playerId));
      const [dx, dy] = n === 1 ? [0, 0] : n === 2 ? [(i ? 0.2 : -0.2), 0] : [(i % 2 ? 0.2 : -0.2), (i < 2 ? -0.16 : 0.16)];
      out.push({ playerId: s.playerId, at, dx, dy, k: n > 1 ? 0.78 : s.pos === 0 ? 0.85 : 1 });
    });
  }
  return out;
}

/** squares walked one by one for a roll: up to 100, back down after a bounce */
export function walkOf(from: number, roll: number, landed: number, bounced: boolean, enterOnly: boolean): number[] {
  if (enterOnly) return [1];
  const steps: number[] = [];
  if (bounced) {
    for (let p = from + 1; p <= 100; p++) steps.push(p);
    for (let p = 99; p >= landed; p--) steps.push(p);
  } else for (let p = from + 1; p <= Math.min(100, from + roll); p++) steps.push(p);
  return steps.length ? steps : [landed];
}
