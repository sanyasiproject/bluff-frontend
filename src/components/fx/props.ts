// Drawn pieces for the newer throws (axe, chappal, comic bursts), inline SVG like shapes.ts

const svg = (box: string, body: string) => `<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

/** the axe already turned the way it sticks in: handle up and right, blade edge at the bottom (Noto has no animated axe) */
export const axeSvg = () =>
  svg(
    '-4 -4 72 72',
    `<g transform="rotate(-120 32 32)">` +
      `<rect x="35" y="14" width="7" height="48" rx="3.5" fill="#b07440" stroke="#6b4423" stroke-width="1.5"/>` +
      `<path d="M36 26c1 6 0 14 1 22" stroke="#8a5a30" stroke-width="1.2" fill="none"/>` +
      `<rect x="34.5" y="50" width="8" height="11" rx="3" fill="#5b3a1e"/>` +
      `<path d="M30 6h16v15H30z" fill="#6f7884"/><path d="M46 8h4v11h-4z" fill="#59616b"/>` +
      `<path d="M30 6 12 1c-6 6-7 19-1 26l19-6z" fill="#aab4bf"/>` +
      `<path d="M12 1c-6 6-7 19-1 26l3.5-1.5c-4.5-6-4-15 1-22.5z" fill="#f2f6f9"/>` +
      `</g>`,
  );

/** where the blade edge sits in the axe box, for the wobble pivot */
export const AXE_EDGE = '45% 91%';

/** a jagged crack with a dark cut in the middle */
export const crackSvg = () =>
  svg(
    '0 0 60 40',
    `<g fill="none" stroke="rgba(25,12,4,0.78)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M30 20 22 14l-6 2-8-6M30 20l6-8 8-1 6-7M30 20l10 4 8-2 8 5M30 20l-6 7-8 1-6 6M30 20l1 10-4 7"/></g>` +
      `<ellipse cx="30" cy="20" rx="10" ry="2.6" fill="rgba(20,10,0,0.85)"/>`,
  );

const SOLE = 'M20 2c10 0 17 8 17 22 0 10-3 16-4 24-1 10 0 20-13 22C7 68 7 58 7 48 6 40 3 34 3 24 3 10 10 2 20 2z';

/** a rubber chappal (flip-flop) seen from above (Noto has none) */
export const chappalSvg = () =>
  svg(
    '0 0 40 72',
    `<path fill="#17617a" d="${SOLE}"/><path fill="#2aa6c8" transform="translate(2.4 4.3) scale(.88)" d="${SOLE}"/>` +
      `<path d="M20 17 8 37M20 17l12 20" stroke="#ffc928" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="20" cy="17" r="3.2" fill="#e09a00"/>`,
  );

/** the red mark a chappal slap leaves */
export const slapMarkSvg = () => svg('0 0 40 72', `<path fill="#ff2d2d" d="${SOLE}"/>`);

/** a jagged comic burst (POW): a yellow star on a red one; different every time */
export function burstSvg(): string {
  const spikes = 14;
  const points = (outer: number, inner: number) =>
    Array.from({ length: spikes * 2 }, (_, i) => {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const r = i % 2 ? inner : outer * (0.85 + Math.random() * 0.2);
      return `${(60 + Math.cos(a) * r).toFixed(1)},${(60 + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
  return svg(
    '0 0 120 120',
    `<polygon points="${points(58, 34)}" fill="#ff3b1f" stroke="#7a1200" stroke-width="2" stroke-linejoin="round"/>` +
      `<polygon points="${points(44, 26)}" fill="#ffd400"/>`,
  );
}

/** the anger mark: four bent veins */
export const angerSvg = () =>
  svg(
    '0 0 24 24',
    `<path d="M3 9q6 0 6-6M15 3q0 6 6 6M21 15q-6 0-6 6M9 21q0-6-6-6" fill="none" stroke="#ff2a2a" stroke-width="3.4" stroke-linecap="round"/>`,
  );

/** a five-point star (dizzy stars after a punch) */
export const starSvg = (color: string) =>
  svg('0 0 24 24', `<path fill="${color}" stroke="#b07800" stroke-width="1" stroke-linejoin="round" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z"/>`);

/** a buzzing fly */
export const flySvg = () =>
  svg(
    '0 0 20 16',
    `<ellipse cx="6.5" cy="5" rx="4.6" ry="2.8" fill="#e6f6ff" opacity=".85" transform="rotate(-25 6.5 5)"/>` +
      `<ellipse cx="13.5" cy="5" rx="4.6" ry="2.8" fill="#e6f6ff" opacity=".85" transform="rotate(25 13.5 5)"/>` +
      `<ellipse cx="10" cy="9.5" rx="3.6" ry="4.2" fill="#1d1d1d"/><circle cx="10" cy="13.4" r="2.3" fill="#3a2a2a"/>`,
  );

/** a wavy stink line */
export const stinkSvg = () =>
  svg('0 0 12 32', `<path d="M6 30c-4-5 4-8 0-13s4-8 0-13" fill="none" stroke="#a8d46f" stroke-width="3" stroke-linecap="round" opacity=".85"/>`);

const FINGERS = 'M30 23 35 6M26 22 25 3M22 24 15 7M19 28 7 16M33 33l11-3';

/** an open cartoon hand, thumb out to the right (the "nyah nyah" hand); mirror it for the other side */
export const handSvg = () =>
  svg(
    '0 0 48 48',
    `<g stroke-linecap="round" fill="none"><path d="${FINGERS}" stroke="#c98a00" stroke-width="9.5"/></g>` +
      `<circle cx="27" cy="31" r="12" fill="#c98a00"/>` +
      `<g stroke-linecap="round" fill="none"><path d="${FINGERS}" stroke="#ffcc4d" stroke-width="6.5"/></g>` +
      `<circle cx="27" cy="31" r="10.5" fill="#ffcc4d"/>` +
      `<path d="M21 35q6 4 11 0" stroke="#e0a500" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  );

/** where the thumb tip sits in the hand box: the hand flaps about it */
export const HAND_PIVOT = '92% 62%';
