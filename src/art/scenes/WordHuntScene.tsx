// Word Grid Hunt: a tray of chunky maple letter tiles, a glowing trail spelling a word, a timer ring and a +points pop
import { SceneBg, Spark, url, type SceneProps } from './common';

const LETTERS = ['W', 'O', 'R', 'D', 'A', 'G', 'N', 'S', 'M', 'E', 'I', 'T', 'Qu', 'L', 'P', 'H'];
const T = 30;
const GAP = 5;
// the traced word: G-A-M-E, turning a corner
const PATH = [5, 4, 8, 9];

const centre = (i: number) => ({ x: (i % 4) * (T + GAP) + T / 2, y: Math.floor(i / 4) * (T + GAP) + T / 2 });

export function WordHuntScene({ id, colors }: SceneProps) {
  const span = 4 * T + 3 * GAP;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('tile')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fff1d2" />
          <stop offset="0.6" stopColor="#f2cf90" />
          <stop offset="1" stopColor="#dfb06a" />
        </linearGradient>
        <linearGradient id={id('lit')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff8d6" />
          <stop offset="1" stopColor="#ffcf4a" />
        </linearGradient>
        <linearGradient id={id('felt')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#24705a" />
          <stop offset="1" stopColor="#14463a" />
        </linearGradient>
      </defs>
      <g transform="translate(88 30) rotate(-6 70 70)">
        <rect x="-12" y="-12" width={span + 24} height={span + 24} rx="14" fill="#16052e" opacity="0.4" transform="translate(6 10)" />
        <rect x="-12" y="-12" width={span + 24} height={span + 24} rx="14" fill="#8a5a2e" />
        <rect x="-7" y="-7" width={span + 14} height={span + 14} rx="10" fill={url(id('felt'))} />
        {LETTERS.map((ch, i) => {
          const { x, y } = centre(i);
          const on = PATH.includes(i);
          return (
            <g key={i} transform={`translate(${x} ${y})${on ? ' translate(0 -2)' : ''}`}>
              <rect x={-T / 2} y={-T / 2 + 3} width={T} height={T} rx="6" fill="#8a5420" opacity="0.8" />
              <rect x={-T / 2} y={-T / 2} width={T} height={T} rx="6" fill={url(id(on ? 'lit' : 'tile'))} stroke={on ? '#ffb300' : 'none'} strokeWidth="2" />
              <rect x={-T / 2 + 3} y={-T / 2 + 2} width={T - 6} height="5" rx="2.5" fill="#fff" opacity="0.5" />
              <text y="1.5" textAnchor="middle" dominantBaseline="central" fontSize={ch.length > 1 ? 13 : 17} fontWeight="900" fill="#4a2a0c" fontFamily="Georgia, 'Times New Roman', serif">
                {ch}
              </text>
            </g>
          );
        })}
        {/* the glowing trail through the tile centres */}
        <polyline points={PATH.map((i) => `${centre(i).x},${centre(i).y}`).join(' ')} fill="none" stroke="#ffb300" strokeOpacity="0.45" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" filter={url(id('soft'))} />
        <polyline points={PATH.map((i) => `${centre(i).x},${centre(i).y}`).join(' ')} fill="none" stroke="#ffcc33" strokeOpacity="0.85" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={centre(9).x} cy={centre(9).y} r="5" fill="#fff" />
      </g>
      {/* the word, popping up with its points */}
      <g filter={url(id('shadow'))} transform="translate(56 34) rotate(-6)">
        <rect x="-40" y="-15" width="80" height="30" rx="10" fill="#2e7d32" />
        <text x="-9" y="1" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="900" fill="#fff" fontFamily="Georgia, serif" letterSpacing="1">
          GAME
        </text>
        <text x="27" y="1" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="900" fill="#b9f6ca" fontFamily="system-ui, sans-serif">
          +1
        </text>
      </g>
      {/* the timer ring */}
      <g transform="translate(270 140)" filter={url(id('shadow'))}>
        <circle r="26" fill="#0b2a26" />
        <circle r="21" fill="none" stroke="#ffffff" strokeOpacity="0.15" strokeWidth="6" />
        <circle r="21" fill="none" stroke="#ffca28" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 21 * 0.68} 200`} transform="rotate(-90)" />
        <text y="1" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">
          1:22
        </text>
      </g>
      <g transform="translate(36 160)" filter={url(id('shadow'))}>
        <path d="M0 -12L3.5 -3.8L12 -3.7L5.3 1.6L7.6 10L0 5.2L-7.6 10L-5.3 1.6L-12 -3.7L-3.5 -3.8Z" fill="#ffd54f" />
      </g>
      <Spark x={266} y={44} r={8} />
      <Spark x={292} y={92} r={5} fill="#fff6c2" />
      <Spark x={70} y={120} r={5} />
    </g>
  );
}
