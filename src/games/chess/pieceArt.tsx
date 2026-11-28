// Our own chess piece drawings (viewBox 0 0 100 100): a Staunton-like "classic" set and a bold flat "modern" set
import type { CSSProperties } from 'react';

export type PieceRole = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';
export type PieceSet = 'classic' | 'modern';

// classic: outlined body shapes, each role a list of [path, kind] (body = filled, line = detail stroke)
type Part = [string, 'body' | 'line' | 'dot'];
const BASE: Part = ['M24 92a3 3 0 0 1-3-3v-3a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v3a3 3 0 0 1-3 3Z', 'body'];
const CLASSIC: Record<PieceRole, Part[]> = {
  p: [
    BASE,
    ['M31 82C33 72 39 64 43 58H57C61 64 67 72 69 82Z', 'body'],
    ['M36 58a14 4.6 0 0 1 28 0a14 4.6 0 0 1-28 0Z', 'body'],
    ['M50 25a14 14 0 1 1 0 28a14 14 0 1 1 0-28Z', 'body'],
  ],
  r: [
    BASE,
    ['M32 82L35.5 47H64.5L68 82Z', 'body'],
    ['M28 47V38.5H72V47Z', 'body'],
    ['M29 38.5V19H38.5V26.5H45.5V19H54.5V26.5H61.5V19H71V38.5Z', 'body'],
    ['M36 70H64', 'line'],
  ],
  b: [
    BASE,
    ['M33 82C37 72 41 65 43.5 59H56.5C59 65 63 72 67 82Z', 'body'],
    ['M35 58.5a15 4.8 0 0 1 30 0a15 4.8 0 0 1-30 0Z', 'body'],
    ['M50 18C63 27 68 41 59 54H41C32 41 37 27 50 18Z', 'body'],
    ['M54.5 29L45.5 41M45.5 35L50 35', 'line'],
    ['M50 7a5.5 5.5 0 1 1 0 11a5.5 5.5 0 1 1 0-11Z', 'body'],
  ],
  n: [
    BASE,
    ['M31 82C30 72 35 63 43 57C37 58.5 30 60 26 56C21.5 51.5 23 45 27.5 41L39.5 29C41 23 45.5 18.5 49.5 16.5L51 9L56.5 15.5C68 18 76 31 73.5 50C72 62 67 72 69 82Z', 'body'],
    ['M57 18C65 26 67.5 40 63 56', 'line'],
    ['M30.5 47.5L35 45', 'line'],
    ['M46.5 28a2.6 2.6 0 1 1 0.01 0Z', 'dot'],
  ],
  q: [
    BASE,
    ['M31.5 82C35.5 70 40 61 42 53H58C60 61 64.5 70 68.5 82Z', 'body'],
    ['M34 53a16 5 0 0 1 32 0a16 5 0 0 1-32 0Z', 'body'],
    ['M34.5 51L23 25L37.5 38L37 19L46 35L50 15L54 35L63 19L62.5 38L77 25L65.5 51Z', 'body'],
    ['M23 21a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM37 15a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM50 11a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM63 15a4 4 0 1 1 0 8a4 4 0 1 1 0-8ZM77 21a4 4 0 1 1 0 8a4 4 0 1 1 0-8Z', 'body'],
  ],
  k: [
    BASE,
    ['M31.5 82C35.5 70 40 61 42 53H58C60 61 64.5 70 68.5 82Z', 'body'],
    ['M34 53a16 5 0 0 1 32 0a16 5 0 0 1-32 0Z', 'body'],
    ['M34 51C26 42 27 31 38 30.5C44 30.5 48 34 50 38C52 34 56 30.5 62 30.5C73 31 74 42 66 51Z', 'body'],
    ['M46.5 31.5V22.5H41V16.5H46.5V8H53.5V16.5H59V22.5H53.5V31.5Z', 'body'],
    ['M38 45.5H62', 'line'],
  ],
};

// modern: chunky flat silhouettes from circles and rounded blocks, no outline, a lit left half
const MODERN: Record<PieceRole, string> = {
  p: 'M26 92a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6h4l6-22h-3a4 4 0 0 1 0-8h2.5a15 15 0 1 1 25 0H65a4 4 0 0 1 0 8h-3l6 22h4a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4Z',
  r: 'M24 92a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6h6l3-34h-5a3 3 0 0 1-3-3V18a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v6h5v-6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v6h5v-6a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v25a3 3 0 0 1-3 3h-5l3 34h6a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4Z',
  b: 'M24 92a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6h7l7-22h-3a4 4 0 0 1 0-8h1C29 38 36 24 47 17a6 6 0 1 1 6 0c4 2.5 7.5 6 10 10L48 41l4 4 14-13c3 7 2 14-4 18h1a4 4 0 0 1 0 8h-3l7 22h7a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4Z',
  n: 'M24 92a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6h6c0-12 4-20 12-26-8 2-15 2-19-3-3-4-2-9 2-13l15-15c2-6 6-10 10-12l2-7 6 7c12 3 19 17 17 35-1 12-5 22-4 34h6a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4Z',
  q: 'M24 92a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6h6l7-24h-3a4 4 0 0 1 0-8h1L23 31a5 5 0 1 1 6-4l9 10 4-17a5 5 0 1 1 6-2l2 15 2-15a5 5 0 1 1 6 2l4 17 9-10a5 5 0 1 1 6 4L63 50h1a4 4 0 0 1 0 8h-3l7 24h6a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4Z',
  k: 'M24 92a4 4 0 0 1-4-4v-2a6 6 0 0 1 6-6h6l7-24h-3a4 4 0 0 1 0-8h1c-9-6-10-22 4-23 4 0 7 2 9 5v-6h-6a3 3 0 0 1 0-6h6V8a3 3 0 0 1 6 0v6h6a3 3 0 0 1 0 6h-6v6c2-3 5-5 9-5 14 1 13 17 4 23h1a4 4 0 0 1 0 8h-3l7 24h6a6 6 0 0 1 6 6v2a4 4 0 0 1-4 4Z',
};

const INK = { w: { fill: '#f7f1e3', edge: '#2b2118', line: '#2b2118' }, b: { fill: '#34302d', edge: '#120f0d', line: '#e9dfc9' } };
const FLAT = { w: { fill: '#ffffff', lit: '#ffffff', edge: '#9aa3b5' }, b: { fill: '#262a38', lit: '#454b61', edge: '#0d0f16' } };

/** a piece drawn in a 100×100 box, filling its parent */
export function PieceSvg({ role, color, set = 'classic', className, style }: { role: PieceRole; color: PieceColor; set?: PieceSet; className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 100 100" width="100%" height="100%" aria-hidden focusable="false">
      {set === 'modern' ? <ModernPiece role={role} color={color} /> : <ClassicPiece role={role} color={color} />}
    </svg>
  );
}

function ClassicPiece({ role, color }: { role: PieceRole; color: PieceColor }) {
  const ink = INK[color];
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="51" cy="93" rx="30" ry="4" fill="#000" opacity="0.22" />
      {CLASSIC[role].map(([d, kind], i) =>
        kind === 'body' ? (
          <path key={i} d={d} fill={ink.fill} stroke={ink.edge} strokeWidth="3" />
        ) : kind === 'dot' ? (
          <path key={i} d={d} fill={ink.line} stroke={ink.line} strokeWidth="3" />
        ) : (
          <path key={i} d={d} fill="none" stroke={ink.line} strokeWidth="2.6" opacity="0.8" />
        ),
      )}
      {/* a light catch on the left */}
      <path d={role === 'n' ? 'M34 76C34 68 37 63 41 60' : 'M37 78C39 70 42 64 44.5 60'} fill="none" stroke="#fff" strokeOpacity={color === 'w' ? 0.9 : 0.28} strokeWidth="2.4" />
    </g>
  );
}

function ModernPiece({ role, color }: { role: PieceRole; color: PieceColor }) {
  const f = FLAT[color];
  const clip = `pc-${role}-${color}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={MODERN[role]} />
        </clipPath>
      </defs>
      <ellipse cx="51" cy="93" rx="30" ry="4" fill="#000" opacity="0.22" />
      <path d={MODERN[role]} fill={f.fill} stroke={f.edge} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="0" y="0" width="47" height="100" fill={f.lit} opacity={color === 'w' ? 0 : 0.55} clipPath={`url(#${clip})`} />
      <rect x="53" y="0" width="47" height="100" fill="#000" opacity={color === 'w' ? 0.1 : 0.15} clipPath={`url(#${clip})`} />
    </g>
  );
}
