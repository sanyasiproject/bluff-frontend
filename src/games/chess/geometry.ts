// Board maths: squares on screen for each side, the square under a finger, and stable piece ids so moves glide
import type { Color, Move, Piece, Position, Role, Square } from './lib';

/** column and row on screen (0..7 from top-left) of a square, seen from `bottom`'s side */
export function screenOf(sq: Square, bottom: Color): [number, number] {
  const f = sq % 8;
  const r = Math.floor(sq / 8);
  return bottom === 'w' ? [f, 7 - r] : [7 - f, r];
}

export function squareOfScreen(x: number, y: number, bottom: Color): Square {
  return bottom === 'w' ? (7 - y) * 8 + x : y * 8 + (7 - x);
}

/** the square under a point, or null off the board */
export function squareAtPoint(el: Element | null, bottom: Color, cx: number, cy: number): Square | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const x = Math.floor(((cx - r.left) / r.width) * 8);
  const y = Math.floor(((cy - r.top) / r.height) * 8);
  if (x < 0 || x > 7 || y < 0 || y > 7) return null;
  return squareOfScreen(x, y, bottom);
}

export interface Placed { id: number; sq: Square; piece: Piece }
let nextId = 1;
const same = (a: Piece, b: Piece) => a.color === b.color && a.role === b.role;
const dist = (a: Square, b: Square) => Math.abs((a % 8) - (b % 8)) + Math.abs(Math.floor(a / 8) - Math.floor(b / 8));

/** keeps ids for pieces that stayed, then pairs moved pieces with the nearest old one of the same kind (a promoted pawn keeps its id) */
export function placePieces(prev: Placed[], board: (Piece | null)[], last?: Move | null): Placed[] {
  const out: Placed[] = [];
  const left = prev.filter((p) => board[p.sq] && same(board[p.sq]!, p.piece) ? (out.push({ ...p, piece: board[p.sq]! }), false) : true);
  const fresh: { sq: Square; piece: Piece }[] = [];
  board.forEach((piece, sq) => {
    if (piece && !out.some((o) => o.sq === sq)) fresh.push({ sq, piece });
  });
  for (const f of fresh) {
    let best = -1;
    let bestD = 99;
    left.forEach((p, i) => {
      const promo = last && last.promotion && last.to === f.sq && p.sq === last.from && p.piece.color === f.piece.color;
      const d = promo ? -1 : same(p.piece, f.piece) ? dist(p.sq, f.sq) : 99;
      if (d < bestD) (bestD = d), (best = i);
    });
    if (best >= 0 && bestD < 99) {
      out.push({ id: left[best].id, sq: f.sq, piece: f.piece });
      left.splice(best, 1);
    } else out.push({ id: nextId++, sq: f.sq, piece: f.piece });
  }
  return out;
}

/** the king of `color`, if it has one */
export const kingSquare = (board: (Piece | null)[], color: Color): Square | null => {
  const i = board.findIndex((p) => p?.color === color && p.role === 'k');
  return i < 0 ? null : i;
};

/** material lead per side (Lichess-style: the pieces one side has more of, and the points ahead) */
const VALUE: Record<Role, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export function materialDiff(pos: Position): { w: { roles: Role[]; plus: number }; b: { roles: Role[]; plus: number } } {
  const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } };
  for (const p of pos.board()) if (p) count[p.color][p.role]++;
  const pk = pos.pockets();
  if (pk) for (const c of ['w', 'b'] as const) for (const [r, n] of Object.entries(pk[c])) count[c][r as Role] += n ?? 0;
  const roles: Record<Color, Role[]> = { w: [], b: [] };
  let score = 0;
  for (const r of ['q', 'r', 'b', 'n', 'p'] as Role[]) {
    const d = count.w[r] - count.b[r];
    score += d * VALUE[r];
    // what white has captured shows by white's card: black pieces missing beyond white's own losses
    for (let i = 0; i < Math.max(0, d); i++) roles.w.push(r);
    for (let i = 0; i < Math.max(0, -d); i++) roles.b.push(r);
  }
  return { w: { roles: roles.w, plus: Math.max(0, score) }, b: { roles: roles.b, plus: Math.max(0, -score) } };
}
