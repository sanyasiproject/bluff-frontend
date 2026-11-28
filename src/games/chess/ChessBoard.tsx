// The chess board: squares in the chosen theme, coordinates, pieces that glide, tap–tap and drag moves, premoves and marks
import '../../styles/land-chess-board.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactElement, type Ref } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { Arrows, Blast, ConfirmBar, PromotionPicker, type Arrow } from './BoardLayers';
import { kingSquare, placePieces, screenOf, squareAtPoint, type Placed } from './geometry';
import { Position, type Color, type Move, type Role, type Square } from './lib';
import { boardThemeOf, type ChessLooks } from './looks';
import { PieceSvg } from './pieceArt';

interface Props {
  pos: Position;
  bottom: Color;
  lastMove?: Move | null;
  /** the colour I may move (my side while playing); null: nothing moves */
  mover?: Color | null;
  onMove?: (m: Move) => void;
  premove?: Move | null;
  onPremove?: (m: Move | null) => void;
  arrows?: Arrow[];
  looks: ChessLooks;
  /** a pocket piece picked for a crazyhouse drop */
  dropRole?: Role | null;
  onDropDone?: () => void;
  /** a move mark in analysis (?!, ??) on a square */
  glyph?: { sq: Square; text: string; color: string } | null;
  boardRef?: Ref<HTMLDivElement>;
  className?: string;
}

/** the opponent-to-move position as if it were my turn, for premove targets */
function premovePosition(pos: Position): Position | null {
  try {
    const parts = pos.fen().split(' ');
    parts[1] = parts[1] === 'w' ? 'b' : 'w';
    parts[3] = '-';
    return Position.fromFen(parts.join(' '), pos.variant);
  } catch {
    return null;
  }
}

/** target square → the moves landing there; a castle is also offered on the king's landing square */
function targetsOf(pos: Position, moves: Move[], from: Square): Map<Square, Move[]> {
  const out = new Map<Square, Move[]>();
  const board = pos.board();
  const add = (sq: Square, m: Move) => out.set(sq, [...(out.get(sq) ?? []), m]);
  for (const m of moves) {
    if (m.drop || m.from !== from) continue;
    add(m.to, m);
    const p = board[from];
    const t = board[m.to];
    if (p?.role === 'k' && t && t.color === p.color && t.role === 'r') add(Math.floor(from / 8) * 8 + (m.to > from ? 6 : 2), m);
  }
  return out;
}

export function ChessBoard({ pos, bottom, lastMove, mover = null, onMove, premove, onPremove, arrows = [], looks, dropRole, onDropDone, glyph, boardRef, className }: Props) {
  const [sel, setSel] = useState<Square | null>(null);
  const [drag, setDrag] = useState<{ sq: Square; x: number; y: number; size: number } | null>(null);
  const [promo, setPromo] = useState<Move[] | null>(null);
  const [pending, setPending] = useState<Move | null>(null);
  const [blast, setBlast] = useState<{ sq: Square; key: number } | null>(null);
  const el = useRef<HTMLDivElement | null>(null);
  const down = useRef<{ sq: Square; x: number; y: number; moved: boolean; wasSel: boolean } | null>(null);
  const board = useMemo(() => pos.board(), [pos]);
  const live = mover !== null && !!onMove;
  const premoving = live && mover !== pos.turn;
  const movePos = useMemo(() => (!live ? null : premoving ? premovePosition(pos) : pos), [pos, live, premoving]);
  const legal = useMemo(() => movePos?.legalMoves() ?? [], [movePos]);
  const targets = useMemo(() => (sel !== null && movePos ? targetsOf(movePos, legal, sel) : new Map<Square, Move[]>()), [sel, movePos, legal]);
  const dropTargets = useMemo(() => new Set(dropRole && !premoving ? legal.filter((m) => m.drop === dropRole).map((m) => m.to) : []), [dropRole, legal, premoving]);

  // stable piece ids so a move glides; atomic captures that clear several squares go boom
  const placed = useRef<Placed[]>([]);
  const pieces = useMemo(() => {
    const before = placed.current.length;
    placed.current = placePieces(placed.current, board, lastMove);
    if (pos.variant === 'atomic' && lastMove && before - placed.current.length >= 2) setTimeout(() => setBlast({ sq: lastMove.to, key: Date.now() }));
    return placed.current;
  }, [board]);
  useEffect(() => {
    if (!blast) return;
    const t = window.setTimeout(() => setBlast(null), 700);
    return () => window.clearTimeout(t);
  }, [blast]);

  // a new position clears what I had picked
  useEffect(() => {
    setSel(null);
    setPromo(null);
    setPending(null);
  }, [pos.fen()]);

  const checkSq = pos.inCheck() ? kingSquare(board, pos.turn) : null;
  const theme = boardThemeOf(looks.board);
  const own = (sq: Square) => board[sq]?.color === mover;

  const commit = (m: Move) => {
    setSel(null);
    setPromo(null);
    if (premoving) return onPremove?.(m);
    if (looks.confirm) return setPending(m);
    onMove?.(m);
  };
  const choose = (moves: Move[]) => (moves.length > 1 && moves.some((m) => m.promotion) ? setPromo(moves) : commit(moves[0]));

  const tap = (sq: Square) => {
    if (dropRole) {
      const m = legal.find((x) => x.drop === dropRole && x.to === sq);
      onDropDone?.();
      if (m) commit(m);
      return;
    }
    if (sel !== null && targets.has(sq)) return choose(targets.get(sq)!);
    if (own(sq) && sel !== sq) return setSel(sq);
    setSel(null);
    if (premove) onPremove?.(null);
  };

  const at = (e: { clientX: number; clientY: number }) => squareAtPoint(el.current, bottom, e.clientX, e.clientY);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!live || promo || pending) return;
    const sq = at(e);
    if (sq === null) return;
    down.current = { sq, x: e.clientX, y: e.clientY, moved: false, wasSel: sel === sq };
    // press on my own piece picks it at once so a drag shows its targets (a castle rook target stays a target)
    if (own(sq) && !dropRole && !(sel !== null && targets.has(sq))) {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (sel !== sq) setSel(sq);
    }
  };
  const onMoveP = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = down.current;
    if (!d || !own(d.sq) || dropRole) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    d.moved = true;
    const size = (el.current?.getBoundingClientRect().width ?? 320) / 8;
    setDrag({ sq: d.sq, x: e.clientX, y: e.clientY, size });
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const sq = at(e);
    if (d.moved) {
      setDrag(null);
      if (sq !== null && targets.has(sq)) choose(targets.get(sq)!);
      else setSel(null);
      return;
    }
    if (sq === null) return;
    if (d.wasSel && sq === d.sq) return setSel(null);
    if (sq === sel && sq === d.sq) return;
    tap(sq);
  };

  const shown = pending ? previewPieces(pos, pending) : null;
  const glide = !reducedMotion() && !drag;
  const style = { '--ch-light': theme.light, '--ch-dark': theme.dark } as CSSProperties;
  const square = (sq: Square, cls: string, key: string) => {
    const [x, y] = screenOf(sq, bottom);
    return <i key={key} className={cls} style={{ transform: `translate(${x * 100}%, ${y * 100}%)` } as CSSProperties} />;
  };
  const marks: ReactElement[] = [];
  if (pos.variant === 'kingOfTheHill') for (const sq of [27, 28, 35, 36]) marks.push(square(sq, 'ch-sq ch-hill', `h${sq}`));
  if (pos.variant === 'racingKings') for (let f = 0; f < 8; f++) marks.push(square(56 + f, 'ch-sq ch-goal', `g${f}`));
  if (lastMove) for (const sq of lastMove.drop ? [lastMove.to] : [lastMove.from, lastMove.to]) marks.push(square(sq, 'ch-sq ch-last', `l${sq}`));
  if (premove) for (const sq of [premove.from, premove.to]) marks.push(square(sq, 'ch-sq ch-pre', `p${sq}`));
  if (pending) for (const sq of [pending.from, pending.to]) marks.push(square(sq, 'ch-sq ch-pending', `c${sq}`));
  if (sel !== null) marks.push(square(sel, 'ch-sq ch-sel', 'sel'));
  if (checkSq !== null) marks.push(square(checkSq, 'ch-sq ch-check', 'chk'));
  for (const [sq] of targets) marks.push(square(sq, cx('ch-sq', board[sq] && !own(sq) ? 'ch-ring' : 'ch-dot', premoving && 'pre'), `t${sq}`));
  for (const sq of dropTargets) marks.push(square(sq, 'ch-sq ch-dot', `d${sq}`));

  return (
    <div
      ref={(n) => {
        el.current = n;
        if (typeof boardRef === 'function') boardRef(n);
        else if (boardRef) (boardRef as { current: HTMLDivElement | null }).current = n;
      }}
      className={cx('ch-board', `cb-${theme.id}`, live && 'live', bottom === 'b' && 'flipped', className)}
      style={style}
      onPointerDown={onDown}
      onPointerMove={onMoveP}
      onPointerUp={onUp}
      onPointerCancel={() => ((down.current = null), setDrag(null))}
    >
      {looks.coords && <Coords bottom={bottom} />}
      {marks}
      {(shown ?? pieces).map((p) => {
        const [x, y] = screenOf(p.sq, bottom);
        return (
          <span
            key={p.id}
            className={cx('ch-piece', glide && 'glide', drag?.sq === p.sq && 'lifted')}
            style={{ transform: `translate(${x * 100}%, ${y * 100}%)` } as CSSProperties}
          >
            <PieceSvg role={p.piece.role} color={p.piece.color} set={looks.set} />
          </span>
        );
      })}
      {glyph && (() => {
        const [x, y] = screenOf(glyph.sq, bottom);
        return <b className="ch-glyph" style={{ left: `${(x + 1) * 12.5}%`, top: `${y * 12.5}%`, background: glyph.color } as CSSProperties}>{glyph.text}</b>;
      })()}
      <Arrows arrows={arrows} bottom={bottom} />
      {blast && <Blast key={blast.key} sq={blast.sq} bottom={bottom} />}
      {promo && <PromotionPicker moves={promo} bottom={bottom} color={mover ?? 'w'} set={looks.set} onPick={commit} onCancel={() => (setPromo(null), setSel(null))} />}
      {pending && <ConfirmBar onYes={() => (onMove?.(pending), setPending(null))} onNo={() => setPending(null)} />}
      {drag && board[drag.sq] && (
        <span className="ch-ghost" style={{ width: drag.size * 1.15, height: drag.size * 1.15, left: drag.x, top: drag.y } as CSSProperties}>
          <PieceSvg role={board[drag.sq]!.role} color={board[drag.sq]!.color} set={looks.set} />
        </span>
      )}
    </div>
  );
}

/** the board with a waiting (unconfirmed) move played */
const previewPieces = (pos: Position, m: Move): Placed[] =>
  pos
    .play(m)
    .board()
    .flatMap((piece, sq) => (piece ? [{ id: -1 - sq, sq, piece }] : []));

function Coords({ bottom }: { bottom: Color }) {
  const files = bottom === 'w' ? 'abcdefgh' : 'hgfedcba';
  const ranks = bottom === 'w' ? '87654321' : '12345678';
  return (
    <>
      {[...files].map((f, i) => (
        <b key={f} className={cx('ch-coord file', i % 2 ? 'on-light' : 'on-dark')} style={{ left: `${i * 12.5}%` }}>
          {f}
        </b>
      ))}
      {[...ranks].map((r, i) => (
        <b key={r} className={cx('ch-coord rank', i % 2 ? 'on-dark' : 'on-light')} style={{ top: `${i * 12.5}%` }}>
          {r}
        </b>
      ))}
    </>
  );
}
