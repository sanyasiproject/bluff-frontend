// The carrom board drawn in board units (0..1 playing area): dark wooden frame, birch surface, net pockets, baselines and the centre design
import { memo } from 'react';
import { CARROM } from './lib';

export const FRAME = 0.085;
export const VIEWBOX = `${-FRAME} ${-FRAME} ${1 + 2 * FRAME} ${1 + 2 * FRAME}`;

/** one side's baseline: two lines, red circles at both ends, the arrow to the pocket (drawn for the bottom side) */
function Baseline() {
  const { baseAt, baseFrom, baseTo, baseLines, baseCircleR: cr } = CARROM;
  const y = 1 - baseAt;
  const lx = baseFrom - cr;
  const rx = baseTo + cr;
  return (
    <g>
      <path d={`M${lx} ${1 - baseLines[0]}H${rx}M${lx} ${1 - baseLines[1]}H${rx}`} stroke="#2b1a0e" strokeWidth="0.0028" />
      {[lx, rx].map((x) => (
        <g key={x}>
          <circle cx={x} cy={y} r={cr} fill="#b71c1c" stroke="#2b1a0e" strokeWidth="0.0028" />
          <circle cx={x} cy={y} r={cr * 0.55} fill="none" stroke="#ffcdd2" strokeOpacity="0.5" strokeWidth="0.002" />
        </g>
      ))}
      {/* the arrow line toward the right corner pocket, with its arc */}
      <path d={`M${1 - 0.235} ${1 - 0.235}L${1 - 0.085} ${1 - 0.085}`} stroke="#2b1a0e" strokeWidth="0.0028" />
      <path d={`M${1 - 0.245} ${1 - 0.2}A0.032 0.032 0 1 1 ${1 - 0.2} ${1 - 0.245}`} fill="none" stroke="#2b1a0e" strokeWidth="0.0028" />
    </g>
  );
}

function BoardArt() {
  const P = CARROM.pocketAt;
  const PR = CARROM.pocketR;
  const grain = [0.06, 0.15, 0.23, 0.34, 0.42, 0.55, 0.63, 0.71, 0.82, 0.9];
  return (
    <g>
      <defs>
        <linearGradient id="cr-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a2e14" />
          <stop offset="0.5" stopColor="#3b1c0b" />
          <stop offset="1" stopColor="#1f0e05" />
        </linearGradient>
        <linearGradient id="cr-frame-hi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cr-birch" cx="0.45" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#fbeccc" />
          <stop offset="0.65" stopColor="#efd6a6" />
          <stop offset="1" stopColor="#d9b780" />
        </radialGradient>
        <radialGradient id="cr-pocket" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.6" stopColor="#0d0805" />
          <stop offset="0.9" stopColor="#2a1a10" />
          <stop offset="1" stopColor="#4a2e18" />
        </radialGradient>
        <pattern id="cr-net" width="0.008" height="0.008" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0H0.008M0 0V0.008" stroke="#5d4a3a" strokeWidth="0.0012" strokeOpacity="0.5" />
        </pattern>
      </defs>
      {/* the frame: thick dark wood with a lit top edge and corner blocks */}
      <rect x={-FRAME} y={-FRAME} width={1 + 2 * FRAME} height={1 + 2 * FRAME} rx="0.03" fill="url(#cr-frame)" />
      <rect x={-FRAME} y={-FRAME} width={1 + 2 * FRAME} height={1 + 2 * FRAME} rx="0.03" fill="url(#cr-frame-hi)" />
      {[0.02, 0.045, 0.07].map((k) => (
        <rect key={k} x={-FRAME + k * 0.3} y={-FRAME + k * 0.3} width={1 + 2 * FRAME - k * 0.6} height={1 + 2 * FRAME - k * 0.6} rx="0.028" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="0.002" />
      ))}
      <rect x={-0.012} y={-0.012} width={1.024} height={1.024} fill="#120803" />
      {/* the birch surface with soft grain */}
      <rect x="0" y="0" width="1" height="1" fill="url(#cr-birch)" />
      {grain.map((g, i) => (
        <path key={g} d={`M0 ${g}C0.3 ${g - 0.012 + (i % 3) * 0.006} 0.6 ${g + 0.014} 1 ${g - 0.004}`} stroke="#a77b45" strokeOpacity="0.13" strokeWidth={0.004 + (i % 2) * 0.003} fill="none" />
      ))}
      {/* four baselines */}
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a} 0.5 0.5)`}>
          <Baseline />
        </g>
      ))}
      {/* the centre design: two rings and a star */}
      <circle cx="0.5" cy="0.5" r={CARROM.ringR} fill="none" stroke="#2b1a0e" strokeWidth="0.003" />
      <circle cx="0.5" cy="0.5" r={CARROM.ringR - 0.01} fill="none" stroke="#b71c1c" strokeWidth="0.004" strokeOpacity="0.85" />
      <path d="M0.5 0.41L0.518 0.482L0.59 0.5L0.518 0.518L0.5 0.59L0.482 0.518L0.41 0.5L0.482 0.482Z" fill="#b71c1c" fillOpacity="0.2" stroke="#b71c1c" strokeOpacity="0.55" strokeWidth="0.002" />
      <circle cx="0.5" cy="0.5" r={CARROM.centreR * 1.05} fill="none" stroke="#b71c1c" strokeWidth="0.003" />
      {/* net pockets with depth */}
      {[[P, P], [1 - P, P], [P, 1 - P], [1 - P, 1 - P]].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={PR * 1.12} fill="#1a0d05" />
          <circle cx={x} cy={y} r={PR} fill="url(#cr-pocket)" />
          <circle cx={x} cy={y} r={PR} fill="url(#cr-net)" />
          <circle cx={x} cy={y} r={PR * 1.1} fill="none" stroke="#e0c08a" strokeOpacity="0.25" strokeWidth="0.002" />
        </g>
      ))}
    </g>
  );
}

export const CarromBoardArt = memo(BoardArt);

/** the coin gradients, defined once per board */
export function CoinDefs() {
  const g = (k: string, a: string, b: string, c: string) => (
    <radialGradient id={`cr-${k}`} cx="0.36" cy="0.3" r="0.8">
      <stop offset="0" stopColor={a} />
      <stop offset="0.5" stopColor={b} />
      <stop offset="1" stopColor={c} />
    </radialGradient>
  );
  return (
    <defs>
      {g('w', '#fffdf5', '#f0dfbd', '#bf9e6b')}
      {g('b', '#6b5a4c', '#2a211b', '#0b0806')}
      {g('q', '#ffa0a0', '#d8202b', '#7c0b12')}
      {g('s', '#ffffff', '#e3ebf6', '#93a6c0')}
    </defs>
  );
}

const RING: Record<string, string> = { w: '#b8935c', b: '#5f4c3e', q: '#ff8a80', s: '#7e95b6' };

/** a glossy coin with wood grain rings (kind w, b, q or s for the striker; r in board units) */
export function Coin({ kind, x, y, r }: { kind: string; x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={r * 0.12} cy={r * 0.2} r={r} fill="#000" opacity="0.35" />
      <circle r={r} fill={`url(#cr-${kind})`} />
      <circle r={r * 0.7} fill="none" stroke={RING[kind]} strokeWidth={r * 0.09} opacity="0.85" />
      <circle r={r * 0.42} fill="none" stroke={RING[kind]} strokeWidth={r * 0.07} opacity="0.6" />
      {kind === 's' && <circle r={r * 0.16} fill={RING.s} opacity="0.6" />}
      <ellipse cx={-r * 0.32} cy={-r * 0.42} rx={r * 0.42} ry={r * 0.22} fill="#fff" opacity="0.6" transform={`rotate(-30 ${-r * 0.32} ${-r * 0.42})`} />
    </g>
  );
}
