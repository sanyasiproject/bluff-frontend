// One player's sea as an SVG in cell units: waves, the A-J / 1-10 grid, ships we may see, misses, hits, sunk ships, radar counts, aim overlay and shot effects
import type { ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { SEA_COLS, SEA_SIZE, type SeaBoardView, type SeaShip, type SeaShotView } from '../../types';
import { Ship } from './Ship';

const M = 0.75;
export const SEA_VIEWBOX = `${-M} ${-M} ${SEA_SIZE + M + 0.1} ${SEA_SIZE + M + 0.1}`;

interface Props {
  board: SeaBoardView;
  /** my own ships during placement (drawn instead of the board's) */
  ships?: SeaShip[];
  /** radar scans: the 3 × 3's top-left and the count */
  radars?: { x: number; y: number; count: number }[];
  /** the last shot when it hit this sea (effects) */
  fx?: SeaShotView | null;
  small?: boolean;
  labels?: boolean;
  live?: boolean;
  className?: string;
  onCell?: (x: number, y: number) => void;
  onHover?: (cell: [number, number] | null) => void;
  overlay?: ReactNode;
}

export function SeaGrid({ board, ships, radars = [], fx, small, labels = !small, live, className, onCell, onHover, overlay }: Props) {
  const cells: ReactNode[] = [];
  for (let i = 0; i < SEA_SIZE * SEA_SIZE; i++) {
    const s = board.shots[i];
    if (!s) continue;
    const x = i % SEA_SIZE;
    const y = Math.floor(i / SEA_SIZE);
    if (s === 1) cells.push(<circle key={i} cx={x + 0.5} cy={y + 0.5} r="0.17" className="sb-miss" />);
    else
      cells.push(
        <g key={i} transform={`translate(${x + 0.5} ${y + 0.5})`} className={cx('sb-hit', s === 3 && 'sunk')}>
          <circle r="0.36" className="sb-fireglow" />
          <path d="M-0.16 0.22Q-0.26 -0.06 -0.06 -0.3Q-0.06 -0.06 0.06 0Q0.12 -0.16 0.04 -0.3Q0.3 -0.06 0.14 0.22Z" className="sb-flame" />
          {!small && s === 2 && <circle cx="0.12" cy="-0.42" r="0.13" className="sb-smoke" />}
        </g>,
      );
  }
  const shown = ships ?? board.ships;
  const pick = (e: React.PointerEvent<SVGRectElement>): [number, number] | null => {
    const m = e.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    return x >= 0 && y >= 0 && x < SEA_SIZE && y < SEA_SIZE ? [x, y] : null;
  };
  return (
    <svg className={cx('sb-sea', small && 'small', live && 'live', className)} viewBox={SEA_VIEWBOX} role="img" aria-label="Sea">
      <rect x="0" y="0" width={SEA_SIZE} height={SEA_SIZE} rx="0.2" className="sb-water" />
      {!small && (
        <g className="sb-waves" aria-hidden clipPath="url(#sb-clip)">
          <clipPath id="sb-clip">
            <rect x="0" y="0" width={SEA_SIZE} height={SEA_SIZE} />
          </clipPath>
          {[1.2, 3.4, 5.6, 7.8, 9.4].map((y) => (
            <path key={y} d={`M0 ${y}${Array.from({ length: 10 }, () => 'q0.5 -0.22 1 0').join('')}`} />
          ))}
        </g>
      )}
      <g className="sb-lines" aria-hidden>
        {Array.from({ length: SEA_SIZE + 1 }, (_, i) => (
          <path key={i} d={`M0 ${i}H${SEA_SIZE}M${i} 0V${SEA_SIZE}`} />
        ))}
      </g>
      {labels && (
        <g className="sb-labels" aria-hidden>
          {Array.from({ length: SEA_SIZE }, (_, i) => (
            <g key={i}>
              <text x={i + 0.5} y={-0.22} textAnchor="middle">
                {SEA_COLS[i]}
              </text>
              <text x={-0.2} y={i + 0.68} textAnchor="end">
                {i + 1}
              </text>
            </g>
          ))}
        </g>
      )}
      {shown.map((s, i) => (
        <Ship key={`${s.x}-${s.y}-${s.len}-${i}`} ship={s} sunk={'sunk' in s && (s as { sunk: boolean }).sunk} className={fx?.cells.some((c) => c.sunk) && 'sunk' in s && (s as { sunk: boolean }).sunk ? 'sinking' : undefined} />
      ))}
      {cells}
      {radars.map((r, i) => (
        <g key={`r${i}`} className="sb-radar">
          <rect x={r.x} y={r.y} width={Math.min(3, SEA_SIZE - r.x)} height={Math.min(3, SEA_SIZE - r.y)} rx="0.15" />
          <text x={r.x + Math.min(3, SEA_SIZE - r.x) / 2} y={r.y + Math.min(3, SEA_SIZE - r.y) / 2 + 0.34}>
            {r.count}
          </text>
        </g>
      ))}
      {fx &&
        fx.cells.map((c, i) => (
          <g key={`${fx.seq}-${i}`} transform={`translate(${c.x + 0.5} ${c.y + 0.5})`} className={cx('sb-fx', c.hit ? 'boom' : 'splash')} style={{ animationDelay: `${i * 120}ms` }}>
            {c.hit ? <circle r="0.5" className="sb-flash" /> : <circle r="0.35" className="sb-ring" />}
          </g>
        ))}
      {overlay}
      {onCell && (
        <rect
          x="0"
          y="0"
          width={SEA_SIZE}
          height={SEA_SIZE}
          fill="transparent"
          className="sb-hit-area"
          onPointerUp={(e) => {
            const c = pick(e);
            if (c) onCell(c[0], c[1]);
          }}
          onPointerMove={onHover ? (e) => onHover(pick(e)) : undefined}
          onPointerLeave={onHover ? () => onHover(null) : undefined}
        />
      )}
    </svg>
  );
}
