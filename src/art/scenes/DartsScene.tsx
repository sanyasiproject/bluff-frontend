// Darts: a dartboard in a wooden cabinet, the golden two-line sweep aim crossing on the board, a dart at the cross, a 301 slate
import type { ReactElement } from 'react';
import { ART_FONT, SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

const NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const pt = (r: number, deg: number) => [Math.sin((deg * Math.PI) / 180) * r, -Math.cos((deg * Math.PI) / 180) * r];

/** an annular sector from r1 to r2 between two angles (degrees clockwise from up) */
function sector(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
}

/** a dart: steel tip at (0,0), barrel and flights pointing back along -x */
function Dart({ id, x, y, rot, s = 1, flight }: { id: IdFn; x: number; y: number; rot: number; s?: number; flight: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0L-9-1.2V1.2Z" fill="#cfd8dc" />
      <rect x="-30" y="-3" width="22" height="6" rx="2.5" fill={url(id('barrel'))} />
      {[-26, -22, -18, -14].map((g) => (
        <path key={g} d={`M${g}-3V3`} stroke="#37474f" strokeOpacity="0.5" strokeWidth="1" />
      ))}
      <rect x="-44" y="-1.2" width="15" height="2.4" fill="#eceff1" />
      <path d="M-40 0L-56-11L-60-10L-50 0L-60 10L-56 11Z" fill={flight} stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M-40 0L-58 0" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" />
    </g>
  );
}

/** a gold triangle marker pointing along dir (0 right, 90 down, 180 left, 270 up) */
function Marker({ x, y, dir }: { x: number; y: number; dir: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${dir})`}>
      <path d="M2 0L-9-8V8Z" fill="#ffd54a" stroke="#8a5a00" strokeWidth="1" strokeLinejoin="round" />
      <path d="M-7-4.5V2" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

const CX = 186;
const CY = 100;
const R = 72;
const AX = CX + 24;
const AY = CY - 28;

export function DartsScene({ id, colors }: SceneProps) {
  const ring = (k: number) => k * R * 0.8;
  const segs: ReactElement[] = [];
  NUMS.forEach((n, i) => {
    const a1 = i * 18 - 9;
    const a2 = a1 + 18;
    const dark = i % 2 === 0;
    const base = dark ? '#1d1d1f' : '#f3e7c9';
    const hot = dark ? '#d8262f' : '#159447';
    segs.push(
      <g key={n}>
        <path d={sector(ring(0.094), ring(0.582), a1, a2)} fill={base} />
        <path d={sector(ring(0.582), ring(0.629), a1, a2)} fill={hot} />
        <path d={sector(ring(0.629), ring(0.953), a1, a2)} fill={base} />
        <path d={sector(ring(0.953), ring(1), a1, a2)} fill={hot} />
      </g>,
    );
  });
  const wires = NUMS.map((_, i) => {
    const [x1, y1] = pt(ring(0.094), i * 18 - 9);
    const [x2, y2] = pt(ring(1), i * 18 - 9);
    return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} stroke="#d9dde0" strokeWidth="0.6" />;
  });
  const labels = NUMS.map((n, i) => {
    const [x, y] = pt(R * 0.9, i * 18);
    return (
      <text key={n} x={x} y={y} fontSize="8" fontWeight="800" fill="#f5f5f5" textAnchor="middle" dominantBaseline="central" fontFamily={ART_FONT}>
        {n}
      </text>
    );
  });
  const glow = url(id('glowF'));
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9773a" />
          <stop offset="1" stopColor="#6a3a14" />
        </linearGradient>
        <linearGradient id={id('back')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a2610" />
          <stop offset="0.5" stopColor="#7a4720" />
          <stop offset="1" stopColor="#4a2610" />
        </linearGradient>
        <radialGradient id={id('rim')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f4f6f8" />
          <stop offset="1" stopColor="#7d8794" />
        </radialGradient>
        <radialGradient id={id('board')} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
        <linearGradient id={id('barrel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f7f8" />
          <stop offset="0.5" stopColor="#9aa7ad" />
          <stop offset="1" stopColor="#4b585e" />
        </linearGradient>
        <linearGradient id={id('chalk')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#35574a" />
          <stop offset="1" stopColor="#1b2f26" />
        </linearGradient>
        <filter id={id('glowF')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* the wooden cabinet */}
      <rect x={CX - 86} y={CY - 88} width="180" height="186" rx="10" fill="#16052e" opacity="0.4" />
      <rect x={CX - 90} y={CY - 92} width="180" height="184" rx="10" fill={url(id('wood'))} />
      <rect x={CX - 82} y={CY - 84} width="164" height="168" rx="6" fill={url(id('back'))} />
      {[-50, -10, 30, 64].map((d) => (
        <path key={d} d={`M${CX + d} ${CY - 84}v168`} stroke="#2e1606" strokeOpacity="0.35" strokeWidth="1.2" />
      ))}
      <path d={`M${CX - 86} ${CY - 90}H${CX + 86}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
      {/* the board */}
      <g transform={`translate(${CX} ${CY})`}>
        <circle r={R + 7} fill="#16052e" opacity="0.45" transform="translate(3 5)" />
        <circle r={R + 7} fill={url(id('rim'))} />
        <circle r={R + 3} fill="#111113" />
        {labels}
        {segs}
        {wires}
        {[1, 0.953, 0.629, 0.582].map((k) => (
          <circle key={k} r={ring(k)} fill="none" stroke="#d9dde0" strokeWidth="0.6" />
        ))}
        <circle r={ring(0.094)} fill="#159447" stroke="#d9dde0" strokeWidth="0.6" />
        <circle r={ring(0.037)} fill="#d8262f" stroke="#d9dde0" strokeWidth="0.6" />
        <circle r={R + 7} fill={url(id('board'))} />
      </g>
      {/* the sweep aim: a horizontal and a vertical golden line crossing at the aim point */}
      <g filter={glow}>
        <path d={`M${CX - 78} ${AY}H${CX + 78}`} stroke="#ffd54a" strokeWidth="2.6" strokeLinecap="round" />
        <path d={`M${AX} ${CY - 82}V${CY + 82}`} stroke="#ffd54a" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <path d={`M${CX - 78} ${AY - 0.6}H${CX + 78}M${AX - 0.6} ${CY - 82}V${CY + 82}`} stroke="#fffbe0" strokeWidth="0.9" />
      <Marker x={CX - 80} y={AY} dir={0} />
      <Marker x={CX + 80} y={AY} dir={180} />
      <Marker x={AX} y={CY - 84} dir={90} />
      <Marker x={AX} y={CY + 84} dir={270} />
      <g filter={glow}>
        <circle cx={AX} cy={AY} r="7" fill="none" stroke="#ffd54a" strokeWidth="2.2" />
        <circle cx={AX} cy={AY} r="2" fill="#fff6c2" />
      </g>
      <g filter={url(id('shadow'))}>
        <Dart id={id} x={AX + 1} y={AY + 1} rot={125} s={0.85} flight="#ff3b4e" />
      </g>
      {/* a chalk slate with the score */}
      <g transform="translate(18 52) rotate(-6)" filter={url(id('shadow'))}>
        <rect width="70" height="56" rx="5" fill="#8a5426" />
        <rect x="5" y="5" width="60" height="46" rx="3" fill={url(id('chalk'))} />
        <text x="35" y="31" textAnchor="middle" fontSize="21" fontWeight="900" fill="#f4f4ea" fontFamily={ART_FONT}>
          301
        </text>
        <text x="35" y="44" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#ffe082" letterSpacing="1.5" fontFamily={ART_FONT}>
          LEFT
        </text>
        <path d="M10 9h12" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <Spark x={292} y={30} r={7} />
      <Spark x={46} y={150} r={6} fill="#fff6c2" />
      <Spark x={78} y={30} r={5} />
    </g>
  );
}
