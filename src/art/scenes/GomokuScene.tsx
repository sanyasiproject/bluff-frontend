// Five in a Row: a wooden board seen at an angle, glossy stones in four colours, a glowing red five and a blue stone dropping in
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type SceneProps } from './common';

const N = 9;
const G = 19;
const COLS: Record<string, string> = { r: '#ff5252', b: '#40c4ff', g: '#69f0ae', y: '#ffd740' };
// stones as [col, row, colour]; the red five runs down the diagonal
const STONES: [number, number, string][] = [
  [2, 2, 'r'], [3, 3, 'r'], [4, 4, 'r'], [5, 5, 'r'], [6, 6, 'r'],
  [3, 2, 'b'], [4, 3, 'b'], [5, 3, 'b'], [2, 4, 'b'], [6, 4, 'b'],
  [3, 5, 'g'], [4, 6, 'g'], [5, 2, 'g'], [1, 3, 'y'], [6, 2, 'y'], [3, 6, 'y'],
];

export function GomokuScene({ id, colors }: SceneProps) {
  const lines: ReactElement[] = [];
  for (let i = 0; i < N; i++) {
    lines.push(<path key={`h${i}`} d={`M0 ${i * G}H${(N - 1) * G}`} />, <path key={`v${i}`} d={`M${i * G} 0V${(N - 1) * G}`} />);
  }
  const span = (N - 1) * G;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6cf8c" />
          <stop offset="0.55" stopColor="#e0a75e" />
          <stop offset="1" stopColor="#c4843f" />
        </linearGradient>
        <pattern id={id('grain')} width="40" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
          <path d="M0 4.5Q10 2 20 4.5T40 4.5" fill="none" stroke="#9a5d22" strokeOpacity="0.16" strokeWidth="1.2" />
        </pattern>
        {Object.entries(COLS).map(([k, c]) => (
          <radialGradient key={k} id={id(`st-${k}`)} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.2" stopColor={c} />
            <stop offset="0.85" stopColor={c} />
            <stop offset="1" stopColor="#1a0a00" stopOpacity="0.6" />
          </radialGradient>
        ))}
        <linearGradient id={id('strike')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff8d0" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#fff8d0" />
          <stop offset="1" stopColor="#fff8d0" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* the board, lying back at an angle */}
      <g transform="translate(160 110) scale(1 0.6) rotate(45) translate(-76 -76)">
        <rect x="-14" y="-14" width={span + 28} height={span + 28} rx="8" fill="#16052e" opacity="0.4" transform="translate(10 14)" />
        <rect x="-14" y="-14" width={span + 28} height={span + 28} rx="8" fill="#7d4a1c" transform="translate(4 6)" />
        <rect x="-14" y="-14" width={span + 28} height={span + 28} rx="8" fill={url(id('wood'))} />
        <rect x="-14" y="-14" width={span + 28} height={span + 28} rx="8" fill={url(id('grain'))} />
        <g stroke="#3b2410" strokeOpacity="0.75" strokeWidth="1">
          {lines}
        </g>
        {[[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]].map(([c, r]) => (
          <circle key={`${c}${r}`} cx={c * G} cy={r * G} r="2.2" fill="#3b2410" />
        ))}
        {/* the five's glow under the stones */}
        <path d={`M${2 * G} ${2 * G}L${6 * G} ${6 * G}`} stroke="#ffd54f" strokeOpacity="0.55" strokeWidth="18" strokeLinecap="round" filter={url(id('soft'))} />
      </g>
      {/* stones stand up off the tilted board (drawn flat so they stay round) */}
      {STONES.map(([c, r, k]) => {
        const x = 160 + (c - r) * G * 0.7071;
        const y = 110 + (c + r - 8) * G * 0.7071 * 0.6;
        return (
          <g key={`${c}-${r}`} transform={`translate(${x} ${y})`}>
            <ellipse cx="1.5" cy="4.5" rx="9" ry="4.5" fill="#3a1d00" opacity="0.35" />
            <ellipse rx="9" ry="8.2" fill={url(id(`st-${k}`))} />
          </g>
        );
      })}
      {/* the strike through the five */}
      {(() => {
        const at = (c: number) => ({ x: 160, y: 110 + (2 * c - 8) * G * 0.7071 * 0.6 });
        const a = at(2);
        const z = at(6);
        return (
          <g>
            <path d={`M${a.x} ${a.y - 16}L${z.x} ${z.y + 16}`} stroke="#ffd54f" strokeOpacity="0.6" strokeWidth="9" strokeLinecap="round" filter={url(id('soft'))} />
            <path d={`M${a.x} ${a.y - 16}L${z.x} ${z.y + 16}`} stroke={url(id('strike'))} strokeWidth="4" strokeLinecap="round" />
          </g>
        );
      })()}
      {/* a blue stone dropping in, with its shadow waiting below */}
      <g filter={url(id('shadow'))}>
        <ellipse cx="226" cy="124" rx="9" ry="4" fill="#3a1d00" opacity="0.3" />
        <ellipse cx="226" cy="78" rx="11" ry="10" fill={url(id('st-b'))} />
        <path d="M226 50V62M218 54l3 7M234 54l-3 7" stroke="#fff" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* the 5 badge */}
      <g filter={url(id('shadow'))} transform="translate(42 40) rotate(-8)">
        <rect x="-22" y="-16" width="44" height="32" rx="10" fill="#fff" />
        <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="20" fontWeight="900" fill="#ff5252" fontFamily="system-ui, sans-serif">
          ×5
        </text>
      </g>
      <Spark x={46} y={158} r={8} />
      <Spark x={284} y={60} r={6} fill="#fff6c2" />
      <Spark x={272} y={170} r={5} />
    </g>
  );
}
