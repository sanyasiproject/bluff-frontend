// Saanp Seedhi: a tilted board corner with a curvy green snake, a wooden ladder and a die
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type SceneProps } from './common';
import { Die } from './pieces';

const TONES = [
  ['#fff3d6', '#ffe1a8'],
  ['#e5f6dc', '#c9ecb8'],
  ['#dff1fb', '#bfe3f7'],
  ['#fbe3ee', '#f6c6dc'],
];

export function SnakesScene({ id, colors }: SceneProps) {
  const cells: ReactElement[] = [];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 8; c++) {
      const n = 100 - r * 10 - (r % 2 ? 9 - c : c);
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={c * 26} y={r * 26} width="26" height="26" fill={TONES[r % 4][(r + c) % 2]} />
          <text x={c * 26 + 3} y={r * 26 + 9} fontSize="7" fontWeight="800" fill="#7a5a30" opacity="0.6" fontFamily="system-ui, sans-serif">
            {n}
          </text>
        </g>,
      );
    }
  // a wavy snake body from the head (top right) down to the tail (bottom left)
  const body = 'M170 30C140 40 150 70 120 80S90 120 70 118 40 140 24 150';
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('snake')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ee07f" />
          <stop offset="1" stopColor="#2e9a3e" />
        </linearGradient>
        <linearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e9b878" />
          <stop offset="1" stopColor="#a0632e" />
        </linearGradient>
      </defs>
      <g transform="translate(40 30) rotate(-10) skewX(10) scale(1 0.8)">
        <rect x="-8" y="10" width="224" height="170" rx="12" fill="#16052e" opacity="0.35" />
        <rect x="-6" y="-6" width="220" height="168" rx="10" fill="#8a5526" transform="translate(0 10)" />
        <rect x="-6" y="-6" width="220" height="168" rx="10" fill="#f3e6cc" />
        {cells}
        {/* the ladder: two rails and rungs */}
        <g transform="translate(150 140) rotate(-62)">
          <rect x="0" y="-14" width="130" height="5" rx="2.5" fill="#000" opacity="0.18" transform="translate(3 4)" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={10 + i * 17} y="-12" width="4.5" height="24" rx="2" fill="#8a5526" />
          ))}
          <rect x="0" y="-14" width="130" height="5" rx="2.5" fill={url(id('wood'))} />
          <rect x="0" y="9" width="130" height="5" rx="2.5" fill={url(id('wood'))} />
        </g>
        {/* the snake: body, spots, head with eyes and tongue */}
        <path d={body} stroke="#16052e" strokeOpacity="0.25" strokeWidth="17" fill="none" strokeLinecap="round" transform="translate(3 5)" />
        <path d={body} stroke="#1f6e2b" strokeWidth="17" fill="none" strokeLinecap="round" />
        <path d={body} stroke={url(id('snake'))} strokeWidth="13.5" fill="none" strokeLinecap="round" />
        <path d={body} stroke="#d8ff8a" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="3 9" />
        <g transform="translate(174 28) rotate(-20)">
          <path d="M12 0l9-4M12 0l9 4" stroke="#e53950" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse rx="15" ry="11" fill="#3fae4f" stroke="#1f6e2b" strokeWidth="2" />
          <circle cx="4" cy="-5" r="4.2" fill="#fff" />
          <circle cx="4" cy="5" r="4.2" fill="#fff" />
          <circle cx="5.5" cy="-5" r="2.2" fill="#1b1b1b" />
          <circle cx="5.5" cy="5" r="2.2" fill="#1b1b1b" />
          <circle cx="-4" cy="-8" r="2" fill="#ff8fa3" opacity="0.7" />
        </g>
      </g>
      <g filter={url(id('shadow'))}>
        <Die id={id} k="sd" x={238} y={110} s={0.95} rot={-12} />
      </g>
      <Spark x={268} y={64} r={8} />
      <Spark x={30} y={40} r={6} fill="#fff6c2" />
      <Spark x={300} y={168} r={5} />
    </g>
  );
}
