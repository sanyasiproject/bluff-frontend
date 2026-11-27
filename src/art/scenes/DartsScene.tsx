// Darts: a dartboard on the wall, two darts in the treble 20 and one flying in with a trail
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

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
      <path d="M-40 0L-56-11L-60-10L-50 0L-60 10L-56 11Z" fill={flight} stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M-40 0L-58 0" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" />
    </g>
  );
}

export function DartsScene({ id, colors }: SceneProps) {
  const R = 72;
  const ring = (r: number) => (r / 1) * R * 0.82;
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
  const wires: ReactElement[] = NUMS.map((_, i) => {
    const [x1, y1] = pt(ring(0.094), i * 18 - 9);
    const [x2, y2] = pt(ring(1), i * 18 - 9);
    return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} stroke="#d9dde0" strokeWidth="0.7" />;
  });
  const labels = NUMS.map((n, i) => {
    const [x, y] = pt(R * 0.91, i * 18);
    return (
      <text key={n} x={x} y={y} fontSize="7.2" fontWeight="800" fill="#f5f5f5" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, sans-serif">
        {n}
      </text>
    );
  });
  const [tx, ty] = pt(ring(0.605), 0);
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <radialGradient id={id('rim')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#3a3a3e" />
          <stop offset="1" stopColor="#0d0d0f" />
        </radialGradient>
        <radialGradient id={id('board')} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
        <linearGradient id={id('barrel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f7f8" />
          <stop offset="0.5" stopColor="#9aa7ad" />
          <stop offset="1" stopColor="#4b585e" />
        </linearGradient>
        <linearGradient id={id('trail')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={id('chalk')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f4a3c" />
          <stop offset="1" stopColor="#1b2d24" />
        </linearGradient>
      </defs>
      {/* a small chalkboard with the score */}
      <g transform="translate(18 34) rotate(-6)" filter={url(id('shadow'))}>
        <rect width="78" height="58" rx="5" fill="#7a4a22" />
        <rect x="5" y="5" width="68" height="48" rx="3" fill={url(id('chalk'))} />
        <text x="39" y="26" textAnchor="middle" fontSize="17" fontWeight="800" fill="#f1f1e6" fontFamily="'Comic Sans MS', 'Chalkboard SE', system-ui, sans-serif">
          301
        </text>
        <path d="M18 31L60 36" stroke="#f1f1e6" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
        <text x="39" y="47" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffe082" fontFamily="'Comic Sans MS', 'Chalkboard SE', system-ui, sans-serif">
          121
        </text>
      </g>
      {/* the board, a touch turned towards us */}
      <g transform="translate(196 100)">
        <circle r={R + 8} fill="#16052e" opacity="0.4" transform="translate(5 8)" />
        <circle r={R + 6} fill={url(id('rim'))} />
        <circle r={R} fill="#121214" />
        {labels}
        {segs}
        {wires}
        <circle r={ring(1)} fill="none" stroke="#d9dde0" strokeWidth="0.9" />
        {[0.953, 0.629, 0.582].map((k) => (
          <circle key={k} r={ring(k)} fill="none" stroke="#d9dde0" strokeWidth="0.6" />
        ))}
        <circle r={ring(0.094)} fill="#159447" stroke="#d9dde0" strokeWidth="0.6" />
        <circle r={ring(0.037)} fill="#d8262f" stroke="#d9dde0" strokeWidth="0.6" />
        <circle r={R + 6} fill={url(id('board'))} />
        <Dart id={id} x={tx - 3} y={ty + 1} rot={-128} s={0.62} flight="#2f8bff" />
        <Dart id={id} x={tx + 3} y={ty} rot={-112} s={0.62} flight="#ffc531" />
        <Dart id={id} x={2} y={1} rot={-122} s={0.62} flight="#ff3b4e" />
      </g>
      {/* one more on its way */}
      <path d="M40 168Q90 150 128 150" stroke={url(id('trail'))} strokeWidth="5" strokeLinecap="round" fill="none" />
      <g filter={url(id('shadow'))}>
        <Dart id={id} x={146} y={146} rot={-14} s={0.85} flight="#25c26e" />
      </g>
      <Spark x={150} y={22} r={7} fill="#fff6c2" />
      <Spark x={292} y={30} r={7} />
      <Spark x={62} y={124} r={5} />
    </g>
  );
}
