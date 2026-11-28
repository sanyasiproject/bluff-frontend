// Fruit Slice Duel's own art: a real curved talwar (steel blade, brass hilt, the grip in the player's colour), the magnet, and the item on the plate (whole, or cut in two with juice)
import { useId, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { FruitItemKind } from '../../types';
import { FLESH } from './art';
import { faceSvg, wholeSvg, type DuelFruit } from './duelFruit';

/** a talwar lying along +x: disc pommel at the left, the curved blade's tip at the right (viewBox 240×64) */
export function Talwar({ color }: { color: string }) {
  const id = useId().replace(/:/g, '');
  const steel = `${id}s`;
  const brass = `${id}b`;
  return (
    <svg viewBox="0 0 240 64" className="fd-talwar" aria-hidden>
      <defs>
        <linearGradient id={steel} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".3" stopColor="#d4dde3" />
          <stop offset=".62" stopColor="#7f8e98" />
          <stop offset=".8" stopColor="#e9eef1" />
          <stop offset="1" stopColor="#9aa8b1" />
        </linearGradient>
        <linearGradient id={brass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset=".45" stopColor="#e0ad3c" />
          <stop offset="1" stopColor="#7a4d0e" />
        </linearGradient>
      </defs>
      {/* the blade: broad at the guard, curving up to a sharp tip */}
      <path d="M58 23C112 23 172 20 237 4C208 35 140 45 58 44Z" fill={`url(#${steel})`} stroke="#3f4d56" strokeWidth="1.3" strokeLinejoin="round" />
      {/* the fuller groove and the polished highlight along the back */}
      <path d="M64 29.5C112 29 160 26.5 206 15" stroke="#6b7a84" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M64 26C114 25.6 168 23 224 9" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".95" />
      {/* the edge bevel catching the light */}
      <path d="M70 42C136 41.4 192 31 231 8" stroke="#f4f8fa" strokeWidth="1.4" fill="none" opacity=".8" />
      {/* langets, guard with rounded quillons */}
      <path d="M56 26h14l-14 5z M56 41h14l-14-5z" fill={`url(#${brass})`} />
      <rect x="50" y="15" width="9" height="37" rx="3.5" fill={`url(#${brass})`} stroke="#5a3608" strokeWidth="1.2" />
      <circle cx="54.5" cy="14" r="4.6" fill={`url(#${brass})`} stroke="#5a3608" strokeWidth="1.1" />
      <circle cx="54.5" cy="53" r="4.6" fill={`url(#${brass})`} stroke="#5a3608" strokeWidth="1.1" />
      {/* the knuckle guard: a brass bar from the guard back to the pommel */}
      <path d="M55 55C46 63 24 63 13 49" stroke={`url(#${brass})`} strokeWidth="4.4" fill="none" strokeLinecap="round" />
      {/* the grip, bulging in the middle, wrapped in the player's colour with brass bands */}
      <path d="M17 28C28 24 40 24 51 27.5V39.5C40 43 28 43 17 39Z" fill={color} stroke="#1a1030" strokeWidth="1.4" />
      <path d="M23 26.5v14M34 25v17M45 26v15" stroke={`url(#${brass})`} strokeWidth="2.8" />
      <path d="M18 30C29 27 40 27 50 29.5" stroke="#fff" strokeWidth="1" opacity=".35" fill="none" />
      {/* the disc pommel and its little knob */}
      <ellipse cx="12" cy="33.5" rx="6.5" ry="17" fill={`url(#${brass})`} stroke="#5a3608" strokeWidth="1.2" />
      <ellipse cx="10.5" cy="28" rx="2" ry="7.5" fill="#fff6cc" opacity=".7" />
      <circle cx="4.5" cy="33.5" r="4" fill={`url(#${brass})`} stroke="#5a3608" strokeWidth="1" />
    </svg>
  );
}

/** the big shiny red-and-silver horseshoe magnet */
export function MagnetArt() {
  return (
    <svg viewBox="0 0 100 100" className="fd-magnet-art" aria-hidden>
      <defs>
        <linearGradient id="fd-mag" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7f0000" />
          <stop offset=".22" stopColor="#ff6e6e" />
          <stop offset=".4" stopColor="#e53935" />
          <stop offset=".75" stopColor="#c62828" />
          <stop offset="1" stopColor="#6d0000" />
        </linearGradient>
        <linearGradient id="fd-tip" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#78909c" />
          <stop offset=".35" stopColor="#ffffff" />
          <stop offset=".6" stopColor="#cfd8dc" />
          <stop offset="1" stopColor="#546e7a" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="90" rx="30" ry="5" fill="#000" opacity=".22" />
      <path d="M18 62 V44 a32 32 0 0 1 64 0 V62 H62 V44 a12 12 0 0 0 -24 0 V62 Z" fill="url(#fd-mag)" stroke="#4a0000" strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="18" y="62" width="20" height="18" rx="2" fill="url(#fd-tip)" stroke="#37474f" strokeWidth="2.6" />
      <rect x="62" y="62" width="20" height="18" rx="2" fill="url(#fd-tip)" stroke="#37474f" strokeWidth="2.6" />
      <path d="M25 42 a25 25 0 0 1 19 -19" stroke="#fff" strokeWidth="4" fill="none" opacity=".7" strokeLinecap="round" />
      <path d="M22 66v10M66 66v10" stroke="#fff" strokeWidth="2.4" opacity=".85" strokeLinecap="round" />
      <g stroke="#ffd740" strokeWidth="3" strokeLinecap="round" className="fd-spark">
        <path d="M10 86l-6 6M28 90v8M72 90v8M90 86l6 6" />
      </g>
    </svg>
  );
}

const html = (s: string) => ({ __html: s });

/** the item on the plate: whole and popping in, or (cut) two halves split along the blade's line, showing the inside, with juice */
export function PlateItem({ kind, cut, angle = 0 }: { kind: FruitItemKind; cut?: boolean; angle?: number }) {
  if (kind === 'magnet') {
    return (
      <div className={cx('fd-item fd-magnet', cut && 'zapped')}>
        <MagnetArt />
        <b className="fd-dont">✋ Don't cut!</b>
      </div>
    );
  }
  const fruit = kind as DuelFruit;
  if (!cut) return <div className="fd-item fd-fruit" dangerouslySetInnerHTML={html(wholeSvg(fruit))} />;
  return (
    <div className="fd-item fd-cut" style={{ '--juice': FLESH[fruit].juice, '--face': FLESH[fruit].face, '--cut': `${angle}deg` } as CSSProperties}>
      <i className="fd-splat" />
      <i className="fd-splash" />
      <span className="fd-halves">
        <span className="fd-half a">
          <span className="fd-skin" dangerouslySetInnerHTML={html(wholeSvg(fruit))} />
          <span className="fd-face" dangerouslySetInnerHTML={html(faceSvg(fruit))} />
        </span>
        <span className="fd-half b">
          <span className="fd-skin" dangerouslySetInnerHTML={html(wholeSvg(fruit))} />
          <span className="fd-face" dangerouslySetInnerHTML={html(faceSvg(fruit))} />
        </span>
        <i className="fd-cutline" />
      </span>
      {Array.from({ length: 12 }, (_, i) => (
        <i key={i} className="fd-drop" style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  );
}

/** a slash across the plate: a curved streak with a white core and a glow in the striker's colour, along the blade's path */
export function Slash({ color, angle, delay, flip }: { color: string; angle: number; delay: number; flip: boolean }) {
  return (
    <i className={cx('fd-slash', flip && 'flip')} style={{ '--c': color, '--sa': `${angle}deg`, '--sd': `${delay}ms` } as CSSProperties}>
      <svg viewBox="0 0 200 80" aria-hidden>
        <path d="M4 58 Q100 -6 196 50 Q100 18 4 58 Z" fill={color} opacity=".55" />
        <path d="M14 54 Q100 4 188 48 Q100 22 14 54 Z" fill="#fff" />
      </svg>
    </i>
  );
}
