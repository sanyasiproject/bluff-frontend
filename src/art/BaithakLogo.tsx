// Game Baithak mark: a Ludo die, a goti and a playing card on a round baithak mat, with a phone badge per app; and the wordmark
import { ART_FONT, Card, url, useArtIds, type IdFn } from './scenes/common';
import { Die, Goti } from './scenes/pieces';
import { APP_VARIANT, type AppVariant } from './appVariant';

export type { AppVariant } from './appVariant';

export interface LogoProps {
  /** pixel size: the icon's width and height, or the wordmark's height */
  size?: number;
  className?: string;
  /** accessible name; omitted = decorative */
  title?: string;
  /** phone badge: turned sideways (wide) or standing up (upright); default is this app's */
  variant?: AppVariant;
}

const a11y = (title?: string) =>
  title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };

const HEART = 'M0 7C-9 1-9-6-4.5-6-2-6 0-4 0-2 0-4 2-6 4.5-6 9-6 9 1 0 7Z';
/** the mat's border motif: 16 little diamonds round the rim */
const DIAMONDS = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

/** the round baithak mat: maroon edge, gold patterned border, saffron field with a soft rangoli */
function Mat({ id }: { id: IdFn }) {
  return (
    <g>
      <defs>
        <radialGradient id={id('field')} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="0.55" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#d9480f" />
        </radialGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.5" stopColor="#f5b82e" />
          <stop offset="1" stopColor="#b8730c" />
        </linearGradient>
        <radialGradient id={id('shine')} cx="0.3" cy="0.2" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="110" rx="44" ry="6" fill="#1a0510" opacity="0.35" />
      <circle cx="60" cy="61" r="52" fill="#5e0f24" />
      <circle cx="60" cy="58" r="52" fill="#8e1838" />
      <circle cx="60" cy="58" r="46" fill={url(id('rim'))} />
      <g fill="#8e1838">
        {DIAMONDS.map((a) => (
          <path key={a} d="M60 13.5l2.6 3.2-2.6 3.2-2.6-3.2z" transform={`rotate(${a} 60 58)`} />
        ))}
      </g>
      <circle cx="60" cy="58" r="38" fill="#8e1838" />
      <circle cx="60" cy="58" r="36" fill={url(id('field'))} />
      <g fill="none" stroke="#fff3c4" strokeOpacity="0.5" strokeWidth="1.6">
        <circle cx="60" cy="58" r="30" strokeDasharray="1.5 4.2" strokeLinecap="round" />
        <path d="M60 36c6 8 6 14 0 22-6-8-6-14 0-22zM82 58c-8 6-14 6-22 0 8-6 14-6 22 0zM60 80c-6-8-6-14 0-22 6 8 6 14 0 22zM38 58c8-6 14-6 22 0-8 6-14 6-22 0z" />
      </g>
      <circle cx="60" cy="58" r="52" fill={url(id('shine'))} />
      <circle cx="60" cy="58" r="51" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" />
    </g>
  );
}

/** a small phone at the lower right: sideways for the wide app, standing for the upright one */
function PhoneBadge({ id, variant }: { id: IdFn; variant: AppVariant }) {
  const wide = variant === 'wide';
  const w = wide ? 44 : 28;
  const h = wide ? 28 : 44;
  const x = 97 - w / 2;
  const y = 94 - h / 2;
  return (
    <g filter={url(id('lsh'))}>
      <defs>
        <linearGradient id={id('scr')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3ee6ff" />
          <stop offset="1" stopColor="#7c4dff" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx="7" fill="#1b1035" stroke="#fff" strokeWidth="3.5" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="2.5" fill={url(id('scr'))} />
      {wide ? (
        <g>
          <circle cx={x + w - 3.2} cy={y + h / 2} r="1.1" fill="#fff" opacity="0.7" />
          <path d={`M${x + 17.5} ${y + 8.5}l11 5.5-11 5.5z`} fill="#fff" />
        </g>
      ) : (
        <g>
          <circle cx={x + w / 2} cy={y + h - 3.2} r="1.1" fill="#fff" opacity="0.7" />
          <path d={`M${x + 10} ${y + 16}l10 6-10 6z`} fill="#fff" />
        </g>
      )}
      <path d={`M${x + 5} ${y + 5}h${w * 0.4}`} stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  );
}

export function BaithakLogo({ size = 64, className, title, variant = APP_VARIANT }: LogoProps) {
  const id = useArtIds();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 120 120" focusable="false" {...a11y(title)}>
      <defs>
        <linearGradient id={id('face')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="1" stopColor="#f3e9d8" />
        </linearGradient>
        <filter id={id('lsh')} x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="1.2" dy="2.6" stdDeviation="2" floodColor="#3a0614" floodOpacity="0.5" />
        </filter>
      </defs>
      <Mat id={id} />
      <Card x={20} y={19} w={38} h={53} rot={-15} fill={url(id('face'))} shadow={url(id('lsh'))}>
        <text x="5" y="12.5" fontFamily={ART_FONT} fontWeight="900" fontSize="10" fill="#d81b4a">A</text>
        <path d={HEART} fill="#d81b4a" transform="translate(19 30) scale(1.35)" />
      </Card>
      <g filter={url(id('lsh'))}>
        <Die id={id} k="l" x={55} y={34} s={0.6} rot={10} />
      </g>
      <Goti id={id} k="l" x={45} y={97} s={0.86} light="#7cc7ff" dark="#1565e0" />
      <PhoneBadge id={id} variant={variant} />
    </svg>
  );
}

const TAG: Record<AppVariant, string> = { wide: 'WIDE', upright: 'UPRIGHT' };

export function BaithakWordmark({ size = 40, className, title = 'Game Baithak', variant = APP_VARIANT, showVariant = false }: LogoProps & { showVariant?: boolean }) {
  const id = useArtIds();
  const tagW = variant === 'wide' ? 128 : 200;
  const vw = showVariant ? 420 + tagW + 10 : 420;
  return (
    <svg className={className} height={size} width={(size * vw) / 72} viewBox={`0 0 ${vw} 72`} focusable="false" {...a11y(title)}>
      <defs>
        <linearGradient id={id('ink')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#fff2c4" />
          <stop offset="1" stopColor="#ffc531" />
        </linearGradient>
        <linearGradient id={id('tag')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a2e" />
          <stop offset="1" stopColor="#e0245e" />
        </linearGradient>
        <filter id={id('glow')} x="-10%" y="-40%" width="120%" height="180%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
          <feFlood floodColor="#ff8a3d" floodOpacity="0.5" />
          <feComposite in2="b" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={url(id('glow'))} fontFamily={ART_FONT} fontWeight="900" fontSize="52" textAnchor="middle">
        <text x="211" y="55" textLength="396" lengthAdjust="spacingAndGlyphs" fill="#4a0d22" stroke="#4a0d22" strokeWidth="8" strokeLinejoin="round">
          Game Baithak
        </text>
        <text x="210" y="52" textLength="396" lengthAdjust="spacingAndGlyphs" fill={url(id('ink'))} stroke="#8e1838" strokeWidth="1.5" paintOrder="stroke">
          Game Baithak
        </text>
      </g>
      {showVariant && (
        <g transform="translate(430 12)">
          <rect width={tagW} height="48" rx="24" fill={url(id('tag'))} stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />
          <text x={tagW / 2} y="35" textAnchor="middle" fontFamily={ART_FONT} fontWeight="900" fontSize="31" letterSpacing="1.5" fill="#fff">
            {TAG[variant]}
          </text>
        </g>
      )}
    </svg>
  );
}
