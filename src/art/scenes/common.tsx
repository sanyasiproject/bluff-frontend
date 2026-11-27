// Shared pieces for the drawn game scenes: ids, backdrop, shadow filter, cards and sparkles (viewBox 320x200, light from top-left)
import { useId, type ReactNode } from 'react';

export type IdFn = (name: string) => string;
export interface SceneProps {
  id: IdFn;
  colors: [string, string];
}

/** unique ids per instance so many tiles on one page never share gradients */
export function useArtIds(): IdFn {
  const base = 'nt' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (name) => `${base}-${name}`;
}

export const url = (id: string) => `url(#${id})`;
export const ART_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** gradient backdrop with a top-left glow, soft rings and a dark lower edge */
export function SceneBg({ id, colors }: SceneProps) {
  return (
    <g>
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.18" cy="0.08" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('vig')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#12062e" stopOpacity="0" />
          <stop offset="1" stopColor="#12062e" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('shadow')} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="3" dy="6" stdDeviation="5" floodColor="#16052e" floodOpacity="0.45" />
        </filter>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="320" height="200" fill={url(id('bg'))} />
      <circle cx="262" cy="34" r="70" fill="#fff" opacity="0.06" />
      <circle cx="262" cy="34" r="44" fill="#fff" opacity="0.06" />
      <circle cx="30" cy="190" r="56" fill="#fff" opacity="0.05" />
      <rect width="320" height="200" fill={url(id('glow'))} />
      <rect width="320" height="200" fill={url(id('vig'))} />
    </g>
  );
}

/** a four-point sparkle; twinkles with the nt-spark class */
export function Spark({ x, y, r, fill = '#fff' }: { x: number; y: number; r: number; fill?: string }) {
  const k = r * 0.28;
  return (
    <path
      className="nt-spark"
      d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`}
      fill={fill}
    />
  );
}

/** a playing card at (x, y) turned by rot around its centre; children draw on the face (0,0 to w,h) */
export function Card({
  x, y, w = 64, h = 92, rot = 0, fill, edge = '#ffffff', shadow, sheen, children,
}: {
  x: number; y: number; w?: number; h?: number; rot?: number; fill: string; edge?: string; shadow?: string; sheen?: string; children?: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`} filter={shadow}>
      <rect width={w} height={h} rx={w * 0.14} fill={edge} />
      <rect x={w * 0.06} y={w * 0.06} width={w * 0.88} height={h - w * 0.12} rx={w * 0.09} fill={fill} />
      {children}
      {sheen && <rect width={w} height={h} rx={w * 0.14} fill={sheen} opacity="0.7" />}
      <rect width={w} height={h} rx={w * 0.14} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" />
      <path d={`M${w * 0.14} 1.5H${w * 0.86}`} stroke="#fff" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}
