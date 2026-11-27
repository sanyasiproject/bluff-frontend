// Colour Wars: a tilted grid of rounded cells with glossy dot blobs, one cell bursting and its blobs flying to the neighbours
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

const S = 34;
const COLS = 6;
const ROWS = 4;
const TONE: Record<string, [string, string]> = { r: ['#ff8a8a', '#e0283a'], b: ['#8fe1ff', '#1e88e5'] };
// row by row: owner letter + dots ('' = empty); the burst cell is 'x'
const GRID = [
  ['r1', '', 'b2', 'b1', '', 'r2'],
  ['', 'r3', 'x', 'b3', 'b1', ''],
  ['r2', '', 'r1', '', 'b2', 'r1'],
  ['', 'b1', '', 'r2', '', 'b3'],
];
const SPOTS: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-6, 0], [6, 0]], 3: [[-6, 4], [6, 4], [0, -6]] };

function Blob({ id, x, y, r, k }: { id: IdFn; x: number; y: number; r: number; k: 'r' | 'b' }) {
  return (
    <g>
      <circle cx={x + 0.8} cy={y + 1.6} r={r} fill="#16052e" opacity="0.25" />
      <circle cx={x} cy={y} r={r} fill={url(id(`blob-${k}`))} />
      <ellipse cx={x - r * 0.32} cy={y - r * 0.38} rx={r * 0.36} ry={r * 0.24} fill="#fff" opacity="0.85" transform={`rotate(-25 ${x - r * 0.32} ${y - r * 0.38})`} />
    </g>
  );
}

export function ColorWarScene({ id, colors }: SceneProps) {
  const cells: ReactElement[] = [];
  GRID.forEach((row, r) =>
    row.forEach((v, c) => {
      const x = c * S;
      const y = r * S;
      const k = v[0] as 'r' | 'b' | 'x' | undefined;
      const fill = k === 'r' ? '#ffd6da' : k === 'b' ? '#d3efff' : k === 'x' ? '#fff3c4' : '#f4f1fb';
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={x + 2} y={y + 2} width={S - 4} height={S - 4} rx="8" fill={fill} />
          <rect x={x + 2} y={y + 2} width={S - 4} height={S - 4} rx="8" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="1.2" />
          {(k === 'r' || k === 'b') && (SPOTS[Number(v[1])] ?? []).map(([dx, dy], i) => <Blob key={i} id={id} x={x + S / 2 + dx} y={y + S / 2 + dy} r={5.2} k={k} />)}
        </g>,
      );
    }),
  );
  // the burst at row 1, col 2: a flash and four blobs on their way out
  const bx = 2 * S + S / 2;
  const by = 1 * S + S / 2;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        {(['r', 'b'] as const).map((k) => (
          <radialGradient key={k} id={id(`blob-${k}`)} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.25" stopColor={TONE[k][0]} />
            <stop offset="1" stopColor={TONE[k][1]} />
          </radialGradient>
        ))}
        <radialGradient id={id('flash')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#ffe066" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff8a00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(66 44) rotate(-8) skewX(8) scale(0.92 0.8)">
        <rect x="-8" y="-8" width={COLS * S + 16} height={ROWS * S + 16} rx="16" fill="#16052e" opacity="0.35" transform="translate(5 10)" />
        <rect x="-8" y="-8" width={COLS * S + 16} height={ROWS * S + 16} rx="16" fill="#3a2a7a" transform="translate(0 7)" />
        <rect x="-8" y="-8" width={COLS * S + 16} height={ROWS * S + 16} rx="16" fill="#5b45b8" />
        {cells}
        <circle cx={bx} cy={by} r="30" fill={url(id('flash'))} />
        {[[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy], i) => (
          <g key={i}>
            <path d={`M${bx + dx * 8} ${by + dy * 8}L${bx + dx * 24} ${by + dy * 24}`} stroke="#ff5a6a" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <Blob id={id} x={bx + dx * 27} y={by + dy * 27} r={6} k="r" />
          </g>
        ))}
        {[[-14, -12], [15, -13], [13, 14], [-12, 13]].map(([dx, dy], i) => (
          <circle key={i} cx={bx + dx} cy={by + dy} r="2" fill="#fff6c2" />
        ))}
      </g>
      <Spark x={268} y={36} r={9} />
      <Spark x={36} y={60} r={6} fill="#fff6c2" />
      <Spark x={292} y={176} r={6} />
    </g>
  );
}
