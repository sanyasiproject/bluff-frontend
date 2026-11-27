// Board geometry: turns the 15x15 board so my colour sits at the near-left corner
import { LUDO_BASE, LUDO_BASE_CELLS, LUDO_COLORS, LUDO_HOME, ludoCellOf, type LudoColor, type LudoSeat } from '../../types';

/** quarter turns clockwise that bring each colour's base to the near-left (bottom-left) corner */
const TURNS: Record<LudoColor, number> = { red: 3, green: 2, yellow: 1, blue: 0 };

export type Pt = [number, number];

/** the board svg's margin round the 15x15 squares, and the squares it shows across */
export const BOARD_PAD = 0.25;
export const BOARD_SPAN = 15 + BOARD_PAD * 2;

/** rotates a point of the 15x15 board (continuous coords) by quarter turns clockwise round its centre */
export function turnPt([x, y]: Pt, turns: number): Pt {
  let p: Pt = [x, y];
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) p = [15 - p[1], p[0]];
  return p;
}

export const turnsFor = (mine: LudoColor | null | undefined): number => (mine ? TURNS[mine] : 0);

/** a cell ([col, row], its top-left) to its centre on the turned board */
export const cellCentre = (cell: Pt, turns: number): Pt => turnPt([cell[0] + 0.5, cell[1] + 0.5], turns);

/** which screen corner a colour's base lands on: 'tl' | 'tr' | 'br' | 'bl' */
export function cornerOf(c: LudoColor, turns: number): 'tl' | 'tr' | 'br' | 'bl' {
  const spots = LUDO_BASE_CELLS[c];
  const mid: Pt = [spots.reduce((s, p) => s + p[0], 0) / spots.length, spots.reduce((s, p) => s + p[1], 0) / spots.length];
  const [x, y] = turnPt(mid, turns);
  return `${y < 7.5 ? 't' : 'b'}${x < 7.5 ? 'l' : 'r'}` as 'tl' | 'tr' | 'br' | 'bl';
}

/** home: the middle of each colour's triangle (drawn, so not the shared cell numbers) */
const HOME_AT: Record<LudoColor, Pt> = { red: [6.55, 7.5], green: [7.5, 6.55], yellow: [8.45, 7.5], blue: [7.5, 8.45] };

/** a goti's centre on the turned board; base spots sit evenly in their yard (the shared numbers read as cells here) */
export function spotOf(c: LudoColor, progress: number, token: number, turns: number): Pt {
  if (progress <= LUDO_BASE) {
    const [x, y] = LUDO_BASE_CELLS[c][token % 4];
    return turnPt([x + 0.5, y + 0.5], turns);
  }
  if (progress >= LUDO_HOME) return turnPt(HOME_AT[c], turns);
  return cellCentre(ludoCellOf(c, progress) as Pt, turns);
}

/** the centre of a colour's yard (its 6x6 corner) */
export const yardOf = (c: LudoColor): Pt => {
  const [x, y] = LUDO_BASE_CELLS[c][0];
  return [x + 1.5, y + 1.5];
};

export interface GotiSpot {
  key: string;
  seat: LudoSeat;
  color: LudoColor;
  token: number;
  progress: number;
  /** centre on the turned board, in cells */
  at: Pt;
  /** gotis sharing a square: shrink and fan out */
  k: number;
  dx: number;
  dy: number;
}

/** where every goti stands; several on one square shrink and fan out */
export function gotiSpots(seats: LudoSeat[], turns: number): GotiSpot[] {
  const out: GotiSpot[] = [];
  for (const seat of seats) {
    seat.tokens.forEach((progress, token) => {
      out.push({ key: `${seat.color}-${token}`, seat, color: seat.color, token, progress, at: spotOf(seat.color, progress, token, turns), k: 1, dx: 0, dy: 0 });
    });
  }
  // group by square (base spots are each their own); home gotis share their colour's triangle
  const groups = new Map<string, GotiSpot[]>();
  for (const g of out) {
    if (g.progress <= LUDO_BASE) continue;
    const id = g.progress >= LUDO_HOME ? `home-${g.color}` : `${g.at[0].toFixed(2)},${g.at[1].toFixed(2)}`;
    groups.set(id, [...(groups.get(id) ?? []), g]);
  }
  for (const list of groups.values()) {
    const n = Math.min(list.length, 4);
    if (list[0].progress >= LUDO_HOME) {
      list.forEach((g, i) => placeHome(g, n, i % 4, turns));
      continue;
    }
    if (n < 2) continue;
    list.forEach((g, i) => {
      const [dx, dy] = SHARE[n][i % 4];
      g.k = SHARE_K[n];
      g.dx = dx;
      g.dy = dy;
    });
  }
  return out;
}

/** several gotis on one square: a small cluster that stays inside it */
const SHARE: Record<number, Pt[]> = {
  2: [[-0.19, 0], [0.19, 0]],
  3: [[-0.2, -0.16], [0.2, -0.16], [0, 0.2]],
  4: [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]],
};
const SHARE_K: Record<number, number> = { 2: 0.66, 3: 0.56, 4: 0.52 };

/** the outer edge's middle of each home triangle (its apex is the board centre) */
const HOME_BASE: Record<LudoColor, Pt> = { red: [6, 7.5], green: [7.5, 6], yellow: [9, 7.5], blue: [7.5, 9] };
/** home gotis in a triangle: [along the edge, in from the edge] in squares, by how many are home */
const HOME_FAN: Record<number, Pt[]> = {
  1: [[0, 0.55]],
  2: [[-0.32, 0.5], [0.32, 0.5]],
  3: [[-0.42, 0.34], [0.42, 0.34], [0, 0.86]],
  4: [[-0.55, 0.3], [0.55, 0.3], [-0.2, 0.82], [0.2, 0.82]],
};
const HOME_K: Record<number, number> = { 1: 0.85, 2: 0.7, 3: 0.6, 4: 0.56 };

/** the i-th of n home gotis: its centre inside its colour's triangle and its size */
export function homeSlot(c: LudoColor, n: number, i: number, turns: number): { at: Pt; k: number } {
  const m = Math.max(1, Math.min(n, 4));
  const [bx, by] = HOME_BASE[c];
  const inX = (7.5 - bx) / 1.5;
  const inY = (7.5 - by) / 1.5;
  const [u, v] = HOME_FAN[m][Math.min(i, m - 1)];
  return { at: turnPt([bx + inX * v - inY * u, by + inY * v + inX * u], turns), k: HOME_K[m] };
}

/** a home goti neatly inside its colour's triangle, fanned when several are home */
function placeHome(g: GotiSpot, n: number, i: number, turns: number) {
  const { at, k } = homeSlot(g.color, n, i, turns);
  g.k = k;
  g.dx = at[0] - g.at[0];
  g.dy = at[1] - g.at[1];
}

/** turn order colours, for picking the corner each seat sits at */
export const colorOrder = (c: LudoColor) => LUDO_COLORS.indexOf(c);
