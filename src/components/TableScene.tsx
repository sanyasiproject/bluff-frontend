import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../lib/cards';

/** layers under the rail that give the table edge its thickness */
// three layers, spaced wider, give the same edge as six for half the phone's work
const RIM_LAYERS = [1, 2, 3];

/**
 * the 3D card table behind a landscape game: one tilted plane holding the felt, the rail and whatever lies on the table
 * (seats stand up at the far rail, cards lie on the felt); shown by CSS only in landscape
 */
export function TableScene({ ranked, children }: { ranked?: boolean; children?: ReactNode }) {
  return (
    <div className="scene">
      <div className="scene-room" aria-hidden />
      <div className="world">
        <div className="plane">
          <div className="plane-shadow" aria-hidden />
          {RIM_LAYERS.map((i) => (
            <div key={i} className={cx('rim-edge', ranked && 'ranked')} style={{ ['--z' as string]: i } as CSSProperties} aria-hidden />
          ))}
          <div className={cx('rail', ranked && 'ranked')} aria-hidden>
            <div className="felt">
              <div className="felt-line" />
              <div className="felt-lamp" />
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** a spot on the table plane: x and y in % of the table; stand makes it face you (seats, signs), else it lies on the felt */
export function OnTable({ x, y, stand, className, children, z = 2 }: { x: number; y: number; stand?: boolean; className?: string; children: ReactNode; z?: number }) {
  return (
    <div className={cx('on-table', stand && 'stand', className)} style={{ left: `${x}%`, top: `${y}%`, ['--lift' as string]: `${z}px` } as CSSProperties}>
      {children}
    </div>
  );
}

/**
 * where each opponent sits round the far half of the table, left to right in play order:
 * seat (x, y) on the rail and the spot in front of them on the felt for their cards
 */
export function seatSpots(n: number) {
  return Array.from({ length: n }, (_, i) => {
    // spread over the far arc, kept off the near corners where the hand is
    const a = Math.PI + ((i + 0.5) / n) * Math.PI;
    const squeeze = n === 1 ? 1 : 0.8;
    const t = (3 * Math.PI) / 2 + (a - (3 * Math.PI) / 2) * squeeze;
    const seat = { x: 50 + 47 * Math.cos(t), y: 50 + 47 * Math.sin(t) };
    const cards = { x: 50 + 34 * Math.cos(t), y: 52 + 32 * Math.sin(t), turn: (t * 180) / Math.PI + 90 };
    return { seat, cards };
  });
}
