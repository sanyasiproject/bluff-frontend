// Duotone icons: a soft currentColor back layer, currentColor lines and one accent colour (24x24)
import type { ReactNode } from 'react';

export type IconName =
  | 'missions' | 'league' | 'shop' | 'spin' | 'friends' | 'howto' | 'profile'
  | 'coins' | 'gem' | 'xp' | 'play' | 'back' | 'settings';

export interface IconProps {
  name: IconName;
  /** pixel width and height (default 24) */
  size?: number;
  className?: string;
  /** accent colour (default: the icon's own) */
  accent?: string;
  /** accessible name; omitted = decorative */
  title?: string;
}

// back layer and line styles as attributes (no <style>, so the CSP never matters)
const B = { fill: 'currentColor', opacity: 0.28 } as const;
const L = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const GOLD = '#ffc531';
const PINK = '#ff4fa3';
const CYAN = '#3ee6ff';
const LIME = '#9dff5a';

// gear outline: 8 teeth around the centre
const GEAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (const [r, d] of [[7.4, -0.3], [9.8, -0.17], [9.8, 0.17], [7.4, 0.3]] as const) {
      pts.push(`${(12 + r * Math.cos(a + d)).toFixed(2)} ${(12 + r * Math.sin(a + d)).toFixed(2)}`);
    }
  }
  return `M${pts.join('L')}Z`;
})();

const ICONS: Record<IconName, { accent: string; draw: (a: string) => ReactNode }> = {
  missions: {
    accent: PINK,
    draw: (a) => (
      <>
        <circle cx="12" cy="12" r="9" {...B} />
        <circle cx="12" cy="12" r="9" {...L} />
        <circle cx="12" cy="12" r="5" {...L} />
        <circle cx="12" cy="12" r="2.2" fill={a} />
        <path d="M12 12L19.5 4.5" stroke={a} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M17 3.2l3 1.3 1.3 3" stroke={a} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
  },
  league: {
    accent: GOLD,
    draw: (a) => (
      <>
        <path d="M7 3.5h10V9a5 5 0 0 1-10 0z" {...B} />
        <path d="M7 3.5h10V9a5 5 0 0 1-10 0z" {...L} />
        <path d="M7 5.5H4.2a3 3 0 0 0 3.2 4.4M17 5.5h2.8a3 3 0 0 1-3.2 4.4M12 14v3.5M8 20.5h8" {...L} />
        <path d="M12 5.6l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill={a} />
      </>
    ),
  },
  shop: {
    accent: CYAN,
    draw: (a) => (
      <>
        <path d="M4.5 8.5h15l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.2a1.5 1.5 0 0 1-1.5-1.3z" {...B} />
        <path d="M4.5 8.5h15l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.2a1.5 1.5 0 0 1-1.5-1.3z" {...L} />
        <path d="M9 11V7a3 3 0 0 1 6 0v4" {...L} />
        <circle cx="9" cy="11.2" r="1.4" fill={a} />
        <circle cx="15" cy="11.2" r="1.4" fill={a} />
      </>
    ),
  },
  spin: {
    accent: LIME,
    draw: (a) => (
      <>
        <circle cx="12" cy="13" r="8.5" {...B} />
        <path d="M12 13V4.5A8.5 8.5 0 0 1 19.4 8.8zM12 13l-7.4 4.2A8.5 8.5 0 0 1 4.6 8.8z" fill={a} opacity="0.75" />
        <circle cx="12" cy="13" r="8.5" {...L} />
        <path d="M12 4.5v17M4.6 8.8l14.8 8.4M19.4 8.8L4.6 17.2" {...L} strokeWidth="1.4" />
        <circle cx="12" cy="13" r="2" fill={a} stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 6.2L9.6 1.8h4.8z" fill={a} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </>
    ),
  },
  friends: {
    accent: LIME,
    draw: (a) => (
      <>
        <circle cx="16.2" cy="8" r="3" {...B} />
        <path d="M11 20.5a5.2 5.2 0 0 1 10.4 0z" {...B} />
        <circle cx="9" cy="8.5" r="3.5" {...L} />
        <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" {...L} />
        <circle cx="19.5" cy="4.2" r="2.2" fill={a} />
      </>
    ),
  },
  howto: {
    accent: PINK,
    draw: (a) => (
      <>
        <path d="M2.5 5.5C6 4.3 9.2 4.6 12 6.6v13.2c-2.8-2-6-2.3-9.5-1.1zM21.5 5.5C18 4.3 14.8 4.6 12 6.6v13.2c2.8-2 6-2.3 9.5-1.1z" {...B} />
        <path d="M2.5 5.5C6 4.3 9.2 4.6 12 6.6v13.2c-2.8-2-6-2.3-9.5-1.1zM21.5 5.5C18 4.3 14.8 4.6 12 6.6v13.2c2.8-2 6-2.3 9.5-1.1z" {...L} />
        <path d="M15.5 5.2v6.5l1.8-1.3 1.8 1.3V4.8" fill={a} />
      </>
    ),
  },
  profile: {
    accent: CYAN,
    draw: (a) => (
      <>
        <circle cx="12" cy="12" r="9.5" {...B} />
        <circle cx="12" cy="9.5" r="3.6" fill={a} stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.6 18.6a7.2 7.2 0 0 1 12.8 0" {...L} />
        <circle cx="12" cy="12" r="9.5" {...L} />
      </>
    ),
  },
  coins: {
    accent: GOLD,
    draw: (a) => (
      <>
        <circle cx="15" cy="9" r="6" fill={a} opacity="0.5" />
        <circle cx="15" cy="9" r="6" {...L} strokeWidth="1.5" />
        <circle cx="10" cy="14" r="7" fill={a} />
        <circle cx="10" cy="14" r="7" {...L} strokeWidth="1.5" />
        <circle cx="10" cy="14" r="4.3" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.3" />
        <path d="M6.2 11.4a4.6 4.6 0 0 1 3-2" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  gem: {
    accent: CYAN,
    draw: (a) => (
      <>
        <path d="M6.5 4h11l4 5.2L12 21 2.5 9.2z" fill={a} />
        <path d="M6.5 4h11l4 5.2H2.5z" fill="#fff" opacity="0.35" />
        <path d="M2.5 9.2h19M9.2 4L7.4 9.2 12 21l4.6-11.8L14.8 4" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
        <path d="M6.5 4h11l4 5.2L12 21 2.5 9.2z" {...L} strokeWidth="1.5" />
      </>
    ),
  },
  xp: {
    accent: LIME,
    draw: (a) => (
      <>
        <circle cx="12" cy="12" r="9.5" {...B} />
        <circle cx="12" cy="12" r="9.5" {...L} />
        <path d="M13.2 4.5L7 13.2h4.4L10.6 19.5l6.4-8.8h-4.4z" fill={a} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </>
    ),
  },
  play: {
    accent: '#ffffff',
    draw: (a) => (
      <>
        <path d="M7.5 4.8v14.4a1.2 1.2 0 0 0 1.8 1l11.4-7.2a1.2 1.2 0 0 0 0-2L9.3 3.8a1.2 1.2 0 0 0-1.8 1z" fill="currentColor" />
        <path d="M9.4 7.2v3.4" stroke={a} strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  back: {
    accent: CYAN,
    draw: () => (
      <>
        <circle cx="12" cy="12" r="10" {...B} />
        <path d="M13.8 6.5L8.3 12l5.5 5.5" {...L} strokeWidth="2.6" />
      </>
    ),
  },
  settings: {
    accent: CYAN,
    draw: (a) => (
      <>
        <path d={GEAR} {...B} />
        <path d={GEAR} {...L} strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3" fill={a} stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
  },
};

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({ name, size = 24, className, accent, title }: IconProps) {
  const icon = ICONS[name];
  return (
    <svg
      className={className ? `nt-icon ${className}` : 'nt-icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      {icon.draw(accent ?? icon.accent)}
    </svg>
  );
}
