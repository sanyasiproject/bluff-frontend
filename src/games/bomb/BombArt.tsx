// The cartoon bomb: a glossy black ball with a face, a fuse with a sparking tip and smoke puffs; hotter glow by heat stage
import { memo } from 'react';

function BombSvg({ heat }: { heat: number }) {
  const worried = heat >= 2;
  return (
    <svg className="bp-bomb-svg" viewBox="-60 -86 120 146" aria-hidden>
      <defs>
        <radialGradient id="bp-ball" cx="0.34" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#6c7488" />
          <stop offset="0.35" stopColor="#2c3140" />
          <stop offset="1" stopColor="#07080c" />
        </radialGradient>
        <radialGradient id="bp-hot" cx="0.5" cy="0.6" r="0.6">
          <stop offset="0" stopColor="#ff3d00" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff3d00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bp-spark" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffde7" />
          <stop offset="0.35" stopColor="#ffd54a" />
          <stop offset="1" stopColor="#ff6d00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="4" cy="54" rx="34" ry="6" fill="#000" opacity="0.35" />
      <circle r="44" cy="8" fill="url(#bp-ball)" />
      {heat > 0 && <circle r="44" cy="8" fill="url(#bp-hot)" opacity={0.35 + heat * 0.2} className="bp-hot" />}
      <rect x="-12" y="-45" width="24" height="14" rx="4" fill="#3a4050" />
      <rect x="-12" y="-45" width="24" height="4.5" rx="2.2" fill="#7b8396" />
      <ellipse cx="-17" cy="-12" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-35 -17 -12)" />
      <circle cx="-25" cy="1" r="2.8" fill="#fff" opacity="0.45" />
      {/* the face: calm, then sweating as it heats up */}
      <ellipse cx="-11" cy="10" rx="5" ry={worried ? 8 : 7} fill="#fff" />
      <ellipse cx="11" cy="10" rx="5" ry={worried ? 8 : 7} fill="#fff" />
      <circle cx="-10" cy={worried ? 8 : 12} r="2.8" fill="#111" />
      <circle cx="12" cy={worried ? 8 : 12} r="2.8" fill="#111" />
      {worried ? (
        <ellipse cx="1" cy="29" rx="6" ry="4.5" fill="#111" stroke="#fff" strokeWidth="2" />
      ) : (
        <path d="M-9 26q10 7 20 0" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
      {heat >= 1 && <path d="M28 -6q4 7 0 10q-4 -3 0 -10Z" fill="#81d4fa" />}
      {/* the fuse and its spark */}
      <path className="bp-fuse" d="M0 -45c2 -14 18 -20 26 -12" stroke="#c8a165" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <path d="M0 -45c2 -14 18 -20 26 -12" stroke="#6d4c2a" strokeWidth="3.6" strokeDasharray="2 3" strokeLinecap="round" fill="none" opacity="0.6" />
      <g className="bp-spark" transform="translate(27 -58)">
        <circle r="13" fill="url(#bp-spark)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M0 -5V-12" stroke="#ffe082" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${a})`} />
        ))}
        <circle r="3" fill="#fffde7" />
      </g>
      <g className="bp-smoke">
        <circle cx="36" cy="-70" r="6" fill="#fff" opacity="0.4" />
        <circle cx="44" cy="-79" r="4.5" fill="#fff" opacity="0.3" />
      </g>
    </svg>
  );
}

export const BombArt = memo(BombSvg);

/** the comic blast: a jagged star, smoke balls and BOOM lettering */
export function Blast() {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 34 : 60;
    return `${Math.cos(a) * r},${Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg className="bp-blast-svg" viewBox="-80 -80 160 160" aria-hidden>
      <circle r="70" fill="#455a64" opacity="0.55" className="bp-smokeball" />
      <polygon points={pts} fill="#ff6d00" stroke="#ffd54a" strokeWidth="5" strokeLinejoin="round" />
      <polygon points={pts} fill="#ffd54a" transform="scale(0.55)" />
      <text y="9" textAnchor="middle" fontSize="27" fontWeight="900" fill="#b71c1c" stroke="#fff" strokeWidth="1.5" fontFamily="system-ui, sans-serif">
        BOOM!
      </text>
    </svg>
  );
}
