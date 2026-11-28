// Crazyhouse pockets: captured pieces waiting to be dropped; tap one then a square, or drag it onto the board
import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import type { Color, Role } from './lib';
import { PieceSvg, type PieceSet } from './pieceArt';

const ROLES: Role[] = ['p', 'n', 'b', 'r', 'q'];

interface Props {
  color: Color;
  counts: Partial<Record<string, number>>;
  set: PieceSet;
  /** my pocket on my turn (or premove time) */
  live: boolean;
  picked: Role | null;
  onPick: (r: Role | null) => void;
  /** a drag let go over the screen at (x, y) */
  onDrop: (r: Role, x: number, y: number) => void;
}

export function Pocket({ color, counts, set, live, picked, onPick, onDrop }: Props) {
  const [drag, setDrag] = useState<{ role: Role; x: number; y: number; moved: boolean; sx: number; sy: number } | null>(null);
  const down = (r: Role) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!live || !(counts[r] ?? 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ role: r, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const up = (r: Role) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag;
    setDrag(null);
    if (!d) return;
    if (d.moved) {
      onPick(null);
      onDrop(r, e.clientX, e.clientY);
    } else onPick(picked === r ? null : r);
  };
  return (
    <div className={cx('ch-pocket', live && 'live')} aria-label={color === 'w' ? "White's pocket" : "Black's pocket"}>
      {ROLES.map((r) => {
        const n = counts[r] ?? 0;
        return (
          <button
            key={r}
            type="button"
            className={cx('ch-pk', !n && 'none', picked === r && 'on')}
            disabled={!n}
            aria-label={`${n} ${r}`}
            onPointerDown={down(r)}
            onPointerMove={move}
            onPointerUp={up(r)}
            onPointerCancel={() => setDrag(null)}
          >
            <PieceSvg role={r} color={color} set={set} />
            {n > 0 && <b>{n}</b>}
          </button>
        );
      })}
      {drag?.moved && (
        <span className="ch-ghost ch-pk-ghost" style={{ left: drag.x, top: drag.y } as CSSProperties}>
          <PieceSvg role={drag.role} color={color} set={set} />
        </span>
      )}
    </div>
  );
}
