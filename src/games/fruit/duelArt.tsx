// Fruit Slice Duel's own art: the talwar (curved sword) in a player's colour, the magnet, and the item on the plate (whole, or cut in two with juice)
import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { FruitItemKind } from '../../types';
import { FLESH, fruitSvg } from './art';

/** a talwar lying along +x: hilt at the left, the curved blade's tip at the right (viewBox 200×60) */
export function Talwar({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 60" className="fd-talwar" aria-hidden>
      <defs>
        <linearGradient id="fd-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor="#cfd8dc" />
          <stop offset="1" stopColor="#78909c" />
        </linearGradient>
      </defs>
      {/* the blade: wide near the guard, curving up to a sharp tip */}
      <path d="M58 26 C100 22 150 22 196 8 C170 30 120 40 58 38 Z" fill="url(#fd-steel)" stroke="#455a64" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M62 30 C110 28 150 26 186 14" stroke="#fff" strokeWidth="2" fill="none" opacity=".8" strokeLinecap="round" />
      {/* the guard and grip in the player's colour */}
      <rect x="50" y="14" width="10" height="34" rx="4" fill={color} stroke="#1a1030" strokeWidth="2" />
      <rect x="14" y="25" width="38" height="12" rx="6" fill={color} stroke="#1a1030" strokeWidth="2" />
      <path d="M20 25v12M28 25v12M36 25v12M44 25v12" stroke="#1a1030" strokeWidth="1.5" opacity=".5" />
      <circle cx="10" cy="31" r="8" fill="#ffd740" stroke="#1a1030" strokeWidth="2" />
    </svg>
  );
}

/** the big red-and-silver horseshoe magnet */
export function MagnetArt() {
  return (
    <svg viewBox="0 0 100 100" className="fd-magnet-art" aria-hidden>
      <defs>
        <linearGradient id="fd-mag" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b71c1c" />
          <stop offset=".35" stopColor="#ff5252" />
          <stop offset="1" stopColor="#b71c1c" />
        </linearGradient>
        <linearGradient id="fd-tip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#90a4ae" />
          <stop offset=".4" stopColor="#ffffff" />
          <stop offset="1" stopColor="#78909c" />
        </linearGradient>
      </defs>
      <path d="M18 62 V44 a32 32 0 0 1 64 0 V62 H62 V44 a12 12 0 0 0 -24 0 V62 Z" fill="url(#fd-mag)" stroke="#5a0000" strokeWidth="3" strokeLinejoin="round" />
      <rect x="18" y="62" width="20" height="18" rx="2" fill="url(#fd-tip)" stroke="#37474f" strokeWidth="3" />
      <rect x="62" y="62" width="20" height="18" rx="2" fill="url(#fd-tip)" stroke="#37474f" strokeWidth="3" />
      <path d="M26 40 a24 24 0 0 1 20 -18" stroke="#fff" strokeWidth="4" fill="none" opacity=".55" strokeLinecap="round" />
      <g stroke="#ffd740" strokeWidth="3" strokeLinecap="round" className="fd-spark">
        <path d="M10 86l-6 6M28 90v8M72 90v8M90 86l6 6" />
      </g>
    </svg>
  );
}

const svgHtml = (kind: Exclude<FruitItemKind, 'magnet'>) => ({ __html: fruitSvg(kind) });

/** the item on the plate: whole and popping in, or (cut) two halves flying apart with a juice splash */
export function PlateItem({ kind, cut, angle = 0 }: { kind: FruitItemKind; cut?: boolean; angle?: number }) {
  if (kind === 'magnet') {
    return (
      <div className={cx('fd-item fd-magnet', cut && 'zapped')}>
        <MagnetArt />
        <b className="fd-dont">✋ Don't cut!</b>
      </div>
    );
  }
  if (!cut) return <div className="fd-item fd-fruit" dangerouslySetInnerHTML={svgHtml(kind)} />;
  const juice = FLESH[kind].juice;
  return (
    <div className="fd-item fd-cut" style={{ '--juice': juice, '--face': FLESH[kind].face, '--cut': `${angle}deg` } as CSSProperties}>
      <i className="fd-splash" />
      <span className="fd-halves">
        <span className="fd-half a" dangerouslySetInnerHTML={svgHtml(kind)} />
        <span className="fd-half b" dangerouslySetInnerHTML={svgHtml(kind)} />
      </span>
      {Array.from({ length: 8 }, (_, i) => (
        <i key={i} className="fd-drop" style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}
