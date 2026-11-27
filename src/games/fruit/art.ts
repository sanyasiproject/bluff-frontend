// Fruit Slice Duel art: our own glossy fruit and bomb as SVG (100×100, centred), turned into images for the canvas
import type { FruitKind } from '../../types';

const shine = '<ellipse cx="36" cy="32" rx="13" ry="8" fill="#fff" opacity=".55" transform="rotate(-30 36 32)"/><circle cx="30" cy="44" r="3" fill="#fff" opacity=".5"/>';
const rg = (id: string, a: string, b: string, c: string) =>
  `<radialGradient id="${id}" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`;

const SVG: Record<FruitKind, string> = {
  apple: `<defs>${rg('a', '#ff8a80', '#e53935', '#8e0000')}</defs>
    <path d="M50 28c-8-8-30-8-36 12-6 22 8 46 22 50 6 2 10-2 14-2s8 4 14 2c14-4 28-28 22-50-6-20-28-20-36-12z" fill="url(#a)"/>
    <path d="M50 30c0-8 2-14 6-18" stroke="#5d4037" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M56 18c8-8 20-6 22-4-6 8-16 10-22 4z" fill="#66bb6a"/>${shine}`,
  orange: `<defs>${rg('o', '#ffe0a3', '#fb8c00', '#c25e00')}<pattern id="op" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".9" fill="#b85400" opacity=".35"/></pattern></defs>
    <circle cx="50" cy="54" r="38" fill="url(#o)"/><circle cx="50" cy="54" r="38" fill="url(#op)"/>
    <path d="M48 17c2-4 8-6 12-4-2 4-8 6-12 4z" fill="#558b2f"/>${shine}`,
  melon: `<defs>${rg('m', '#b9f6ca', '#2e7d32', '#0b3d0f')}</defs>
    <ellipse cx="50" cy="52" rx="44" ry="38" fill="url(#m)"/>
    <g stroke="#0b3d0f" stroke-width="5" fill="none" opacity=".55"><path d="M20 24c-8 18-8 38 2 56"/><path d="M38 15c-6 22-6 50 0 74"/><path d="M60 15c6 22 6 50 0 74"/><path d="M80 24c8 18 8 38-2 56"/></g>${shine}`,
  banana: `<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff59d"/><stop offset=".5" stop-color="#fdd835"/><stop offset="1" stop-color="#c79a00"/></linearGradient></defs>
    <path d="M14 30c4 32 30 54 64 50 8-1 12-6 8-8-30 6-52-14-58-44-2-6-14-6-14 2z" fill="url(#b)" stroke="#a07800" stroke-width="2"/>
    <path d="M14 30l-2-10 8 2z" fill="#5d4037"/><path d="M84 74l6 2-2 4z" fill="#5d4037"/>
    <path d="M24 36c6 20 22 34 44 38" stroke="#fff" stroke-width="3" opacity=".5" fill="none" stroke-linecap="round"/>`,
  mango: `<defs>${rg('g', '#fff176', '#ffa000', '#e65100')}<linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cb342" stop-opacity=".9"/><stop offset=".5" stop-color="#7cb342" stop-opacity="0"/></linearGradient></defs>
    <path d="M50 12c26 0 42 22 38 46-4 22-22 34-40 32-18-2-34-18-34-40 0-22 14-38 36-38z" fill="url(#g)"/>
    <path d="M50 12c26 0 42 22 38 46-4 22-22 34-40 32-18-2-34-18-34-40 0-22 14-38 36-38z" fill="url(#g2)"/>
    <path d="M52 12c2-4 6-6 10-6" stroke="#5d4037" stroke-width="3" fill="none"/>${shine}`,
  grapes: `<defs>${rg('p', '#e1bee7', '#8e24aa', '#38006b')}</defs>
    <path d="M50 10v12" stroke="#5d4037" stroke-width="4"/><path d="M52 16c8-6 18-4 20 0-8 4-14 4-20 0z" fill="#66bb6a"/>
    <g fill="url(#p)">${[[38, 30], [62, 30], [50, 34], [30, 46], [50, 50], [70, 46], [38, 62], [62, 62], [50, 76]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13"/>`)
      .join('')}</g>
    <g fill="#fff" opacity=".55">${[[34, 26], [58, 26], [26, 42], [46, 46], [66, 42], [34, 58], [58, 58], [46, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('')}</g>`,
  bomb: `<defs>${rg('k', '#78909c', '#263238', '#000')}</defs>
    <circle cx="48" cy="56" r="36" fill="url(#k)"/>
    <rect x="56" y="14" width="18" height="14" rx="3" fill="#455a64" transform="rotate(30 65 21)"/>
    <path d="M70 16c6-8 12-10 18-6" stroke="#8d6e63" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M40 46l16 16M56 46L40 62" stroke="#ff1744" stroke-width="6" stroke-linecap="round" opacity=".9"/>
    <ellipse cx="34" cy="36" rx="10" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 34 36)"/>`,
};

/** the colour inside each fruit (its cut face and juice) */
export const FLESH: Record<FruitKind, { face: string; rim: string; juice: string }> = {
  apple: { face: '#fff4c9', rim: '#e53935', juice: '#fff59d' },
  orange: { face: '#ffb74d', rim: '#ef6c00', juice: '#ffa726' },
  melon: { face: '#ff5252', rim: '#2e7d32', juice: '#ff1744' },
  banana: { face: '#fff9c4', rim: '#fdd835', juice: '#fff176' },
  mango: { face: '#ffc107', rim: '#e65100', juice: '#ffb300' },
  grapes: { face: '#c5e1a5', rim: '#6a1b9a', juice: '#ba68c8' },
  bomb: { face: '#ff9100', rim: '#263238', juice: '#ffab00' },
};

const cache = new Map<FruitKind, HTMLImageElement>();

/** the fruit's image (loaded once) */
export function fruitImage(kind: FruitKind): HTMLImageElement {
  let img = cache.get(kind);
  if (!img) {
    img = new Image();
    // drawn big so the bigger fruit stay crisp
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">${SVG[kind]}</svg>`)}`;
    cache.set(kind, img);
  }
  return img;
}

/** the fruit as an inline SVG string (rules sheet, podium) */
export const fruitSvg = (kind: FruitKind) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${SVG[kind]}</svg>`;
