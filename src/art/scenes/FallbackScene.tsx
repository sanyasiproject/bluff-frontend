// Any game without its own drawing: its emoji, big, on a patterned gradient
import { SceneBg, Spark, url, type SceneProps } from './common';

export function FallbackScene({ id, colors, emoji }: SceneProps & { emoji: string }) {
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <pattern id={id('dots')} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="5" cy="5" r="2.2" fill="#fff" opacity="0.16" />
          <circle cx="16" cy="16" r="1.4" fill="#fff" opacity="0.1" />
        </pattern>
        <radialGradient id={id('disc')} cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      <rect width="320" height="200" fill={url(id('dots'))} />
      <circle cx="160" cy="100" r="66" fill="#16052e" opacity="0.25" transform="translate(5 8)" />
      <circle cx="160" cy="100" r="66" fill={url(id('disc'))} stroke="#fff" strokeOpacity="0.4" strokeWidth="2" />
      <text x="160" y="100" fontSize="76" textAnchor="middle" dominantBaseline="central" filter={url(id('shadow'))}>
        {emoji}
      </text>
      <Spark x={246} y={46} r={9} />
      <Spark x={74} y={156} r={7} fill="#fff6c2" />
    </g>
  );
}
