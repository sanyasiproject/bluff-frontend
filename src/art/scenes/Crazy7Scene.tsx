// Crazy 7: a big fanned "7" card on a burst, with sparks
import { ART_FONT, Card, SceneBg, Spark, url, type SceneProps } from './common';

const HEART = 'M0 7C-9 1-9-6-4.5-6-2-6 0-4 0-2 0-4 2-6 4.5-6 9-6 9 1 0 7Z';
const SPADE = 'M0-7C-9 0-9 5-4.5 5-2.5 5-1 4-.5 3L-2 8H2L.5 3C1 4 2.5 5 4.5 5 9 5 9 0 0-7Z';
const DIAMOND = 'M0-8L6 0 0 8-6 0Z';

/** a small seven card face: corner 7 and suit, suit in the middle */
function SmallFace({ w, h, suit, color }: { w: number; h: number; suit: string; color: string }) {
  return (
    <>
      <text x="9" y="22" fontFamily={ART_FONT} fontWeight="900" fontSize="16" fill={color}>7</text>
      <path d={suit} fill={color} transform="translate(14 31) scale(0.7)" />
      <path d={suit} fill={color} transform={`translate(${w / 2} ${h / 2}) scale(2)`} />
      <text x={w / 2} y={h / 2 + 34} fontFamily={ART_FONT} fontWeight="900" fontSize="18" fill={color} textAnchor="middle" opacity="0.85">7</text>
    </>
  );
}

export function Crazy7Scene({ id, colors }: SceneProps) {
  const shadow = url(id('shadow'));
  const rays = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const b = a + Math.PI / 28;
    const R = 240;
    return `M160 100L${160 + R * Math.cos(a)} ${100 + R * Math.sin(a)}L${160 + R * Math.cos(b)} ${100 + R * Math.sin(b)}Z`;
  }).join('');
  const W = 98;
  const H = 138;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('face')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffdf7" />
          <stop offset="1" stopColor="#f0eaff" />
        </linearGradient>
        <linearGradient id={id('seven')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ff7a7a" />
          <stop offset="0.55" stopColor="#ff3b5c" />
          <stop offset="1" stopColor="#c2185b" />
        </linearGradient>
        <radialGradient id={id('core')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd75e" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffd75e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={rays} fill="#fff" opacity="0.08" />
      <circle cx="160" cy="100" r="92" fill={url(id('core'))} />
      <Card x={70} y={50} w={80} h={112} rot={-22} fill={url(id('face'))} shadow={shadow}>
        <SmallFace w={80} h={112} suit={SPADE} color="#2a1a6e" />
      </Card>
      <Card x={172} y={50} w={80} h={112} rot={22} fill={url(id('face'))} shadow={shadow}>
        <SmallFace w={80} h={112} suit={DIAMOND} color="#e0245e" />
      </Card>
      <Card x={111} y={28} w={W} h={H} rot={4} fill={url(id('face'))} shadow={shadow}>
        <text x="10" y="24" fontFamily={ART_FONT} fontWeight="900" fontSize="18" fill="#e0245e">7</text>
        <path d={HEART} fill="#e0245e" transform="translate(16 34) scale(0.75)" />
        <g transform={`rotate(180 ${W / 2} ${H / 2})`}>
          <text x="10" y="24" fontFamily={ART_FONT} fontWeight="900" fontSize="18" fill="#e0245e">7</text>
          <path d={HEART} fill="#e0245e" transform="translate(16 34) scale(0.75)" />
        </g>
        {/* the big seven: a dark extrusion, then the face with a gold rim */}
        <text x={W / 2 + 3} y={H / 2 + 38} fontFamily={ART_FONT} fontWeight="900" fontSize="108" fill="#7a0f3a" textAnchor="middle">7</text>
        <text
          x={W / 2}
          y={H / 2 + 34}
          fontFamily={ART_FONT}
          fontWeight="900"
          fontSize="108"
          fill={url(id('seven'))}
          stroke="#ffc531"
          strokeWidth="3"
          strokeLinejoin="round"
          paintOrder="stroke"
          textAnchor="middle"
        >
          7
        </text>
        <path d={`M${W / 2 - 24} ${H / 2 - 30}H${W / 2 + 8}`} stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
      </Card>
      <Spark x={92} y={34} r={11} fill="#ffe27a" />
      <Spark x={238} y={30} r={8} />
      <Spark x={262} y={150} r={10} fill="#ffe27a" />
      <Spark x={58} y={150} r={7} />
      <Spark x={224} y={176} r={5} />
      <g stroke="#ffe27a" strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <path d="M104 22l-6-9M120 16l-1-10M86 30l-9-5" />
        <path d="M232 156l8 6M224 166l4 9" />
      </g>
    </g>
  );
}
