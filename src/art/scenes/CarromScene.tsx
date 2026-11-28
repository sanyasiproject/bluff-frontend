// Carrom: a birch board in a dark wooden frame, the coin flower with the red queen, a striker pulled back with a dotted aim line
import type { ReactElement } from 'react';
import { Spark, SceneBg, url, type IdFn, type SceneProps } from './common';

const B = 150;
const CR = 6.4;

/** a glossy carrom coin: white, black, queen or striker */
function Coin({ id, x, y, kind, r = CR }: { id: IdFn; x: number; y: number; kind: 'w' | 'b' | 'q' | 's'; r?: number }) {
  const ring = kind === 'b' ? '#5a4a3c' : kind === 'q' ? '#ff8a80' : kind === 's' ? '#9fb8d8' : '#c9a774';
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0.9" cy="1.6" r={r} fill="#1a0d04" opacity="0.4" />
      <circle r={r} fill={url(id(`c${kind}`))} />
      <circle r={r * 0.68} fill="none" stroke={ring} strokeWidth={r * 0.1} opacity="0.85" />
      <circle r={r * 0.38} fill="none" stroke={ring} strokeWidth={r * 0.08} opacity="0.6" />
      <ellipse cx={-r * 0.32} cy={-r * 0.4} rx={r * 0.42} ry={r * 0.24} fill="#fff" opacity="0.7" transform={`rotate(-30 ${-r * 0.32} ${-r * 0.4})`} />
    </g>
  );
}

function grad(id: IdFn, k: string, light: string, mid: string, dark: string) {
  return (
    <radialGradient key={k} id={id(`c${k}`)} cx="0.36" cy="0.32" r="0.78">
      <stop offset="0" stopColor={light} />
      <stop offset="0.45" stopColor={mid} />
      <stop offset="1" stopColor={dark} />
    </radialGradient>
  );
}

export function CarromScene({ id, colors }: SceneProps) {
  const h = B / 2;
  // the flower: queen, 6 round her, 12 outside
  const coins: ReactElement[] = [];
  const s3 = 0.866;
  const inner: [number, number][] = [[2, 0], [1, s3 * 2], [-1, s3 * 2], [-2, 0], [-1, -s3 * 2], [1, -s3 * 2]];
  inner.forEach(([u, v], i) => coins.push(<Coin key={`i${i}`} id={id} x={u * CR} y={v * CR} kind={i % 2 ? 'b' : 'w'} />));
  for (let i = 0; i < 12; i++) {
    const [u, v] = i % 2 ? [inner[(i - 1) / 2][0] + inner[((i + 1) / 2) % 6][0], inner[(i - 1) / 2][1] + inner[((i + 1) / 2) % 6][1]] : [inner[i / 2][0] * 2, inner[i / 2][1] * 2];
    coins.push(<Coin key={`o${i}`} id={id} x={u * CR} y={v * CR} kind={i % 2 ? 'w' : 'b'} />);
  }
  // baselines with circles at both ends, one per side
  const lines: ReactElement[] = [];
  for (let k = 0; k < 4; k++) {
    lines.push(
      <g key={k} transform={`rotate(${k * 90})`}>
        <path d={`M-48 ${h - 21}H48M-48 ${h - 15}H48`} stroke="#3b2414" strokeWidth="0.9" />
        <circle cx="-48" cy={h - 18} r="3" fill="#c62828" stroke="#3b2414" strokeWidth="0.8" />
        <circle cx="48" cy={h - 18} r="3" fill="#c62828" stroke="#3b2414" strokeWidth="0.8" />
        <path d={`M${h - 14} ${h - 14}L${h - 40} ${h - 40}`} stroke="#3b2414" strokeWidth="0.9" />
        <path d={`M${h - 44} ${h - 34}a7 7 0 1 1 10 -10`} fill="none" stroke="#3b2414" strokeWidth="0.9" />
      </g>,
    );
  }
  // the striker sits on my baseline, pulled back, aiming up-left into the flower
  const sx = 22;
  const sy = h - 18;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        {grad(id, 'w', '#fffdf6', '#f1e2c4', '#c7a978')}
        {grad(id, 'b', '#6b5a4c', '#2b221c', '#0e0a08')}
        {grad(id, 'q', '#ff9e9e', '#e0262f', '#8e0f16')}
        {grad(id, 's', '#ffffff', '#dfe8f4', '#9db0c8')}
        <linearGradient id={id('frame')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6e3a1c" />
          <stop offset="0.5" stopColor="#4a240f" />
          <stop offset="1" stopColor="#2a1407" />
        </linearGradient>
        <radialGradient id={id('birch')} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#fbecc9" />
          <stop offset="0.7" stopColor="#ecd3a0" />
          <stop offset="1" stopColor="#d6b47a" />
        </radialGradient>
        <radialGradient id={id('pocket')} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.75" stopColor="#120a05" />
          <stop offset="1" stopColor="#3b2414" />
        </radialGradient>
        <radialGradient id={id('ring')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.6" stopColor="#ffd54a" stopOpacity="0" />
          <stop offset="0.85" stopColor="#ffd54a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd54a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(166 102) rotate(-7)">
        {/* frame, then the birch surface */}
        <rect x={-h - 18} y={-h - 14} width={B + 36} height={B + 36} rx="12" fill="#12062e" opacity="0.45" />
        <rect x={-h - 16} y={-h - 16} width={B + 32} height={B + 32} rx="12" fill={url(id('frame'))} />
        <path d={`M${-h - 10} ${-h - 13}H${h + 10}`} stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
        <rect x={-h} y={-h} width={B} height={B} rx="2" fill={url(id('birch'))} />
        {[-50, -28, -6, 18, 41, 62].map((d) => (
          <path key={d} d={`M${-h} ${d}C-30 ${d - 4} 30 ${d + 5} ${h} ${d - 1}`} stroke="#b58c58" strokeOpacity="0.18" strokeWidth="1.4" fill="none" />
        ))}
        {lines}
        {/* the centre design */}
        <circle r="30" fill="none" stroke="#3b2414" strokeWidth="0.9" />
        <circle r="27" fill="none" stroke="#c62828" strokeWidth="1.4" opacity="0.8" />
        <path d="M0 -24L5 -5L24 0L5 5L0 24L-5 5L-24 0L-5 -5Z" fill="#c62828" opacity="0.14" />
        {[[-h, -h], [h, -h], [-h, h], [h, h]].map(([x, y]) => (
          <g key={`${x}${y}`}>
            <circle cx={x * 0.93} cy={y * 0.93} r="10" fill="#3b2414" />
            <circle cx={x * 0.93} cy={y * 0.93} r="8.6" fill={url(id('pocket'))} />
          </g>
        ))}
        {coins}
        <Coin id={id} x={0} y={0} kind="q" />
        {/* the aim: dotted path to the first coin, a short line after it */}
        <path d={`M${sx} ${sy}L${inner[5][0] * 2 * CR + 3} ${inner[5][1] * 2 * CR + 9}`} stroke="#fff" strokeWidth="1.8" strokeDasharray="0.1 4.2" strokeLinecap="round" />
        <path d={`M${sx} ${sy}L${inner[5][0] * 2 * CR + 3} ${inner[5][1] * 2 * CR + 9}`} stroke="#3b2414" strokeWidth="0.6" strokeDasharray="0.1 4.2" strokeLinecap="round" opacity="0.5" />
        <path d={`M${inner[5][0] * 2 * CR} ${inner[5][1] * 2 * CR}l-10 -24`} stroke="#ffd54a" strokeWidth="1.4" strokeDasharray="3 2.5" strokeLinecap="round" />
        <circle cx={sx} cy={sy} r="15" fill={url(id('ring'))} />
        <Coin id={id} x={sx} y={sy} kind="s" r={8.4} />
        {/* the pull-back: a finger drag line behind the striker */}
        <path d={`M${sx} ${sy}l9 22`} stroke="#ffd54a" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        <circle cx={sx + 9} cy={sy + 22} r="4" fill="#fff6c2" stroke="#ffd54a" strokeWidth="1.5" />
      </g>
      {/* a pocketed white coin and the queen beside the board */}
      <g transform="translate(36 150)">
        <Coin id={id} x={0} y={0} kind="w" r={9} />
        <Coin id={id} x={16} y={6} kind="q" r={9} />
      </g>
      <Spark x={290} y={34} r={8} />
      <Spark x={42} y={40} r={6} fill="#fff6c2" />
      <Spark x={284} y={170} r={5} />
    </g>
  );
}
