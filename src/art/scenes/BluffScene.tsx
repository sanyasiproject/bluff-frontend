// Bluff: two face-down cards and one face-up card with a sly mask
import { ART_FONT, Card, SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

const W = 86;
const H = 122;

function CardBack({ id }: { id: IdFn }) {
  return (
    <>
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="6" fill={url(id('lattice'))} />
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="6" fill="none" stroke="#ffd75e" strokeOpacity="0.7" strokeWidth="1.5" />
      <circle cx={W / 2} cy={H / 2} r="15" fill="#2a1a6e" stroke="#ffd75e" strokeWidth="2" />
      <path d={`M${W / 2} ${H / 2 - 9}l7 9-7 9-7-9z`} fill="#ffd75e" />
    </>
  );
}

export function BluffScene({ id, colors }: SceneProps) {
  const shadow = url(id('shadow'));
  const sheen = url(id('sheen'));
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('back')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cff" />
          <stop offset="1" stopColor="#4a1fb8" />
        </linearGradient>
        <pattern id={id('lattice')} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#5b2fd0" />
          <rect width="6" height="6" fill="#7448ef" />
        </pattern>
        <linearGradient id={id('face')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="1" stopColor="#efe8ff" />
        </linearGradient>
        <linearGradient id={id('mask')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c86bff" />
          <stop offset="0.6" stopColor="#ff4fa3" />
          <stop offset="1" stopColor="#c2185b" />
        </linearGradient>
      </defs>
      {/* floating question marks */}
      <g fontFamily={ART_FONT} fontWeight="900" fill="#fff">
        <text x="34" y="62" fontSize="30" opacity="0.18" transform="rotate(-14 34 62)">?</text>
        <text x="268" y="70" fontSize="40" opacity="0.16" transform="rotate(12 268 70)">?</text>
        <text x="282" y="176" fontSize="22" opacity="0.2">?</text>
      </g>
      <Card x={62} y={46} w={W} h={H} rot={-22} fill={url(id('back'))} shadow={shadow} sheen={sheen}>
        <CardBack id={id} />
      </Card>
      <Card x={98} y={34} w={W} h={H} rot={-8} fill={url(id('back'))} shadow={shadow} sheen={sheen}>
        <CardBack id={id} />
      </Card>
      <Card x={150} y={36} w={W} h={H} rot={12} fill={url(id('face'))} shadow={shadow}>
        <text x="11" y="27" fontFamily={ART_FONT} fontWeight="900" fontSize="18" fill="#c2185b">?</text>
        <text x={W - 11} y={H - 12} fontFamily={ART_FONT} fontWeight="900" fontSize="18" fill="#c2185b" textAnchor="end" transform={`rotate(180 ${W - 17} ${H - 18})`}>?</text>
        {/* ribbons behind the mask */}
        <path d="M10 54C2 60 4 72 0 80M76 54C84 60 82 72 86 80" stroke="#8b5cff" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M11 52C18 40 36 42 43 50 50 42 68 40 75 52 78 64 70 76 58 74 50 72 46 66 43 64 40 66 36 72 28 74 16 76 8 64 11 52Z" fill={url(id('mask'))} stroke="#ffc531" strokeWidth="2" strokeLinejoin="round" />
        <path d="M16 50C22 44 32 44 38 49" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* left eye glances sideways, right eye is a sly half-lid */}
        <ellipse cx="28" cy="59" rx="9" ry="6" fill="#1d1250" />
        <ellipse cx="28" cy="59" rx="7" ry="4.4" fill="#fff" />
        <circle cx="32" cy="59.5" r="3.2" fill="#1d1250" />
        <circle cx="31" cy="58.3" r="1" fill="#fff" />
        <ellipse cx="58" cy="59" rx="9" ry="6" fill="#1d1250" />
        <path d="M50 58.5Q58 55 66 58.5Q58 64 50 58.5Z" fill="#fff" />
        <circle cx="61" cy="59.6" r="2.4" fill="#1d1250" />
        <path d="M49 56.5Q58 53 67 56.5" stroke="#1d1250" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="43" cy="44" r="3" fill="#ffc531" />
        <path d="M31 90Q43 99 57 86" stroke="#2a1a6e" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M55 84.5l4 1.5" stroke="#2a1a6e" strokeWidth="2.4" strokeLinecap="round" />
      </Card>
      <Spark x={248} y={40} r={9} />
      <Spark x={54} y={160} r={6} fill="#fff6c2" />
      <Spark x={142} y={24} r={5} />
    </g>
  );
}
