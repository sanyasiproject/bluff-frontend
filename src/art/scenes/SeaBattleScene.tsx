// Sea Battle: a 10x10 ocean grid with A-J / 1-10, a grey warship, a white splash for a miss, fire and smoke on a hit, a crosshair
import type { ReactElement } from 'react';
import { ART_FONT, SceneBg, Spark, url, type SceneProps } from './common';

const N = 10;
const C = 15;
const GX = 104;
const GY = 26;

export function SeaBattleScene({ id, colors }: SceneProps) {
  const at = (c: number, r: number): [number, number] => [GX + c * C, GY + r * C];
  const grid: ReactElement[] = [];
  for (let i = 0; i <= N; i++) {
    grid.push(<path key={`h${i}`} d={`M${GX} ${GY + i * C}h${N * C}`} stroke="#bfe9ff" strokeOpacity="0.3" strokeWidth="0.7" />);
    grid.push(<path key={`v${i}`} d={`M${GX + i * C} ${GY}v${N * C}`} stroke="#bfe9ff" strokeOpacity="0.3" strokeWidth="0.7" />);
  }
  const labels: ReactElement[] = [];
  for (let i = 0; i < N; i++) {
    labels.push(
      <text key={`c${i}`} x={GX + i * C + C / 2} y={GY - 5} textAnchor="middle" fontSize="7" fontWeight="800" fill="#e1f5fe" fontFamily={ART_FONT}>
        {'ABCDEFGHIJ'[i]}
      </text>,
    );
    labels.push(
      <text key={`r${i}`} x={GX - 5} y={GY + i * C + C / 2 + 2.5} textAnchor="end" fontSize="7" fontWeight="800" fill="#e1f5fe" fontFamily={ART_FONT}>
        {i + 1}
      </text>,
    );
  }
  const misses: [number, number][] = [[1, 1], [6, 2], [3, 7], [8, 8], [2, 4]];
  const [sx, sy] = at(2, 5);
  const [hx, hy] = at(5, 5);
  const [ax, ay] = at(7, 3);
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e88c8" />
          <stop offset="1" stopColor="#0b3d66" />
        </linearGradient>
        <linearGradient id={id('hull')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b0bec5" />
          <stop offset="0.55" stopColor="#78909c" />
          <stop offset="1" stopColor="#455a64" />
        </linearGradient>
        <radialGradient id={id('fire')} cx="0.5" cy="0.65" r="0.6">
          <stop offset="0" stopColor="#fff59d" />
          <stop offset="0.4" stopColor="#ff9800" />
          <stop offset="1" stopColor="#d84315" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the sea panel with gentle waves */}
      <g filter={url(id('shadow'))}>
        <rect x={GX - 16} y={GY - 16} width={N * C + 24} height={N * C + 24} rx="10" fill="#0a2740" />
      </g>
      <rect x={GX} y={GY} width={N * C} height={N * C} rx="3" fill={url(id('sea'))} />
      {[30, 62, 94, 126, 160].map((y) => (
        <path key={y} d={`M${GX} ${y}q9 -4 18 0t18 0t18 0t18 0t18 0t18 0t18 0t18 0t6 0`} stroke="#e1f5fe" strokeOpacity="0.16" strokeWidth="1.2" fill="none" />
      ))}
      {grid}
      {labels}
      {/* misses: white rings */}
      {misses.map(([c, r]) => {
        const [x, y] = at(c, r);
        return <circle key={`${c}${r}`} cx={x + C / 2} cy={y + C / 2} r="3.4" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.85" />;
      })}
      {/* a warship, four cells long, on row 6 */}
      <g transform={`translate(${sx} ${sy})`}>
        <path d={`M3 3H${C * 4 - 9}Q${C * 4 + 2} ${C / 2} ${C * 4 - 9} ${C - 3}H3Q-1 ${C / 2} 3 3Z`} fill={url(id('hull'))} stroke="#263238" strokeWidth="0.9" />
        <rect x="9" y="4.5" width="13" height="6" rx="1" fill="#546e7a" />
        <rect x="12" y="2" width="4" height="3" rx="0.6" fill="#90a4ae" />
        <rect x="26" y="5.5" width="8" height="4" rx="1" fill="#607d8b" />
        <circle cx="44" cy="7.5" r="2.2" fill="#37474f" />
        <path d="M44 7.5h7" stroke="#37474f" strokeWidth="1.4" />
      </g>
      {/* a hit: fire and smoke on the ship's bow */}
      <circle cx={hx - C / 2} cy={hy + C / 2} r="9" fill={url(id('fire'))} />
      <path d={`M${hx - 6} ${hy + 10}q-2 -9 4 -13q-1 6 3 8q2 -5 0 -9q7 5 2 14Z`} fill="#ff7043" />
      {[[hx - 2, hy - 6, 5], [hx + 4, hy - 13, 4], [hx + 9, hy - 19, 3]].map(([x, y, r]) => (
        <circle key={y} cx={x} cy={y} r={r} fill="#455a64" opacity="0.7" />
      ))}
      {/* a splash just landed */}
      <g transform={`translate(${at(1, 8)[0] + C / 2} ${at(1, 8)[1] + C / 2})`}>
        <circle r="7" fill="none" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
        <circle r="3.4" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="-5" cy="-7" r="1.4" fill="#e1f5fe" />
        <circle cx="0" cy="-10" r="1.7" fill="#e1f5fe" />
        <circle cx="5" cy="-7" r="1.4" fill="#e1f5fe" />
      </g>
      {/* the crosshair on the next target */}
      <g transform={`translate(${ax + C / 2} ${ay + C / 2})`}>
        <circle r="10" fill="none" stroke="#ff5252" strokeWidth="2" />
        <path d="M-15 0h8M7 0h8M0 -15v8M0 7v8" stroke="#ff5252" strokeWidth="2" strokeLinecap="round" />
        <circle r="2" fill="#ff5252" />
      </g>
      {/* a radar sweep in the corner */}
      <g transform="translate(46 150)" filter={url(id('shadow'))}>
        <circle r="26" fill="#0b2a1c" stroke="#69f0ae" strokeWidth="1.6" />
        <circle r="16" fill="none" stroke="#69f0ae" strokeOpacity="0.4" />
        <path d="M0 0L18 -18A26 26 0 0 1 26 0Z" fill="#69f0ae" opacity="0.35" />
        <path d="M0 0L18 -18" stroke="#b9f6ca" strokeWidth="1.4" />
        <circle cx="10" cy="-6" r="2.2" fill="#b9f6ca" />
      </g>
      <Spark x={292} y={36} r={7} />
      <Spark x={40} y={44} r={6} fill="#fff6c2" />
    </g>
  );
}
