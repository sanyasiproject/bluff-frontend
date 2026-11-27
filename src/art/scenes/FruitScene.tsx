// Fruit Slice Duel: wooden boards behind, a watermelon cut in two with juice, an orange and a bomb, a glowing blade swoosh
import { SceneBg, Spark, url, type SceneProps } from './common';

export function FruitScene({ id, colors }: SceneProps) {
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('wood')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a5a2b" />
          <stop offset="1" stopColor="#4e2f12" />
        </linearGradient>
        <radialGradient id={id('rind')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#8ee26a" />
          <stop offset="0.6" stopColor="#2f9a3a" />
          <stop offset="1" stopColor="#14581e" />
        </radialGradient>
        <radialGradient id={id('flesh')} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#ff8a95" />
          <stop offset="1" stopColor="#e0283a" />
        </radialGradient>
        <radialGradient id={id('orange')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffe0a3" />
          <stop offset="0.3" stopColor="#ffab2e" />
          <stop offset="1" stopColor="#e06a00" />
        </radialGradient>
        <radialGradient id={id('bomb')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6b6f86" />
          <stop offset="0.5" stopColor="#2a2c3a" />
          <stop offset="1" stopColor="#0d0e16" />
        </radialGradient>
        <linearGradient id={id('blade')} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#bff6ff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" />
        </linearGradient>
      </defs>
      {/* a wooden wall of planks in the lower half */}
      <g opacity="0.92">
        <rect y="118" width="320" height="82" fill={url(id('wood'))} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={`M${i * 58 + 20} 118V200`} stroke="#2e1a08" strokeOpacity="0.5" strokeWidth="2" />
        ))}
        <path d="M0 118H320" stroke="#c78b4e" strokeOpacity="0.6" strokeWidth="2" />
        <path d="M40 150q20-6 40 0M150 172q24-5 46 0M240 140q18-5 36 0" stroke="#2e1a08" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      </g>
      {/* juice splatter on the wall */}
      {[[120, 150, 14], [140, 168, 7], [98, 168, 5], [164, 142, 4]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#ff3b4e" opacity="0.55" />
      ))}
      {/* the blade's swoosh */}
      <path d="M24 176Q120 120 296 30" stroke={url(id('blade'))} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M60 156Q140 112 290 34" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.9" />
      {/* the watermelon in two halves, moving apart */}
      <g transform="translate(118 86) rotate(-28)" filter={url(id('shadow'))}>
        <g transform="translate(-5 -9)">
          <path d="M-34 0A34 34 0 0 1 34 0Z" fill={url(id('rind'))} />
          <path d="M-29 0A29 29 0 0 1 29 0Z" fill="#f4ffe6" />
          <path d="M-26 0A26 26 0 0 1 26 0Z" fill={url(id('flesh'))} />
          {[[-14, -8], [-4, -15], [8, -12], [16, -5], [-2, -6]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.8" ry="3" fill="#2b1a1a" transform={`rotate(${x} ${x} ${y})`} />
          ))}
          {[-26, -14, 0, 14].map((x) => (
            <path key={x} d={`M${x} -${Math.sqrt(34 * 34 - x * x) - 2}q4 4 2 8`} stroke="#14581e" strokeWidth="2" fill="none" opacity="0.6" />
          ))}
        </g>
        <g transform="translate(5 9) rotate(180)">
          <path d="M-34 0A34 34 0 0 1 34 0Z" fill={url(id('rind'))} />
          <path d="M-29 0A29 29 0 0 1 29 0Z" fill="#f4ffe6" />
          <path d="M-26 0A26 26 0 0 1 26 0Z" fill={url(id('flesh'))} />
          {[[-10, -9], [6, -14], [14, -6]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.8" ry="3" fill="#2b1a1a" />
          ))}
        </g>
      </g>
      {/* juice drops flying off the cut */}
      {[[146, 64, 4], [158, 76, 3], [92, 110, 3.5], [82, 98, 2.5], [170, 58, 2]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#ff4a5c" />
      ))}
      {/* an orange, whole */}
      <g transform="translate(238 108)" filter={url(id('shadow'))}>
        <circle r="24" fill={url(id('orange'))} />
        {[[-8, -6], [6, 8], [10, -10], [-12, 8], [0, 0]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r="0.9" fill="#c65a00" opacity="0.6" />
        ))}
        <path d="M-2-23q2-6 7-7" stroke="#5d3a12" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M4-28q10-6 14 2-8 4-14-2z" fill="#3fae4f" />
        <ellipse cx="-9" cy="-10" rx="6" ry="3.6" fill="#fff" opacity="0.5" transform="rotate(-30 -9 -10)" />
      </g>
      {/* a bomb with a lit fuse */}
      <g transform="translate(274 160)" filter={url(id('shadow'))}>
        <circle r="18" fill={url(id('bomb'))} />
        <rect x="-6" y="-24" width="12" height="7" rx="2" fill="#4a4d60" />
        <path d="M2-24q4-10 12-10" stroke="#c9a46a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="14" cy="-34" r="5" fill="#ffe066" />
        <circle cx="14" cy="-34" r="2.4" fill="#fff" />
        <ellipse cx="-6" cy="-7" rx="5" ry="3" fill="#fff" opacity="0.35" transform="rotate(-30 -6 -7)" />
      </g>
      <Spark x={288} y={124} r={6} fill="#fff6c2" />
      <Spark x={48} y={46} r={8} />
      <Spark x={200} y={36} r={6} />
    </g>
  );
}
