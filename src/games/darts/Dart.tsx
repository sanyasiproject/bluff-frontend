// A dart stuck in the board (tip at the spot, barrel and flights towards you, lower right), flying in when it's new
import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { BOARD_SPAN } from './DartBoard';

interface Props {
  x: number;
  y: number;
  color: string;
  /** just thrown: flies in, thuds and wobbles */
  fresh: boolean;
  /** a bust: the turn's darts go grey */
  dead?: boolean;
  /** a little turn so three darts in one bed don't sit on top of each other */
  tilt: number;
}

/** board units → share of the board box */
export const toPct = (v: number) => `${((v + BOARD_SPAN) / (BOARD_SPAN * 2)) * 100}%`;

export function StuckDart({ x, y, color, fresh, dead, tilt }: Props) {
  return (
    <span className={cx('da-dart', fresh && 'fresh', dead && 'dead')} style={{ left: toPct(x), top: toPct(-y), ['--c' as string]: color, ['--tilt' as string]: `${tilt}deg` } as CSSProperties}>
      <span className="da-dart-in">
        <svg viewBox="-4 -4 64 64" aria-hidden>
          <ellipse cx="2" cy="3" rx="3" ry="1.6" fill="#000" opacity="0.35" />
          <path d="M0 0L7 5.5L5.6 7Z" fill="#d7dde2" />
          <path d="M6 4L22 16L19 19.5L4 7.6Z" fill="url(#dt-barrel)" />
          <path d="M9.6 7.6L8 9.4M13 10.2L11.4 12M16.4 12.8L14.8 14.6" stroke="#455a64" strokeWidth="1" />
          <path d="M21 17.5L33 27" stroke="#eceff1" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M30 24L50 22L54 27L36 31Z" fill="var(--c)" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M30 26L36 46L31 50L28 32Z" fill="var(--c)" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M31 26L52 26" stroke="#000" strokeOpacity="0.2" strokeWidth="1" />
          <defs>
            <linearGradient id="dt-barrel" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f7f9fa" />
              <stop offset="0.5" stopColor="#9aa7ad" />
              <stop offset="1" stopColor="#4b585e" />
            </linearGradient>
          </defs>
        </svg>
      </span>
    </span>
  );
}
