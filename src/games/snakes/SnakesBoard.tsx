// The Saanp Seedhi board: 100 numbered squares in snaking order, wooden ladders and cute patterned snakes (our own drawing)
import { memo } from 'react';
import { snakesCellOf } from '../../types';
import { headAngle, LADDER_LIST, ladderParts, SNAKE_LIST, snakeBody, snakePoints } from './geometry';

/** bright square colours, a pair per row so the board reads in bands */
const ROW_TONES: [string, string][] = [
  ['#ffd43b', '#ffa94d'],
  ['#69db7c', '#38d9a9'],
  ['#4dabf7', '#74c0fc'],
  ['#f783ac', '#ff8787'],
  ['#b197fc', '#da77f2'],
];

/** each snake's colours: body, pattern, belly */
const SKINS: [string, string, string][] = [
  ['#3fae4f', '#c8f169', '#e9ffb8'],
  ['#ff8a3d', '#ffd166', '#ffe9b0'],
  ['#8e5bd8', '#f78fd0', '#f3d9ff'],
  ['#1fa7a0', '#9ff0e0', '#d9fff6'],
  ['#e0475b', '#ffc0c8', '#ffe4e8'],
];

function Squares() {
  const out = [];
  for (let sq = 1; sq <= 100; sq++) {
    const [c, r] = snakesCellOf(sq)!;
    const tones = ROW_TONES[Math.floor((sq - 1) / 10) % ROW_TONES.length];
    out.push(
      <g key={sq}>
        <rect x={c} y={r} width={1} height={1} fill={sq === 100 ? 'url(#sn-gold)' : tones[(c + r) % 2]} />
        <rect x={c + 0.03} y={r + 0.03} width={0.94} height={0.94} rx={0.1} fill="url(#sn-tile)" />
        <text x={c + 0.07} y={r + 0.3} className="sn-num">
          {sq}
        </text>
      </g>,
    );
  }
  return <g>{out}</g>;
}

function Ladder({ foot, top }: { foot: number; top: number }) {
  const { rails, rungs } = ladderParts(foot, top);
  const line = ([a, b]: [number, number][], cls: string, i: number) => <line key={`${cls}${i}`} className={cls} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
  return (
    <g className="sn-ladder">
      <g transform="translate(0.07 0.09)" className="sn-shadow">
        {rails.map((r, i) => line(r, 'sn-rail-sh', i))}
      </g>
      {rungs.map((r, i) => line(r, 'sn-rung-ol', i))}
      {rungs.map((r, i) => line(r, 'sn-rung', i))}
      {rails.map((r, i) => line(r, 'sn-rail-ol', i))}
      {rails.map((r, i) => line(r, 'sn-rail', i))}
      {rails.map((r, i) => line(r, 'sn-rail-hi', i))}
    </g>
  );
}

function Snake({ head, tail, i }: { head: number; tail: number; i: number }) {
  const pts = snakePoints(head, tail);
  const { outline, spine, spots } = snakeBody(pts);
  const [body, pattern, belly] = SKINS[i % SKINS.length];
  const [hx, hy] = pts[0];
  return (
    <g className="sn-snake" style={{ ['--sn-body' as string]: body }}>
      <path d={outline} className="sn-snake-sh" transform="translate(0.06 0.09)" />
      <path d={outline} fill={body} stroke="rgba(30,10,40,0.75)" strokeWidth={0.045} strokeLinejoin="round" />
      <path d={spine} fill="none" stroke={belly} strokeOpacity={0.55} strokeWidth={0.05} strokeLinecap="round" strokeDasharray="0.12 0.1" />
      {spots.map((s, k) => (
        <circle key={k} cx={s.p[0]} cy={s.p[1]} r={s.r} fill={pattern} stroke="rgba(0,0,0,0.18)" strokeWidth={0.012} />
      ))}
      <g transform={`translate(${hx} ${hy}) rotate(${headAngle(pts)})`}>
        <path d="M0.2 0L0.34 -0.05M0.2 0L0.34 0.05" stroke="#e53950" strokeWidth={0.03} strokeLinecap="round" className="sn-tongue" />
        <ellipse cx={0.02} cy={0} rx={0.26} ry={0.2} fill={body} stroke="rgba(30,10,40,0.75)" strokeWidth={0.04} />
        <ellipse cx={-0.03} cy={0} rx={0.12} ry={0.09} fill={pattern} opacity={0.7} />
        {[-1, 1].map((k) => (
          <g key={k}>
            <circle cx={0.07} cy={0.085 * k} r={0.06} fill="#fff" stroke="rgba(0,0,0,0.3)" strokeWidth={0.01} />
            <circle cx={0.09} cy={0.085 * k} r={0.032} fill="#1b1b1b" />
            <circle cx={0.1} cy={0.075 * k} r={0.011} fill="#fff" />
          </g>
        ))}
        <circle cx={-0.06} cy={0.13} r={0.03} fill="#ff8fa3" opacity={0.6} />
        <circle cx={-0.06} cy={-0.13} r={0.03} fill="#ff8fa3" opacity={0.6} />
      </g>
    </g>
  );
}

/** the whole board, drawn once (it never changes during a game) */
export const SnakesBoard = memo(function SnakesBoard() {
  const goal = snakesCellOf(100)!;
  return (
    <svg className="lu-svg sn-svg" viewBox="0 0 10 10" aria-hidden>
      <defs>
        <linearGradient id="sn-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.32} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.12} />
        </linearGradient>
        <linearGradient id="sn-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.5" stopColor="#ffc531" />
          <stop offset="1" stopColor="#ff9f1a" />
        </linearGradient>
      </defs>
      <Squares />
      <text x={goal[0] + 0.55} y={goal[1] + 0.8} className="sn-goal">
        🏁
      </text>
      <rect x={0} y={0} width={10} height={10} fill="none" stroke="rgba(40,20,60,0.45)" strokeWidth={0.05} />
      {LADDER_LIST.map(([f, t]) => (
        <Ladder key={`l${f}`} foot={f} top={t} />
      ))}
      {SNAKE_LIST.map(([h, t], i) => (
        <Snake key={`s${h}`} head={h} tail={t} i={i} />
      ))}
    </svg>
  );
});
