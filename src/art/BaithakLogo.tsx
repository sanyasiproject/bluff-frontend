// Game Baithak mark: a glossy violet-pink app icon with a card, a die and a goti; and the wordmark
import { ART_FONT, Card, url, useArtIds } from './scenes/common';
import { Die, Goti } from './scenes/pieces';

export interface LogoProps {
  /** pixel size: the icon's width and height, or the wordmark's height */
  size?: number;
  className?: string;
  /** accessible name; omitted = decorative */
  title?: string;
}

const a11y = (title?: string) =>
  title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };

const HEART = 'M0 7C-9 1-9-6-4.5-6-2-6 0-4 0-2 0-4 2-6 4.5-6 9-6 9 1 0 7Z';

export function BaithakLogo({ size = 64, className, title }: LogoProps) {
  const id = useArtIds();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" focusable="false" {...a11y(title)}>
      <defs>
        <linearGradient id={id('tile')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a77bff" />
          <stop offset="0.5" stopColor="#8b5cff" />
          <stop offset="1" stopColor="#ff4fa3" />
        </linearGradient>
        <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="0.3" cy="0.25" r="0.8">
          <stop offset="0" stopColor="#ffd6f5" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffd6f5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('face')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="1" stopColor="#efe8ff" />
        </linearGradient>
        <filter id={id('lsh')} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="1.5" dy="3" stdDeviation="2.5" floodColor="#2a0a4a" floodOpacity="0.45" />
        </filter>
        <clipPath id={id('clip')}>
          <rect x="6" y="6" width="108" height="108" rx="28" />
        </clipPath>
      </defs>
      {/* tile: drop edge, face, glow, then the pieces, then gloss and rim */}
      <rect x="6" y="10" width="108" height="108" rx="28" fill="#4a1a8a" />
      <rect x="6" y="6" width="108" height="108" rx="28" fill={url(id('tile'))} />
      <g clipPath={url(id('clip'))}>
        <rect x="6" y="6" width="108" height="108" fill={url(id('glow'))} />
        <circle cx="96" cy="26" r="26" fill="#fff" opacity="0.08" />
        <Card x={26} y={20} w={42} h={58} rot={-16} fill={url(id('face'))} shadow={url(id('lsh'))}>
          <text x="6" y="15" fontFamily={ART_FONT} fontWeight="900" fontSize="11" fill="#e0245e">A</text>
          <path d={HEART} fill="#e0245e" transform="translate(21 31) scale(1.25)" />
        </Card>
        <g filter={url(id('lsh'))}>
          <Die id={id} k="l" x={60} y={50} s={0.6} rot={12} />
        </g>
        <Goti id={id} k="l" x={44} y={100} s={0.82} light="#ffe07a" dark="#e08a00" />
        <path d="M6 6h108v44C80 38 40 38 6 50z" fill={url(id('gloss'))} opacity="0.6" />
      </g>
      <rect x="7" y="7" width="106" height="106" rx="27" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
    </svg>
  );
}

export function BaithakWordmark({ size = 40, className, title = 'Game Baithak' }: LogoProps) {
  const id = useArtIds();
  return (
    <svg className={className} height={size} width={(size * 420) / 72} viewBox="0 0 420 72" focusable="false" {...a11y(title)}>
      <defs>
        <linearGradient id={id('ink')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fff2c4" />
          <stop offset="1" stopColor="#ffc531" />
        </linearGradient>
        <filter id={id('glow')} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
          <feFlood floodColor="#ff4fd8" floodOpacity="0.55" />
          <feComposite in2="b" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={url(id('glow'))} fontFamily={ART_FONT} fontWeight="900" fontSize="52" textAnchor="middle">
        <text x="211" y="55" textLength="396" lengthAdjust="spacingAndGlyphs" fill="#2a1a6e" stroke="#2a1a6e" strokeWidth="8" strokeLinejoin="round">
          Game Baithak
        </text>
        <text x="210" y="52" textLength="396" lengthAdjust="spacingAndGlyphs" fill={url(id('ink'))} stroke="#5b2fd0" strokeWidth="1.5" paintOrder="stroke">
          Game Baithak
        </text>
      </g>
    </svg>
  );
}
