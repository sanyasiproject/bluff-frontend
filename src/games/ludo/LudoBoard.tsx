// The Ludo board, drawn once as SVG on the 15x15 grid and turned so my colour sits near-left
import { memo } from 'react';
import { LUDO_COLORS, LUDO_LANE_CELLS, LUDO_RING_CELLS, LUDO_SAFE_RING, type LudoColor } from '../../types';
import { BOARD_PAD, BOARD_SPAN, yardOf } from './geometry';

/** a 5-point star centred in a cell */
function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(3)},${(cy + rr * Math.sin(a)).toFixed(3)}`);
  }
  return pts.join(' ');
}

/** the start square of each colour, where its arrow points in */
const START_OF = (i: number): LudoColor | null => (i % 13 === 0 ? LUDO_COLORS[i / 13] : null);

const TRIANGLES: Record<LudoColor, string> = {
  red: '6,6 6,9 7.5,7.5',
  green: '6,6 9,6 7.5,7.5',
  yellow: '9,6 9,9 7.5,7.5',
  blue: '6,9 9,9 7.5,7.5',
};

/** the static board; turns: quarter turns clockwise; colours in play get their yards lit */
export const LudoBoard = memo(function LudoBoard({ turns, inPlay }: { turns: number; inPlay: LudoColor[] }) {
  return (
    <svg className="lu-svg" viewBox={`${-BOARD_PAD} ${-BOARD_PAD} ${BOARD_SPAN} ${BOARD_SPAN}`} aria-hidden>
      <defs>
        <radialGradient id="lu-sheen" cx="50%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Raat board: a night-sky square with a few soft stars */}
        <pattern id="lu-stars" width="1" height="1" patternUnits="userSpaceOnUse">
          <rect width="1" height="1" fill="#13204a" />
          <circle cx="0.22" cy="0.3" r="0.035" fill="#dfe9ff" opacity="0.75" />
          <circle cx="0.7" cy="0.18" r="0.022" fill="#fff" opacity="0.6" />
          <circle cx="0.55" cy="0.72" r="0.03" fill="#cfe0ff" opacity="0.55" />
          <circle cx="0.86" cy="0.62" r="0.018" fill="#fff" opacity="0.5" />
          <circle cx="0.12" cy="0.82" r="0.02" fill="#fff4c2" opacity="0.6" />
        </pattern>
      </defs>
      <g transform={`rotate(${turns * 90} 7.5 7.5)`}>
        <rect className="lu-bg" x="0" y="0" width="15" height="15" rx="0.3" />
        {/* the four yards */}
        {LUDO_COLORS.map((c) => {
          const [x, y] = yardOf(c);
          return (
            <g key={c} className={`lu-yard lu-${c}${inPlay.includes(c) ? '' : ' off'}`}>
              <rect className="lu-yard-out" x={x - 3} y={y - 3} width="6" height="6" rx="0.25" />
              <rect className="lu-yard-in" x={x - 2.15} y={y - 2.15} width="4.3" height="4.3" rx="0.55" />
              {[
                [-1, -1],
                [1, -1],
                [-1, 1],
                [1, 1],
              ].map(([dx, dy]) => (
                <circle key={`${dx}${dy}`} className="lu-spot" cx={x + dx} cy={y + dy} r="0.62" />
              ))}
            </g>
          );
        })}
        {/* the shared ring: start squares in colour, stars on the safe squares */}
        {LUDO_RING_CELLS.map(([cx, cy], i) => {
          const start = START_OF(i);
          return <rect key={`r${i}`} className={start ? `lu-sq lu-fill-${start}` : 'lu-sq'} x={cx} y={cy} width="1" height="1" />;
        })}
        {LUDO_COLORS.map((c) =>
          LUDO_LANE_CELLS[c].map(([cx, cy], i) => <rect key={`${c}${i}`} className={`lu-sq lu-fill-${c} lu-lane`} x={cx} y={cy} width="1" height="1" />),
        )}
        {LUDO_SAFE_RING.map((ring) => {
          const [cx, cy] = LUDO_RING_CELLS[ring];
          const start = START_OF(ring);
          return <polygon key={`s${ring}`} className={start ? 'lu-star lu-star-start' : 'lu-star'} points={star(cx + 0.5, cy + 0.5, 0.36)} />;
        })}
        {/* home: four triangles meeting in the middle */}
        {LUDO_COLORS.map((c) => (
          <polygon key={`h${c}`} className={`lu-home lu-fill-${c}`} points={TRIANGLES[c]} />
        ))}
        <rect x="6" y="6" width="3" height="3" fill="url(#lu-sheen)" />
        <rect className="lu-sheen" x="0" y="0" width="15" height="15" fill="url(#lu-sheen)" />
      </g>
    </svg>
  );
});
