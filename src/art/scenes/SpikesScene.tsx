// Spike Attack: a tilted arena of boxes, a row glowing red as spikes shoot across, round characters dodging, hearts
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

const S = 30;
const N = 5;
const HOT = 2;

/** a round little character with eyes and a letter on its tummy */
function Buddy({ id, x, y, s = 1, k, ch, scared }: { id: IdFn; x: number; y: number; s?: number; k: string; ch: string; scared?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy="13" rx="13" ry="4" fill="#16052e" opacity="0.35" />
      <circle r="14" fill={url(id(`bd-${k}`))} />
      <ellipse cx="-5" cy="-7" rx="5" ry="3.2" fill="#fff" opacity="0.6" transform="rotate(-25 -5 -7)" />
      <ellipse cx="-4.5" cy="-2" rx="3" ry={scared ? 4 : 3.4} fill="#fff" />
      <ellipse cx="4.5" cy="-2" rx="3" ry={scared ? 4 : 3.4} fill="#fff" />
      <circle cx="-4" cy="-1.5" r="1.7" fill="#1b1b1b" />
      <circle cx="5" cy="-1.5" r="1.7" fill="#1b1b1b" />
      {scared ? <ellipse cy="6" rx="2.4" ry="3" fill="#5a1020" /> : <path d="M-3 5q3 3 6 0" stroke="#5a1020" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
      <text y="12.5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#fff" opacity="0.9" fontFamily="system-ui, sans-serif">
        {ch}
      </text>
    </g>
  );
}

function Heart({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <path
      transform={`translate(${x} ${y})`}
      d="M0 3C-6-2-6-7-2.6-7.4-1-7.6 0-6.4 0-5.6 0-6.4 1-7.6 2.6-7.4 6-7 6-2 0 3Z"
      fill={on ? '#ff3b5c' : '#5b4a7a'}
      stroke="#fff"
      strokeWidth="0.8"
      strokeOpacity={on ? 0.8 : 0.3}
    />
  );
}

export function SpikesScene({ id, colors }: SceneProps) {
  const cells: ReactElement[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      cells.push(<rect key={`${r}-${c}`} x={c * S + 2} y={r * S + 2} width={S - 4} height={S - 4} rx="5" fill={r === HOT ? url(id('hot')) : (r + c) % 2 ? '#3b2f7a' : '#45388c'} />);
  // a row of spikes racing in from the left along the hot row
  const spikes: ReactElement[] = [];
  for (let i = 0; i < 5; i++)
    spikes.push(<path key={i} d={`M${-26 + i * 15} ${HOT * S + 4}L${-12 + i * 15} ${HOT * S + S / 2}L${-26 + i * 15} ${HOT * S + S - 4}Z`} fill={url(id('steel'))} stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />);
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('hot')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff5a6a" />
          <stop offset="1" stopColor="#b3122c" />
        </linearGradient>
        <linearGradient id={id('steel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c3cbd6" />
          <stop offset="1" stopColor="#6b7686" />
        </linearGradient>
        <linearGradient id={id('slash')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.85" />
        </linearGradient>
        {[['y', '#ffe07a', '#e59a00'], ['b', '#8fe1ff', '#1e6fd8'], ['g', '#a6f5b8', '#1f9a4d'], ['r', '#ff9aa6', '#d81b3a']].map(([k, a, b]) => (
          <radialGradient key={k} id={id(`bd-${k}`)} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </radialGradient>
        ))}
      </defs>
      <g transform="translate(90 26) rotate(-6) skewX(6) scale(1 0.88)">
        <rect x="-10" y="-10" width={N * S + 20} height={N * S + 20} rx="14" fill="#16052e" opacity="0.4" transform="translate(5 10)" />
        <rect x="-10" y="-10" width={N * S + 20} height={N * S + 20} rx="14" fill="#1d1546" transform="translate(0 7)" />
        <rect x="-10" y="-10" width={N * S + 20} height={N * S + 20} rx="14" fill="#2a2063" stroke="#8e7cff" strokeOpacity="0.5" strokeWidth="1.5" />
        {cells}
        {/* the warning edge glows red */}
        <rect x="-14" y={HOT * S - 2} width="8" height={S + 4} rx="4" fill="#ff1744" />
        <rect x={N * S + 6} y={HOT * S - 2} width="8" height={S + 4} rx="4" fill="#ff1744" opacity="0.4" />
        <path d={`M-30 ${HOT * S + S / 2}H${4 * 15 + 70}`} stroke={url(id('slash'))} strokeWidth="5" strokeLinecap="round" />
        {spikes}
        <Buddy id={id} k="y" ch="A" x={4 * S + S / 2} y={HOT * S + S / 2 - 22} s={1.05} scared />
        <Buddy id={id} k="b" ch="P" x={1 * S + S / 2} y={0 * S + S / 2} />
        <Buddy id={id} k="g" ch="R" x={3 * S + S / 2} y={4 * S + S / 2} />
        <g opacity="0.45">
          <Buddy id={id} k="r" ch="M" x={0 * S + S / 2} y={4 * S + S / 2 - 4} s={0.9} />
        </g>
      </g>
      {/* hearts left */}
      <g filter={url(id('shadow'))}>
        <rect x="16" y="20" width="62" height="22" rx="11" fill="#1d1546" opacity="0.75" />
        <Heart x={31} y={33} on />
        <Heart x={47} y={33} on />
        <Heart x={63} y={33} on={false} />
      </g>
      {/* a big 1 for the countdown */}
      <text x="290" y="120" textAnchor="middle" fontSize="54" fontWeight="900" fill="#fff" stroke="#ff1744" strokeWidth="4" paintOrder="stroke" fontFamily="system-ui, sans-serif" filter={url(id('shadow'))}>
        1
      </text>
      <Spark x={300} y={40} r={8} />
      <Spark x={40} y={160} r={6} fill="#fff6c2" />
    </g>
  );
}
