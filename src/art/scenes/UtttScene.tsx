// Ultimate Tic-Tac-Toe: a framed chalk slate, a thick big grid over nine thin ones, marker X and O, two stamped boards and a glowing one
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type SceneProps } from './common';

const X = '#ff6b6b';
const O = '#4fc3f7';
const B = 40;
const CHALK = '#f4f4ea';
// small marks: [board, cell, mark]
const MARKS: [number, number, 'x' | 'o'][] = [
  [1, 0, 'o'], [1, 4, 'x'], [1, 8, 'o'], [2, 2, 'x'], [2, 6, 'o'], [3, 1, 'x'], [3, 3, 'o'],
  [5, 4, 'o'], [5, 2, 'x'], [6, 0, 'x'], [6, 4, 'o'], [7, 1, 'o'], [7, 7, 'x'], [8, 8, 'o'], [8, 0, 'x'],
];

function Mark({ x, y, s, m, w }: { x: number; y: number; s: number; m: 'x' | 'o'; w: number }) {
  return m === 'x' ? (
    <path d={`M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}`} stroke={X} strokeWidth={w} strokeLinecap="round" />
  ) : (
    <circle cx={x} cy={y} r={s} fill="none" stroke={O} strokeWidth={w} />
  );
}

export function UtttScene({ id, colors }: SceneProps) {
  const thin: ReactElement[] = [];
  for (let b = 0; b < 9; b++) {
    const bx = (b % 3) * B + 5;
    const by = Math.floor(b / 3) * B + 5;
    const c = (B - 10) / 3;
    thin.push(
      <path key={b} d={`M${bx + c} ${by}V${by + B - 10}M${bx + 2 * c} ${by}V${by + B - 10}M${bx} ${by + c}H${bx + B - 10}M${bx} ${by + 2 * c}H${bx + B - 10}`} />,
    );
  }
  const cellAt = (b: number, k: number) => {
    const c = (B - 10) / 3;
    return { x: (b % 3) * B + 5 + (k % 3 + 0.5) * c, y: Math.floor(b / 3) * B + 5 + (Math.floor(k / 3) + 0.5) * c };
  };
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('slate')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#35524b" />
          <stop offset="1" stopColor="#1c2e28" />
        </linearGradient>
        <linearGradient id={id('frame')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b07a45" />
          <stop offset="1" stopColor="#6b4220" />
        </linearGradient>
        <linearGradient id={id('pen')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a80" />
          <stop offset="1" stopColor="#c62828" />
        </linearGradient>
      </defs>
      <g transform="translate(92 18) rotate(-4 68 82)">
        <rect x="-10" y="-10" width={3 * B + 20} height={3 * B + 20} rx="10" fill="#16052e" opacity="0.4" transform="translate(6 10)" />
        <rect x="-10" y="-10" width={3 * B + 20} height={3 * B + 20} rx="10" fill={url(id('frame'))} />
        <rect x="-3" y="-3" width={3 * B + 6} height={3 * B + 6} rx="5" fill={url(id('slate'))} />
        <ellipse cx="40" cy="30" rx="50" ry="26" fill="#fff" opacity="0.05" />
        {/* the board they're sent to glows */}
        <rect x={B * 2 + 2} y={B + 2} width={B - 4} height={B - 4} rx="5" fill="#fff59d" opacity="0.18" stroke="#fff59d" strokeWidth="2" strokeDasharray="4 3" />
        <g stroke={CHALK} strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round">
          {thin}
        </g>
        <g stroke={CHALK} strokeWidth="4" strokeLinecap="round" opacity="0.95">
          <path d={`M${B} 2V${3 * B - 2}M${2 * B} 2V${3 * B - 2}M2 ${B}H${3 * B - 2}M2 ${2 * B}H${3 * B - 2}`} />
        </g>
        {MARKS.map(([b, k, m]) => {
          const p = cellAt(b, k);
          return <Mark key={`${b}-${k}`} x={p.x} y={p.y} s={3.4} m={m} w={2.2} />;
        })}
        {/* stamped boards: a big X top-left, a big O centre */}
        <g opacity="0.95">
          <Mark x={B / 2} y={B / 2} s={13} m="x" w={6} />
          <Mark x={B * 1.5} y={B * 1.5} s={14} m="o" w={5.5} />
        </g>
        <Spark x={B * 2.5} y={B * 1.5} r={5} fill="#fff59d" />
      </g>
      {/* a marker pen leaning on the frame */}
      <g transform="translate(246 128) rotate(-38)" filter={url(id('shadow'))}>
        <rect x="0" y="-6" width="56" height="12" rx="4" fill={url(id('pen'))} />
        <rect x="38" y="-7" width="20" height="14" rx="4" fill="#212121" />
        <path d="M0 -4L-10 -1.5V1.5L0 4Z" fill="#eceff1" />
        <path d="M-10 -1.5L-14 0L-10 1.5Z" fill={X} />
      </g>
      {/* score chips */}
      <g filter={url(id('shadow'))} fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="13" textAnchor="middle">
        <rect x="20" y="132" width="52" height="24" rx="12" fill={X} />
        <text x="46" y="145" dominantBaseline="central" fill="#fff">✕ 1</text>
        <rect x="20" y="162" width="52" height="24" rx="12" fill={O} />
        <text x="46" y="175" dominantBaseline="central" fill="#08303f">◯ 1</text>
      </g>
      <Spark x={44} y={44} r={8} />
      <Spark x={290} y={50} r={6} fill="#fff6c2" />
    </g>
  );
}
