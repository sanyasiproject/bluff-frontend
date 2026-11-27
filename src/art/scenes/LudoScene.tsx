// Ludo: a tilted corner of a board, two glossy gotis and a die
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type SceneProps } from './common';
import { Die, Goti } from './pieces';

const RED = '#ff3b4e';
const GREEN = '#25c26e';
const YELLOW = '#ffc531';
const BLUE = '#2f8bff';

export function LudoScene({ id, colors }: SceneProps) {
  const cells: ReactElement[] = [];
  // track cells beside and below the red home
  for (let c = 0; c < 3; c++) for (let r = 0; r < 6; r++) {
    const green = (c === 1 && r > 0) || (c === 2 && r === 1);
    cells.push(<rect key={`v${c}${r}`} x={120 + c * 20} y={r * 20} width="20" height="20" fill={green ? GREEN : '#fffaf0'} stroke="#d8cbb4" strokeWidth="1" />);
  }
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
    const red = (r === 1 && c > 0) || (r === 0 && c === 1);
    cells.push(<rect key={`h${r}${c}`} x={c * 20} y={120 + r * 20} width="20" height="20" fill={red ? RED : '#fffaf0'} stroke="#d8cbb4" strokeWidth="1" />);
  }
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('home')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6b78" />
          <stop offset="1" stopColor="#d81b3a" />
        </linearGradient>
        <radialGradient id={id('spot')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff8a95" />
          <stop offset="1" stopColor="#c4122f" />
        </radialGradient>
        <linearGradient id={id('boardSheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* the board: thickness, then the top face */}
      <g transform="translate(20 86) rotate(-14) skewX(12) scale(1 0.74)">
        <rect x="-8" y="6" width="210" height="210" rx="18" fill="#16052e" opacity="0.35" />
        <rect x="-6" y="-6" width="204" height="204" rx="16" fill="#b78a52" transform="translate(0 12)" />
        <rect x="-6" y="-6" width="204" height="204" rx="16" fill="#f3e6cc" />
        <rect x="0" y="0" width="120" height="120" rx="10" fill={url(id('home'))} />
        <rect x="18" y="18" width="84" height="84" rx="14" fill="#fffaf0" />
        {[[40, 40], [80, 40], [40, 80], [80, 80]].map(([cx, cy]) => (
          <g key={`${cx}${cy}`}>
            <circle cx={cx} cy={cy} r="13" fill={url(id('spot'))} />
            <circle cx={cx} cy={cy} r="13" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
          </g>
        ))}
        {cells}
        <path d="M170 25l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" opacity="0.85" />
        <path d="M120 120L150 150L120 180Z" fill={RED} />
        <path d="M120 120L180 120L150 150Z" fill={GREEN} />
        <path d="M180 120L180 180L150 150Z" fill={YELLOW} />
        <path d="M120 180L180 180L150 150Z" fill={BLUE} />
        <rect x="-6" y="-6" width="204" height="204" rx="16" fill={url(id('boardSheen'))} />
      </g>
      <Goti id={id} k="y" x={196} y={122} s={1.05} light="#ffe07a" dark="#e59a00" />
      <Goti id={id} k="b" x={122} y={164} s={1.35} light="#7cc8ff" dark="#1d4fd8" />
      <g filter={url(id('shadow'))}>
        <Die id={id} k="d" x={230} y={96} s={1.05} rot={14} />
      </g>
      <Spark x={236} y={56} r={9} />
      <Spark x={292} y={150} r={6} fill="#fff6c2" />
      <Spark x={60} y={36} r={7} />
    </g>
  );
}
