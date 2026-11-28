// Bomb Pass: a cartoon bomb with a sparking fuse flying between hands, a quick task card and hearts
import { ART_FONT, SceneBg, Spark, url, type SceneProps } from './common';

export function BombScene({ id, colors }: SceneProps) {
  const BX = 112;
  const BY = 116;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <radialGradient id={id('bomb')} cx="0.34" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6c7488" />
          <stop offset="0.35" stopColor="#2c3140" />
          <stop offset="1" stopColor="#07080c" />
        </radialGradient>
        <radialGradient id={id('heat')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff6d00" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6d00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('spark')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffde7" />
          <stop offset="0.35" stopColor="#ffd54a" />
          <stop offset="1" stopColor="#ff6d00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('card')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece6ff" />
        </linearGradient>
      </defs>
      {/* the flight arc from the last holder */}
      <path d={`M24 168Q50 70 ${BX - 40} ${BY - 20}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="2.2" strokeDasharray="2 6" strokeLinecap="round" fill="none" />
      {/* hot glow, then the bomb */}
      <circle cx={BX} cy={BY} r="74" fill={url(id('heat'))} />
      <g filter={url(id('shadow'))} transform={`rotate(-12 ${BX} ${BY})`}>
        <circle cx={BX} cy={BY} r="46" fill={url(id('bomb'))} />
        <rect x={BX - 13} y={BY - 58} width="26" height="16" rx="4" fill="#3a4050" />
        <rect x={BX - 13} y={BY - 58} width="26" height="5" rx="2.5" fill="#7b8396" />
        <ellipse cx={BX - 17} cy={BY - 20} rx="13" ry="8" fill="#fff" opacity="0.35" transform={`rotate(-35 ${BX - 17} ${BY - 20})`} />
        <circle cx={BX - 26} cy={BY - 8} r="3" fill="#fff" opacity="0.45" />
        {/* cartoon face */}
        <ellipse cx={BX - 10} cy={BY + 4} rx="5" ry="7" fill="#fff" />
        <ellipse cx={BX + 12} cy={BY + 4} rx="5" ry="7" fill="#fff" />
        <circle cx={BX - 8} cy={BY + 6} r="2.8" fill="#111" />
        <circle cx={BX + 14} cy={BY + 6} r="2.8" fill="#111" />
        <path d={`M${BX - 8} ${BY + 22}q10 -7 20 0`} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* the fuse and its spark */}
        <path d={`M${BX} ${BY - 58}c2 -14 18 -20 26 -12`} stroke="#c8a165" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <path d={`M${BX} ${BY - 58}c2 -14 18 -20 26 -12`} stroke="#6d4c2a" strokeWidth="3.6" strokeDasharray="2 3" strokeLinecap="round" fill="none" opacity="0.6" />
      </g>
      <g transform={`translate(${BX + 20} ${BY - 82})`}>
        <circle r="16" fill={url(id('spark'))} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M0 -6V-15" stroke="#ffe082" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${a})`} />
        ))}
        <circle r="3.5" fill="#fffde7" />
      </g>
      {/* comic smoke puffs */}
      {[[BX + 44, BY - 96, 9], [BX + 58, BY - 108, 7], [BX + 70, BY - 116, 5]].map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill="#fff" opacity="0.5" />
      ))}
      {/* the task card */}
      <g transform="translate(210 46) rotate(5)" filter={url(id('shadow'))}>
        <rect width="92" height="112" rx="12" fill={url(id('card'))} />
        <text x="46" y="30" textAnchor="middle" fontSize="20" fontWeight="900" fill="#2a1a6e" fontFamily={ART_FONT}>
          7 + 8
        </text>
        {[['13', 8, 44, '#e3dcff'], ['15', 48, 44, '#69f0ae'], ['16', 8, 76, '#e3dcff'], ['14', 48, 76, '#e3dcff']].map(([t, x, y, f]) => (
          <g key={t as string} transform={`translate(${x} ${y})`}>
            <rect width="36" height="26" rx="7" fill={f as string} />
            <text x="18" y="18" textAnchor="middle" fontSize="13" fontWeight="900" fill="#2a1a6e" fontFamily={ART_FONT}>
              {t}
            </text>
          </g>
        ))}
        <path d="M74 47l3 4 7-8" stroke="#1b5e20" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      {/* hearts */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          transform={`translate(${222 + i * 22} 176) scale(0.9)`}
          d="M0 4C-2-2-11-2-11 5C-11 11 0 16 0 16C0 16 11 11 11 5C11-2 2-2 0 4Z"
          fill={i < 2 ? '#ff4f6d' : '#fff'}
          fillOpacity={i < 2 ? 1 : 0.35}
          stroke="#fff"
          strokeWidth="1.4"
        />
      ))}
      <Spark x={34} y={40} r={7} />
      <Spark x={186} y={186} r={5} fill="#fff6c2" />
    </g>
  );
}
