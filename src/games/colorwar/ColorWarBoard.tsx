// The Colour Wars board: rounded cells with glossy dot blobs in the owner's colour, blobs flying out of bursting cells
import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { COLORWAR_BURST, type ColorWarCell } from '../../types';

interface Props {
  size: number;
  cells: ColorWarCell[];
  /** blobs in flight: from → to */
  fly: [number, number][];
  /** the tapper's colour, for blobs in flight */
  flyColor: string;
  /** bumps for each animation step, so flips and flights restart */
  step: number;
  /** cells that just changed colour */
  flipped: Set<number>;
  /** the tapped cell, for a pop */
  tapped: number | null;
  colorOf: (id: string) => string;
  /** cells I may tap now */
  legal: Set<number>;
  onTap: (cell: number) => void;
}

/** blob spots inside a cell for 1, 2 and 3 dots (share of the cell) */
const SPOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[33, 50], [67, 50]],
  3: [[32, 62], [68, 62], [50, 30]],
};

export function ColorWarBoard({ size, cells, fly, flyColor, step, flipped, tapped, colorOf, legal, onTap }: Props) {
  const pos = (i: number) => ({ left: `${((i % size) / size) * 100}%`, top: `${(Math.floor(i / size) / size) * 100}%` });
  return (
    <div className="cw-grid" style={{ ['--cw-n' as string]: size } as CSSProperties}>
      {cells.map((c, i) => {
        const col = c.owner ? colorOf(c.owner) : undefined;
        const dots = Math.min(c.dots, COLORWAR_BURST - 1);
        const can = legal.has(i);
        return (
          <button
            key={`${i}-${flipped.has(i) || tapped === i ? step : 0}`}
            className={cx('cw-cell', c.owner && 'owned', can && 'live', dots === COLORWAR_BURST - 1 && 'ready', flipped.has(i) && 'flip', tapped === i && 'tap')}
            style={{ ...pos(i), ['--c' as string]: col ?? 'transparent' } as CSSProperties}
            disabled={!can}
            aria-label={c.owner ? `${c.dots} dots` : 'Empty cell'}
            onClick={() => onTap(i)}
          >
            {c.owner &&
              (SPOTS[dots] ?? []).map(([x, y], k) => (
                <i key={k} className="cw-blob" style={{ left: `${x}%`, top: `${y}%` }} />
              ))}
          </button>
        );
      })}
      {fly.map(([from, to], k) => {
        const dx = (to % size) - (from % size);
        const dy = Math.floor(to / size) - Math.floor(from / size);
        return (
          <span key={`f${step}-${k}`} className="cw-fly" style={{ ...pos(from), ['--dx' as string]: `${dx * 100}%`, ['--dy' as string]: `${dy * 100}%`, ['--c' as string]: flyColor } as CSSProperties}>
            <i className="cw-blob" />
          </span>
        );
      })}
      {fly.length > 0 &&
        [...new Set(fly.map(([f]) => f))].map((f) => <span key={`x${step}-${f}`} className="cw-boom" style={pos(f)} aria-hidden />)}
    </div>
  );
}
