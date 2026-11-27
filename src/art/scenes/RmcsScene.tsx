// Raja Mantri Chor Sipahi: four folded paper chits on a table, one open showing the Raja's crown
import { SceneBg, Spark, url, type SceneProps } from './common';

/** a folded chit: paper, a crease and a red wax seal */
function Folded({ x, y, rot, id }: { x: number; y: number; rot: number; id: (n: string) => string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} filter={url(id('shadow'))}>
      <rect x="-30" y="-20" width="60" height="40" rx="4" fill={url(id('paper'))} />
      <path d="M-30 0H30" stroke="#b39a6e" strokeOpacity="0.55" strokeWidth="1.2" />
      <path d="M14 -20H30V-6Z" fill="#d6c39c" />
      <circle r="7.5" fill={url(id('seal'))} />
      <text y="3.4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffe2e2" fontFamily="system-ui, sans-serif">
        ?
      </text>
    </g>
  );
}

export function RmcsScene({ id, colors }: SceneProps) {
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('paper')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#e2d2b0" />
        </linearGradient>
        <radialGradient id={id('seal')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff6b6b" />
          <stop offset="1" stopColor="#b71c1c" />
        </radialGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4c2" />
          <stop offset="0.45" stopColor="#f0c75e" />
          <stop offset="1" stopColor="#b8841f" />
        </linearGradient>
        <radialGradient id={id('table')} cx="0.45" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#b9773a" />
          <stop offset="1" stopColor="#5c3010" />
        </radialGradient>
        <radialGradient id={id('halo')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff1a8" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff1a8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the round table */}
      <ellipse cx="160" cy="132" rx="150" ry="62" fill="#16052e" opacity="0.35" />
      <ellipse cx="160" cy="124" rx="146" ry="58" fill={url(id('table'))} />
      <ellipse cx="160" cy="124" rx="138" ry="52" fill="none" stroke="#ffd9a0" strokeOpacity="0.25" strokeWidth="2" />
      <Folded x={62} y={116} rot={-14} id={id} />
      <Folded x={118} y={150} rot={8} id={id} />
      <Folded x={258} y={126} rot={12} id={id} />
      {/* the open chit: a card standing up with the Raja's crown */}
      <circle cx="196" cy="86" r="62" fill={url(id('halo'))} />
      <g transform="translate(196 92) rotate(-6)" filter={url(id('shadow'))}>
        <rect x="-36" y="-50" width="72" height="96" rx="6" fill={url(id('paper'))} />
        <rect x="-36" y="-50" width="72" height="96" rx="6" fill="none" stroke="#e0a21a" strokeWidth="3" />
        <path d="M-24 6V-22L-12 -8 0 -30 12 -8 24 -22V6Z" fill={url(id('gold'))} stroke="#8a5d12" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="-24" y="4" width="48" height="8" rx="2" fill={url(id('gold'))} stroke="#8a5d12" strokeWidth="1.5" />
        <circle cx="0" cy="-30" r="3.5" fill="#e53950" />
        <circle cx="-24" cy="-22" r="3" fill="#2f8bff" />
        <circle cx="24" cy="-22" r="3" fill="#25c26e" />
        <text y="32" textAnchor="middle" fontSize="13" fontWeight="900" fill="#2a1a0a" fontFamily="system-ui, sans-serif">
          RAJA
        </text>
      </g>
      <Spark x={150} y={40} r={9} />
      <Spark x={252} y={36} r={7} fill="#fff6c2" />
      <Spark x={290} y={70} r={5} />
      <Spark x={40} y={50} r={6} />
    </g>
  );
}
