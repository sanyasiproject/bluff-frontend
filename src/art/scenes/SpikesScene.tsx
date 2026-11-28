// Spike Attack: a stone temple arena seen from above, steel spikes shooting in from the left wall, crates and round blobs
import type { ReactElement } from 'react';
import { SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

const N = 5;
const S = 38;
const K = 0.66;
const X0 = 65;
const Y0 = 36;
const HOT = 2;

/** screen centre of tile (c, r) */
const at = (c: number, r: number) => [X0 + c * S + S / 2, Y0 + (r * S + S / 2) * K];

/** a glossy round blob with big white eyes, standing on (x, y) */
function Blob({ id, k, x, y, scared }: { id: IdFn; k: string; x: number; y: number; scared?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.18)`}>
      <ellipse cy="1" rx="14" ry="4.5" fill="#1a0f08" opacity="0.4" />
      <ellipse cy="-13" rx="15.5" ry="14.5" fill={url(id(`bl-${k}`))} />
      <ellipse cx="-6" cy="-21" rx="6" ry="3.4" fill="#fff" opacity="0.65" transform="rotate(-25 -6 -21)" />
      <ellipse cx="-5.5" cy="-14" rx="4.6" ry={scared ? 6 : 5.2} fill="#fff" />
      <ellipse cx="5.5" cy="-14" rx="4.6" ry={scared ? 6 : 5.2} fill="#fff" />
      <circle cx={scared ? -7 : -4.6} cy="-13.4" r="2.5" fill="#1b1b2b" />
      <circle cx={scared ? 4 : 6.4} cy="-13.4" r="2.5" fill="#1b1b2b" />
      <circle cx={scared ? -7.8 : -5.4} cy="-14.4" r="0.9" fill="#fff" />
      <circle cx={scared ? 3.2 : 5.6} cy="-14.4" r="0.9" fill="#fff" />
      {scared ? <ellipse cy="-4.5" rx="2.6" ry="2.4" fill="#4a0d1a" /> : <path d="M-3.5-6q3.5 3 7 0" stroke="#4a0d1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      <ellipse cx="-10.5" cy="-7" rx="2.4" ry="1.4" fill="#ff6b8a" opacity="0.45" />
      <ellipse cx="10.5" cy="-7" rx="2.4" ry="1.4" fill="#ff6b8a" opacity="0.45" />
    </g>
  );
}

/** a wooden crate with metal corner plates, standing on (x, y) */
function Crate({ id, x, y }: { id: IdFn; x: number; y: number }) {
  const w = 28;
  const h = 19;
  const t = 12;
  const plate = (px: number, py: number) => (
    <g key={`${px}${py}`}>
      <rect x={px - 3} y={py - 3} width="6" height="6" rx="1" fill={url(id('metal'))} stroke="#4a5058" strokeWidth="0.5" />
      <circle cx={px} cy={py} r="0.9" fill="#3a3f46" />
    </g>
  );
  return (
    <g transform={`translate(${x - w / 2} ${y - h})`}>
      <ellipse cx={w / 2 + 3} cy={h + 1} rx={w / 2 + 3} ry="4" fill="#1a0f08" opacity="0.35" />
      <rect y={-t} width={w} height={t} fill={url(id('woodTop'))} stroke="#5c3510" strokeWidth="0.8" />
      <path d={`M0 ${-t / 2}H${w}`} stroke="#8a5420" strokeWidth="0.6" opacity="0.7" />
      <rect width={w} height={h} fill={url(id('wood'))} stroke="#5c3510" strokeWidth="0.8" />
      <rect x="2.5" y="2.5" width={w - 5} height={h - 5} fill="none" stroke="#6b3d12" strokeWidth="1.6" />
      <path d={`M3 ${h - 3}L${w - 3} 3`} stroke="#6b3d12" strokeWidth="2" />
      <path d={`M3 ${h / 2}H${w - 3}`} stroke="#6b3d12" strokeWidth="0.6" opacity="0.6" />
      {[plate(2.5, 2.5), plate(w - 2.5, 2.5), plate(2.5, h - 2.5), plate(w - 2.5, h - 2.5), plate(2.5, -t + 2.5), plate(w - 2.5, -t + 2.5)]}
      <path d={`M1 ${-t + 0.8}H${w - 1}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
    </g>
  );
}

function Heart({ x, y }: { x: number; y: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(1.2)`}
      d="M0 3C-6-2-6-7-2.6-7.4-1-7.6 0-6.4 0-5.6 0-6.4 1-7.6 2.6-7.4 6-7 6-2 0 3Z"
      fill="#ff2d55"
      stroke="#fff"
      strokeWidth="0.9"
    />
  );
}

const BLOBS: [string, string, string][] = [['r', '#ff9aa6', '#d81b3a'], ['y', '#fff09a', '#f0a400'], ['b', '#a8e6ff', '#1e7fe0'], ['g', '#b2f7c4', '#1fa354']];
const CRACKS = ['M6 4l7 6 3 7', 'M24 3l-5 8 4 6', 'M9 20l6-4 9 2', 'M5 12l9-1'];

export function SpikesScene({ id, colors }: SceneProps) {
  const fw = N * S;
  const fh = N * S * K;
  const tiles: ReactElement[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const x = X0 + c * S + 1.5;
      const y = Y0 + r * S * K + 1.2;
      const crack = (r * 3 + c * 7) % 4;
      tiles.push(
        <g key={`${r}-${c}`}>
          <rect x={x} y={y} width={S - 3} height={S * K - 2.4} rx="2.5" fill={url(id((r + c) % 2 ? 'stoneA' : 'stoneB'))} />
          <path d={`M${x + 1.5} ${y + 1}H${x + S - 4.5}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
          {(r + c) % 3 === 0 && <path transform={`translate(${x} ${y}) scale(1 ${K})`} d={CRACKS[crack]} stroke="#8c7b62" strokeWidth="0.8" fill="none" opacity="0.8" />}
        </g>,
      );
    }
  const hy = Y0 + HOT * S * K;
  const cy = hy + (S * K) / 2;
  const spikes: [number, number, number][] = [[-8, 64, 1.05], [8, 72, 1.05], [0, 90, 1.3]];
  const [rx, ry] = at(1, 0);
  const [yx, yy] = at(4, HOT);
  const [bx, by] = at(3, 4);
  const [c1x, c1y] = at(3, 0);
  const [c2x, c2y] = at(0, 4);
  const [c3x, c3y] = at(4, 4);
  const foot = (S * K) / 2 - 3;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('stoneA')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1e8d6" />
          <stop offset="1" stopColor="#cdbd9f" />
        </linearGradient>
        <linearGradient id={id('stoneB')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6dbc4" />
          <stop offset="1" stopColor="#c1b091" />
        </linearGradient>
        <linearGradient id={id('rimTop')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9ab95" />
          <stop offset="1" stopColor="#7c6e5c" />
        </linearGradient>
        <linearGradient id={id('rimFront')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e6252" />
          <stop offset="1" stopColor="#3f362c" />
        </linearGradient>
        <linearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0a55e" />
          <stop offset="1" stopColor="#a8652a" />
        </linearGradient>
        <linearGradient id={id('woodTop')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6cb8a" />
          <stop offset="1" stopColor="#c98a45" />
        </linearGradient>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#8d96a3" />
        </linearGradient>
        <linearGradient id={id('steel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d3dae3" />
          <stop offset="1" stopColor="#5d6878" />
        </linearGradient>
        <linearGradient id={id('danger')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff1f3d" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff1f3d" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={id('streak')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.8" />
        </linearGradient>
        {BLOBS.map(([k, a, b]) => (
          <radialGradient key={k} id={id(`bl-${k}`)} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </radialGradient>
        ))}
      </defs>
      {/* the arena: shadow, front wall, rim top, floor well */}
      <rect x={X0 - 11} y={Y0 + 2} width={fw + 28} height={fh + 32} rx="12" fill="#16052e" opacity="0.45" />
      <rect x={X0 - 13} y={Y0 + fh} width={fw + 26} height="21" rx="6" fill={url(id('rimFront'))} />
      {[1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${X0 - 13 + i * ((fw + 26) / 6)} ${Y0 + fh + 9}v11`} stroke="#2a221a" strokeOpacity="0.5" strokeWidth="1.2" />
      ))}
      <rect x={X0 - 13} y={Y0 - 10} width={fw + 26} height={fh + 21} rx="7" fill={url(id('rimTop'))} />
      <rect x={X0 - 13} y={Y0 - 10} width={fw + 26} height={fh + 21} rx="7" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
      <rect x={X0 - 2} y={Y0 - 2} width={fw + 4} height={fh + 4} rx="3" fill="#3d3328" />
      {tiles}
      {/* danger: the spike row glows red */}
      <rect x={X0 + 2} y={hy + 1} width={fw - 4} height={S * K - 2} rx="3" fill={url(id('danger'))} />
      <rect x={X0} y={hy - 2} width={fw * 0.6} height={S * K + 4} rx="8" fill="#ff1f3d" opacity="0.45" filter={url(id('soft'))} />
      {/* spike slots along the left wall, the hot one open */}
      {[0, 1, 3, 4].map((r) => (
        <rect key={r} x={X0 - 11} y={Y0 + r * S * K + 6} width="7" height={S * K - 12} rx="2" fill="#2a221a" opacity="0.7" />
      ))}
      <rect x={X0 - 12} y={hy + 2} width="10" height={S * K - 4} rx="2" fill="#1a130d" />
      <path d={`M${X0 - 6} ${cy}H${X0 + 110}`} stroke={url(id('streak'))} strokeWidth="9" strokeLinecap="round" opacity="0.5" />
      {spikes.map(([dy, len, s]) => (
        <g key={dy}>
          <rect x={X0 - 10} y={cy + dy - 1.6 * s} width={len - 14} height={3.2 * s} fill="#6b7686" />
          <path d={`M${X0 + len - 34} ${cy + dy - 6.5 * s}L${X0 + len} ${cy + dy}L${X0 + len - 34} ${cy + dy + 6.5 * s}Z`} fill={url(id('steel'))} stroke="#3e4652" strokeWidth="0.6" />
          <path d={`M${X0 + len - 28} ${cy + dy - 2.6 * s}L${X0 + len - 3} ${cy + dy - 0.3}`} stroke="#fff" strokeWidth="1" strokeOpacity="0.9" strokeLinecap="round" />
        </g>
      ))}
      {/* pieces, back to front */}
      <Blob id={id} k="r" x={rx} y={ry + foot} />
      <Heart x={rx - 14} y={ry - 24} />
      <Heart x={rx} y={ry - 27} />
      <Heart x={rx + 14} y={ry - 24} />
      <Crate id={id} x={c1x} y={c1y + foot} />
      <Blob id={id} k="y" x={yx} y={yy + foot} scared />
      <Crate id={id} x={c2x} y={c2y + foot} />
      <Blob id={id} k="b" x={bx} y={by + foot} />
      <Crate id={id} x={c3x} y={c3y + foot} />
      <Spark x={278} y={36} r={8} />
      <Spark x={40} y={150} r={6} fill="#fff6c2" />
      <Spark x={290} y={150} r={5} />
    </g>
  );
}
