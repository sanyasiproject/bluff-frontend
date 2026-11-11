// Small drawn shapes for the landing effects, as inline SVG markup (flat fills, no ids, so many can share the page)

const svg = (box: string, body: string) => `<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const heartSvg = (color: string) =>
  svg(
    '0 0 24 24',
    `<path fill="${color}" d="M12 20.5C8 17.5 3 13.5 3 8.6 3 5.9 5.1 4 7.6 4c1.9 0 3.5 1.1 4.4 2.6C12.9 5.1 14.5 4 16.4 4 18.9 4 21 5.9 21 8.6c0 4.9-5 8.9-9 11.9z"/>` +
      `<ellipse cx="7.6" cy="8.2" rx="2.2" ry="1.5" fill="#fff" opacity=".35" transform="rotate(-30 7.6 8.2)"/>`,
  );

export const petalSvg = (color: string, shade: string) =>
  svg('0 0 24 24', `<path fill="${color}" d="M12 2c5 5 5.5 13 0 20C6.5 15 7 7 12 2z"/><path fill="${shade}" d="M12 5c2 4 2 10 0 15-1-5-1-10 0-15z"/>`);

export const dropSvg = (color: string) =>
  svg(
    '0 0 24 24',
    `<path fill="${color}" d="M12 2s-7 9-7 13.5a7 7 0 0 0 14 0C19 11 12 2 12 2z"/><ellipse cx="9.3" cy="15" rx="1.6" ry="2.6" fill="#fff" opacity=".45"/>`,
  );

export const sparkSvg = (color: string) => svg('0 0 24 24', `<path fill="${color}" d="M12 0c1 8 4 11 12 12-8 1-11 4-12 12-1-8-4-11-12-12 8-1 11-4 12-12z"/>`);

export const curlSvg = (color: string) =>
  svg('0 0 28 20', `<path d="M2 10c4-8 8 8 12 0s8 8 12 0" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round"/>`);

/** a jagged bit of shell */
export const shellSvg = () => svg('0 0 20 20', `<path fill="#fbf6ea" stroke="#dccfb3" stroke-width="1.2" d="M2 6l7-4 9 3-2 7 2 5-8-2-6 3 1-6z"/>`);

const EGG_TOP = 'M8.6 36C9.5 24 19 4 32 4s22.5 20 23.4 32L50 32l-5 6-6-7-6 6-6-6-6 7-6-6z';
const EGG_BOTTOM = 'M8.6 36l6.4-4 6 6 6-7 6 6 6-6 6 7 5-6 5.4 4c.4 2 .6 4 .6 6 0 13-11 20-24 20S8 55 8 42c0-2 .2-4 .6-6z';
const EGG_SHADE = '<path fill="#ead9bb" d="M44 12c8 9 12 21 12 30 0 13-11 20-24 20-6 0-11-1.5-15-4.5 21 4 35-12 27-45.5z"/>';
const EGG_SHINE = '<ellipse cx="22" cy="20" rx="5" ry="8" fill="#fff" opacity=".7" transform="rotate(25 22 20)"/>';

/** the whole egg, drawn (Noto has no animated egg) */
export const eggSvg = () => svg('0 0 64 66', `<path fill="#fdf8ee" d="M32 4c14 0 24 22 24 38 0 13-11 20-24 20S8 55 8 42C8 26 18 4 32 4z"/>${EGG_SHADE}${EGG_SHINE}`);

/** top of the shell with a zigzag crack along its bottom edge */
export const eggTopSvg = () =>
  svg(
    '0 0 64 66',
    `<path fill="#fdf8ee" stroke="#c9b48e" stroke-width="1.6" stroke-linejoin="round" d="${EGG_TOP}"/>${EGG_SHINE}` +
      `<path fill="#ead9bb" d="M44 12c5 6 9 15 11 24l-5-4-5 6c1-9-0-17-1-26z"/>`,
  );

export const eggBottomSvg = () =>
  svg(
    '0 0 64 66',
    `<path fill="#fdf8ee" stroke="#c9b48e" stroke-width="1.6" stroke-linejoin="round" d="${EGG_BOTTOM}"/>` +
      `<path fill="#ead9bb" d="M56 42c0 13-11 20-24 20-6 0-11-1.5-15-4.5 18 3 31-6 33-19.5l5-6 1 4c0 2 0 4 0 6z"/>`,
  );

/** a wobbly round outline through points at these radii (smooth, closed) */
function blobPath(cx: number, cy: number, radii: number[]): string {
  const pts = radii.map((r, i) => {
    const a = (i / radii.length) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `${d}Z`;
}

/** a splash with fingers and a few flung drops, plus a lighter shine; different every time */
export function splatSvg(color: string, shine: string): string {
  const radii = Array.from({ length: 16 }, (_, i) => (i % 4 === 1 ? 44 + Math.random() * 10 : 30 + Math.random() * 8));
  const drops = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + Math.random() * 0.6;
    const r = 52 + Math.random() * 8;
    return `<circle cx="${(60 + Math.cos(a) * r).toFixed(1)}" cy="${(55 + Math.sin(a) * r * 0.8).toFixed(1)}" r="${(3 + Math.random() * 3).toFixed(1)}"/>`;
  }).join('');
  return svg(
    '0 0 120 110',
    `<g fill="${color}" opacity=".94">${drops}<path d="${blobPath(60, 55, radii)}"/></g>` +
      `<path fill="${shine}" opacity=".75" d="${blobPath(54, 48, [14, 10, 12, 9, 13, 10, 11, 9])}"/>`,
  );
}

/** the yolk: a shiny orange dome */
export const yolkSvg = () =>
  svg(
    '0 0 40 40',
    `<circle cx="20" cy="20" r="18" fill="#ffaa00"/><circle cx="18" cy="18" r="13" fill="#ffc21a"/>` +
      `<ellipse cx="13" cy="12" rx="5" ry="3.4" fill="#fff" opacity=".8" transform="rotate(-30 13 12)"/>`,
  );

/** a long drip running down */
export const dripSvg = (color: string) => svg('0 0 12 40', `<path fill="${color}" d="M2 0h8v28a4 4 0 0 1-8 0z"/><circle cx="6" cy="35" r="4.5" fill="${color}"/>`);
