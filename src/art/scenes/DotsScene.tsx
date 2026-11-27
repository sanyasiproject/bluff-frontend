// Dots and Boxes: a tilted sheet of dot paper, coloured lines, two closed boxes with initials and a pencil drawing the next line
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type SceneProps } from './common';

const N = 5;
const G = 34;
const RED = '#ff5252';
const BLUE = '#40c4ff';
// lines as [x1, y1, x2, y2] in dot units, with their colour
const LINES: [number, number, number, number, string][] = [
  [0, 0, 1, 0, RED], [0, 1, 1, 1, BLUE], [0, 0, 0, 1, BLUE], [1, 0, 1, 1, RED],
  [1, 0, 2, 0, BLUE], [2, 0, 2, 1, RED], [1, 1, 2, 1, RED],
  [3, 0, 4, 0, RED], [4, 0, 4, 1, BLUE], [2, 2, 3, 2, BLUE], [3, 1, 3, 2, RED],
  [0, 2, 0, 3, RED], [1, 2, 1, 3, BLUE], [0, 3, 1, 3, BLUE], [3, 3, 4, 3, RED], [4, 2, 4, 3, BLUE],
];
// closed boxes: col, row, colour, initial
const BOXES: [number, number, string, string][] = [
  [0, 0, RED, 'A'],
  [1, 0, BLUE, 'P'],
];

export function DotsScene({ id, colors }: SceneProps) {
  const dots: ReactElement[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) dots.push(<circle key={`${r}-${c}`} cx={c * G} cy={r * G} r="3.6" fill="#2b2f4a" />);
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('paper')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9ecf7" />
        </linearGradient>
        <pattern id={id('grid')} width="8.5" height="8.5" patternUnits="userSpaceOnUse">
          <path d="M8.5 0V8.5H0" fill="none" stroke="#9fb4e6" strokeOpacity="0.35" strokeWidth="0.6" />
        </pattern>
        <linearGradient id={id('pencil')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe082" />
          <stop offset="0.5" stopColor="#ffb300" />
          <stop offset="1" stopColor="#e08a00" />
        </linearGradient>
      </defs>
      {/* the sheet, lying a little turned */}
      <g transform="translate(70 34) rotate(-7) scale(0.9)">
        <rect x="-18" y="-14" width="172" height="172" rx="6" fill="#16052e" opacity="0.35" transform="translate(5 8)" />
        <rect x="-18" y="-14" width="172" height="172" rx="6" fill={url(id('paper'))} />
        <rect x="-18" y="-14" width="172" height="172" rx="6" fill={url(id('grid'))} />
        <path d="M-6 -14V158" stroke="#ff8a80" strokeOpacity="0.55" strokeWidth="1.2" />
        {BOXES.map(([c, r, col, ch]) => (
          <g key={`${c}${r}`}>
            <rect x={c * G + 3} y={r * G + 3} width={G - 6} height={G - 6} rx="4" fill={col} opacity="0.32" />
            <text x={c * G + G / 2} y={r * G + G / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="900" fill={col} fontFamily="system-ui, sans-serif">
              {ch}
            </text>
          </g>
        ))}
        {LINES.map(([x1, y1, x2, y2, col], i) => (
          <path key={i} d={`M${x1 * G} ${y1 * G}L${x2 * G} ${y2 * G}`} stroke={col} strokeWidth="4.2" strokeLinecap="round" />
        ))}
        {/* the line being drawn now, half done */}
        <path d={`M${2 * G} ${2 * G}L${2 * G} ${2.62 * G}`} stroke={RED} strokeWidth="4.2" strokeLinecap="round" />
        <path d={`M${2 * G} ${2.62 * G}L${2 * G} ${3 * G}`} stroke={RED} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4" opacity="0.5" />
        {dots}
        {/* the pencil, its tip on the line */}
        <g transform={`translate(${2 * G} ${2.62 * G}) rotate(-58)`} filter={url(id('shadow'))}>
          <path d="M0 0L12-5V5Z" fill="#f2d2a2" />
          <path d="M0 0L4.5-1.9V1.9Z" fill="#2b2f4a" />
          <rect x="12" y="-5" width="70" height="10" fill={url(id('pencil'))} />
          <path d="M12-1.7H82M12 1.7H82" stroke="#c77700" strokeOpacity="0.45" strokeWidth="0.8" />
          <rect x="82" y="-5" width="8" height="10" fill="#cfd8dc" />
          <rect x="90" y="-5" width="10" height="10" rx="3" fill="#ff8fa3" />
        </g>
      </g>
      {/* the score chips */}
      <g filter={url(id('shadow'))}>
        <rect x="236" y="120" width="64" height="26" rx="13" fill={RED} />
        <text x="268" y="134" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">
          A · 1
        </text>
        <rect x="236" y="152" width="64" height="26" rx="13" fill={BLUE} />
        <text x="268" y="166" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="900" fill="#0d2a3a" fontFamily="system-ui, sans-serif">
          P · 1
        </text>
      </g>
      <Spark x={44} y={40} r={8} />
      <Spark x={270} y={92} r={6} fill="#fff6c2" />
      <Spark x={36} y={170} r={5} />
    </g>
  );
}
