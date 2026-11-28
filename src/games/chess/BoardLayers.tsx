// What lies on top of the squares: arrows, the promotion picker, the confirm bar and atomic blasts
import { useId, type CSSProperties } from 'react';
import { PieceSvg, type PieceSet } from './pieceArt';
import { screenOf } from './geometry';
import type { Color, Move, Role, Square } from './lib';

export interface Arrow { from: Square; to: Square; color: string; width?: number; opacity?: number }

const centre = (sq: Square, bottom: Color) => {
  const [x, y] = screenOf(sq, bottom);
  return [x + 0.5, y + 0.5];
};

/** arrows between square centres (best move, engine lines, the better move in analysis) */
export function Arrows({ arrows, bottom }: { arrows: Arrow[]; bottom: Color }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!arrows.length) return null;
  return (
    <svg className="ch-arrows" viewBox="0 0 8 8" aria-hidden>
      <defs>
        {arrows.map((a, i) => (
          <marker key={i} id={`${uid}-h${i}`} markerWidth="4" markerHeight="4" refX="2.05" refY="2" orient="auto" markerUnits="strokeWidth">
            <path d="M0.2 0.2L3.8 2L0.2 3.8Z" fill={a.color} />
          </marker>
        ))}
      </defs>
      {arrows.map((a, i) => {
        if (a.from === a.to) {
          const [x, y] = centre(a.to, bottom);
          return <circle key={i} cx={x} cy={y} r="0.42" fill="none" stroke={a.color} strokeWidth="0.08" opacity={a.opacity ?? 0.85} />;
        }
        const [x1, y1] = centre(a.from, bottom);
        const [x2, y2] = centre(a.to, bottom);
        const w = a.width ?? 0.16;
        // stop short so the head ends inside the target square
        const len = Math.hypot(x2 - x1, y2 - y1);
        const k = (len - w * 2.2) / len;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x1 + (x2 - x1) * k}
            y2={y1 + (y2 - y1) * k}
            stroke={a.color}
            strokeWidth={w}
            strokeLinecap="round"
            opacity={a.opacity ?? 0.85}
            markerEnd={`url(#${uid}-h${i})`}
          />
        );
      })}
    </svg>
  );
}

const ORDER: Role[] = ['q', 'n', 'r', 'b', 'k'];

/** the pieces a pawn can become, stacked down from the promotion square (up for the far side) */
export function PromotionPicker({ moves, bottom, color, set, onPick, onCancel }: { moves: Move[]; bottom: Color; color: Color; set: PieceSet; onPick: (m: Move) => void; onCancel: () => void }) {
  const to = moves[0].to;
  const [x, y] = screenOf(to, bottom);
  const down = y === 0;
  const roles = ORDER.filter((r) => moves.some((m) => m.promotion === r));
  return (
    <div className="ch-promo-veil" onPointerDown={(e) => (e.stopPropagation(), onCancel())}>
      <div
        className="ch-promo"
        role="dialog"
        aria-label="Promote to"
        style={{ left: `${x * 12.5}%`, top: down ? 0 : undefined, bottom: down ? undefined : 0 } as CSSProperties}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {(down ? roles : [...roles].reverse()).map((r) => (
          <button key={r} type="button" className="ch-promo-btn" aria-label={`Promote to ${NAMES[r]}`} onClick={() => onPick(moves.find((m) => m.promotion === r)!)}>
            <PieceSvg role={r} color={color} set={set} />
          </button>
        ))}
      </div>
    </div>
  );
}

export const NAMES: Record<Role, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/** "confirm move" setting: the move waits for a tick */
export function ConfirmBar({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="ch-confirm" role="group" aria-label="Confirm the move" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="ch-confirm-no" aria-label="Cancel the move" onClick={onNo}>
        ✕
      </button>
      <button type="button" className="ch-confirm-yes" aria-label="Play the move" onClick={onYes}>
        ✓
      </button>
    </div>
  );
}

/** an atomic capture: a flash and ring over the 3×3 squares around it */
export function Blast({ sq, bottom }: { sq: Square; bottom: Color }) {
  const [x, y] = screenOf(sq, bottom);
  return (
    <div className="ch-blast" style={{ left: `${(x - 1) * 12.5}%`, top: `${(y - 1) * 12.5}%` } as CSSProperties} aria-hidden>
      <i className="ch-blast-flash" />
      <i className="ch-blast-ring" />
    </div>
  );
}
