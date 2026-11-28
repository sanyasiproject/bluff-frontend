// Chess: a wooden board seen from the side, a white king facing a black knight, a pawn and a ticking clock
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

// a square (col 0..7 from the left, row 0..7 from the near edge) projected onto the tilted board
const S = 24;
const at = (c: number, r: number): [number, number] => {
  const x = (c - 3.5) * S;
  const y = (r - 3.5) * S;
  return [160 + (x - y) * 0.707, 128 + (x + y) * -0.707 * 0.46];
};

// simple upright piece outlines, base centre at (0, 0), about 60 tall
const KING = 'M-15 0a3 3 0 0 1-3-3v-2a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v2a3 3 0 0 1-3 3ZM-11-9C-9-18-6-24-5-30H5C6-24 9-18 11-9ZM-9-30c-6-6-5-14 3-14 3 0 5 2 6 4 1-2 3-4 6-4 8 0 9 8 3 14ZM-2.5-44v-6h-4.5v-4.5h4.5v-5h5v5h4.5v4.5h-4.5v6Z';
const KNIGHT = 'M-15 0a3 3 0 0 1-3-3v-2a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v2a3 3 0 0 1-3 3ZM-11-9c0-8 3-13 8-17-5 1-10 1-12-2-2-3-1-6 2-9l9-9c1-4 4-7 7-8l1-5 4 4c8 2 13 11 11 23-1 9-3 15-2 23Z';
const PAWN = 'M-13 0a3 3 0 0 1-3-3v-2a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v2a3 3 0 0 1-3 3ZM-9-9c1-6 4-10 6-13H3c2 3 5 7 6 13ZM-7-22a7 2.4 0 0 1 14 0a7 2.4 0 0 1-14 0ZM0-38a9 9 0 1 1 0 18a9 9 0 1 1 0-18Z';

function Piece({ id, d, x, y, s, dark }: { id: IdFn; d: string; x: number; y: number; s: number; dark: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter={url(id('shadow'))}>
      <ellipse cx="2" cy="0" rx="19" ry="5" fill="#16052e" opacity="0.35" />
      <path d={d} fill={url(id(dark ? 'ebony' : 'ivory'))} stroke={dark ? '#0b0907' : '#5b4630'} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={d} fill={url(id('pshine'))} />
    </g>
  );
}

export function ChessScene({ id, colors }: SceneProps) {
  const squares: ReactElement[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = [at(c - 0.5, r - 0.5), at(c + 0.5, r - 0.5), at(c + 0.5, r + 0.5), at(c - 0.5, r + 0.5)];
      squares.push(<path key={`${r}${c}`} d={`M${p.map((q) => q.join(' ')).join('L')}Z`} fill={(r + c) % 2 ? '#f0d9b0' : '#a8693b'} />);
    }
  const corner = [at(-0.62, -0.62), at(7.62, -0.62), at(7.62, 7.62), at(-0.62, 7.62)];
  const rim = `M${corner.map((q) => q.join(' ')).join('L')}Z`;
  const [kx, ky] = at(1, 3);
  const [nx, ny] = at(6, 5);
  const [px, py] = at(2, 1);
  const [p2x, p2y] = at(7, 2);
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d3f1e" />
          <stop offset="1" stopColor="#3e2210" />
        </linearGradient>
        <linearGradient id={id('ivory')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="0.6" stopColor="#efe2c6" />
          <stop offset="1" stopColor="#c9b28a" />
        </linearGradient>
        <linearGradient id={id('ebony')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a524c" />
          <stop offset="0.45" stopColor="#2b2623" />
          <stop offset="1" stopColor="#121010" />
        </linearGradient>
        <linearGradient id={id('pshine')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('lamp')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the board: a thick wooden rim, then the squares */}
      <g filter={url(id('shadow'))}>
        <path d={rim} fill={url(id('rim'))} transform="translate(0 9)" />
        <path d={rim} fill="#8a5428" />
      </g>
      {squares}
      <path d={rim} fill="none" stroke="#2c170a" strokeOpacity="0.5" strokeWidth="1" />
      <ellipse cx="160" cy="118" rx="120" ry="44" fill={url(id('lamp'))} />
      {/* last move glow under the knight */}
      <ellipse cx={nx} cy={ny} rx="19" ry="9" fill="#ffd54f" opacity="0.55" />
      {/* far to near so nearer pieces stand in front */}
      <Piece id={id} d={KNIGHT} x={nx} y={ny} s={1.4} dark />
      <Piece id={id} d={PAWN} x={p2x} y={p2y} s={0.95} dark />
      <Piece id={id} d={KING} x={kx} y={ky} s={1.45} dark={false} />
      <Piece id={id} d={PAWN} x={px} y={py} s={1.1} dark={false} />
      {/* the chess clock */}
      <g transform="translate(250 34)" filter={url(id('shadow'))}>
        <rect x="0" y="10" width="58" height="30" rx="6" fill="#263238" />
        <rect x="5" y="15" width="22" height="18" rx="3" fill="#eceff1" />
        <rect x="31" y="15" width="22" height="18" rx="3" fill="#ffcdd2" />
        <text x="16" y="25" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="800" fill="#263238" fontFamily="system-ui, sans-serif">3:00</text>
        <text x="42" y="25" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="800" fill="#c62828" fontFamily="system-ui, sans-serif">0:09</text>
        <rect x="9" y="5" width="14" height="6" rx="2" fill="#90a4ae" />
        <rect x="35" y="2" width="14" height="9" rx="2" fill="#ff7043" />
      </g>
      <Spark x={46} y={40} r={8} />
      <Spark x={226} y={30} r={5} fill="#fff6c2" />
      <Spark x={292} y={168} r={6} />
    </g>
  );
}
