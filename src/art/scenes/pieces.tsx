// Glossy board pieces shared by the Ludo scene and the logo: a standing goti and a 3D die
import { url, type IdFn } from './common';

/** a standing goti with its base centre at (x, y); light from top-left */
export function Goti({ id, k, x, y, s = 1, light, dark }: { id: IdFn; k: string; x: number; y: number; s?: number; light: string; dark: string }) {
  const head = id(`gh-${k}`);
  const body = id(`gb-${k}`);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <radialGradient id={head} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.18" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={dark} />
          <stop offset="1" stopColor={dark} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <ellipse cx="4" cy="2" rx="19" ry="5.5" fill="#16052e" opacity="0.35" />
      <path d="M-16 0a16 6 0 0 0 32 0v-5a16 6 0 0 0-32 0z" fill={url(body)} />
      <ellipse cy="-5" rx="16" ry="6" fill={light} />
      <ellipse cy="-5" rx="16" ry="6" fill="#fff" opacity="0.18" />
      <path d="M-11-6C-10-14-6-20-5-27H5C6-20 10-14 11-6Z" fill={url(body)} />
      <ellipse cy="-27" rx="8.5" ry="3.2" fill={dark} />
      <circle cy="-36" r="10.5" fill={url(head)} />
      <ellipse cx="-3.8" cy="-39.5" rx="3.6" ry="2.4" fill="#fff" opacity="0.8" transform="rotate(-25 -3.8 -39.5)" />
      <path d="M-7.5-9C-7-14-4.5-19-3.5-24" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
  );
}

/** a 3D die showing five on the front, at (x, y) top-left of the front face */
export function Die({ id, k, x, y, s = 1, rot = 0 }: { id: IdFn; k: string; x: number; y: number; s?: number; rot?: number }) {
  const face = id(`df-${k}`);
  const pip = '#2a1a6e';
  const front: [number, number][] = [[15, 15], [41, 15], [28, 28], [15, 41], [41, 41]];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot} 28 28) scale(${s})`}>
      <defs>
        <linearGradient id={face} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4ddff" />
        </linearGradient>
      </defs>
      <rect x="6" y="2" width="68" height="64" rx="14" fill="#16052e" opacity="0.16" transform="translate(4 8)" />
      <path d="M4 2L16-10H66L54 2Z" fill="#f7f4ff" stroke="#f7f4ff" strokeWidth="8" strokeLinejoin="round" />
      <path d="M54 2L66-10V42L54 54Z" fill="#c4b8ef" stroke="#c4b8ef" strokeWidth="8" strokeLinejoin="round" />
      <rect x="0" y="0" width="56" height="56" rx="12" fill={url(face)} />
      <rect x="1" y="1" width="54" height="54" rx="11" fill="none" stroke="#fff" strokeWidth="1.5" />
      {front.map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r="5.2" fill={pip} />
          <circle cx={cx - 1.4} cy={cy - 1.6} r="1.5" fill="#fff" opacity="0.35" />
        </g>
      ))}
      <ellipse cx="36" cy="-5" rx="5" ry="2.4" fill={pip} />
      <ellipse cx="63" cy="12" rx="2.2" ry="4.6" fill={pip} opacity="0.85" />
      <ellipse cx="63" cy="35" rx="2.2" ry="4.6" fill={pip} opacity="0.85" />
    </g>
  );
}
