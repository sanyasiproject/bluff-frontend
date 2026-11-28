// Fruit Slice Duel's plate items drawn to look real: glossy whole fruit (shading, skin, stalk, leaf) and the cut face inside each
import type { FruitItemKind } from '../../types';

export type DuelFruit = Exclude<FruitItemKind, 'magnet'>;

const rg = (id: string, cx: string, cy: string, stops: [number, string][]) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="72%">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const lg = (id: string, x2: string, y2: string, stops: [number, string, number?][]) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
// a soft rim light and a sharp highlight: the gloss on every fruit
const gloss = (x: number, y: number, s = 1) =>
  `<ellipse cx="${x}" cy="${y}" rx="${11 * s}" ry="${6.5 * s}" fill="#fff" opacity=".42" transform="rotate(-32 ${x} ${y})"/><ellipse cx="${x - 2}" cy="${y + 1}" rx="${4 * s}" ry="${2.2 * s}" fill="#fff" opacity=".9" transform="rotate(-32 ${x} ${y})"/>`;
const leaf = (x: number, y: number, r: number, id: string) =>
  `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0c6-9 18-11 26-6-6 9-18 12-26 6z" fill="url(#${id})" stroke="#2e5e1a" stroke-width=".8"/><path d="M1 0c8-3 15-4 23-5" stroke="#cde8a8" stroke-width=".9" fill="none" opacity=".8"/></g>`;
const leafGrad = (id: string) => lg(id, '1', '1', [[0, '#9ccc65'], [0.55, '#4f8f2b'], [1, '#2e5e1a']]);
const dots = (pts: [number, number, number][], fill: string, op: number) => pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${op}"/>`).join('');
// a scatter of tiny pores / speckles inside a circle, fixed so every phone draws the same fruit
const scatter = (cx: number, cy: number, rad: number, n: number, size: number): [number, number, number][] =>
  Array.from({ length: n }, (_, i) => {
    const a = i * 2.399963;
    const d = rad * Math.sqrt((i + 0.5) / n);
    return [+(cx + d * Math.cos(a)).toFixed(1), +(cy + d * Math.sin(a)).toFixed(1), +(size * (0.7 + ((i * 37) % 10) / 20)).toFixed(2)];
  });

const WHOLE: Record<DuelFruit, string> = {
  apple: `<defs>${rg('dxa', '36%', '30%', [[0, '#ff9e8a'], [0.35, '#e8382c'], [0.75, '#b3161b'], [1, '#6e0a0e']])}${lg('dxa2', '0', '1', [[0, '#ffe082', 0.0], [0.7, '#ffcc80', 0.35], [1, '#ffb74d', 0]])}${leafGrad('dxal')}</defs>
    <path d="M50 27c-9-7-31-8-37 13-6 23 8 47 23 51 6 2 10-1 14-1s8 3 14 1c15-4 29-28 23-51-6-21-28-20-37-13z" fill="url(#dxa)"/>
    <path d="M28 40c-4 14 0 30 10 40" stroke="url(#dxa2)" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${dots(scatter(50, 58, 30, 26, 0.7), '#ffe0b2', 0.55)}
    <path d="M40 30c6 4 14 4 20 0" stroke="#5a0a0a" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
    <path d="M50 31c-1-8 1-15 5-20" stroke="#5d4037" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    ${leaf(54, 17, -18, 'dxal')}${gloss(33, 40)}`,
  orange: `<defs>${rg('dxo', '38%', '32%', [[0, '#ffd08a'], [0.4, '#fb8c00'], [0.8, '#d86200'], [1, '#8a3b00']])}${leafGrad('dxol')}</defs>
    <circle cx="50" cy="53" r="38" fill="url(#dxo)"/>
    ${dots(scatter(50, 53, 36, 90, 0.75), '#a84a00', 0.32)}${dots(scatter(46, 46, 24, 30, 0.55), '#fff3e0', 0.35)}
    <circle cx="50" cy="16.5" r="3.2" fill="#6d4c1f"/><circle cx="50" cy="16.5" r="1.6" fill="#a1887f"/>
    ${leaf(52, 15, -24, 'dxol')}${gloss(35, 38)}`,
  melon: `<defs>${rg('dxm', '38%', '30%', [[0, '#8fd16a'], [0.45, '#2f7d32'], [0.85, '#164d1a'], [1, '#0a2e0d']])}</defs>
    <ellipse cx="50" cy="54" rx="44" ry="37" fill="url(#dxm)"/>
    <g stroke="#0b3410" stroke-width="5.5" fill="none" stroke-linejoin="round" opacity=".7">
      <path d="M18 28c-4 6 3 10-1 16s3 11-1 17 3 10 2 15"/><path d="M34 19c-4 8 3 12-1 20s4 14 0 22 3 13 1 19"/>
      <path d="M52 17c-3 9 4 13 0 22s4 15 0 23 3 13 1 20"/><path d="M70 20c-3 8 4 12 1 20s4 14 0 22 2 11 1 17"/><path d="M85 31c-2 6 3 10 1 16s3 10 0 16"/>
    </g>
    <path d="M50 18c0-4 2-7 5-8" stroke="#6d5a2a" stroke-width="3" fill="none" stroke-linecap="round"/>${gloss(32, 36, 1.2)}`,
  banana: `<defs>${lg('dxb', '0', '1', [[0, '#fff59d'], [0.45, '#fdd835'], [0.8, '#e0a800'], [1, '#9a6b00']])}</defs>
    <path d="M13 28c3 34 31 57 66 53 9-1 13-6 9-9-31 6-54-14-60-45-2-7-16-8-15 1z" fill="url(#dxb)" stroke="#8a6200" stroke-width="1.4"/>
    <path d="M17 33c6 26 27 43 56 44M20 30c8 22 27 38 52 40" stroke="#b08400" stroke-width="1.1" fill="none" opacity=".55"/>
    ${dots([[40, 62, 1.2], [58, 72, 1], [30, 50, 0.9], [66, 70, 1.3]], '#6d4c1f', 0.6)}
    <path d="M13 28l-3-11 9 3z" fill="#5d4a2a"/><path d="M86 72l6 1-3 5z" fill="#3e2a14"/>
    <path d="M24 36c6 20 22 34 44 38" stroke="#fff" stroke-width="3" opacity=".55" fill="none" stroke-linecap="round"/>`,
  mango: `<defs>${rg('dxg', '40%', '34%', [[0, '#fff59d'], [0.4, '#ffb300'], [0.8, '#ef6c00'], [1, '#a63d00']])}${lg('dxg2', '1', '1', [[0, '#689f38', 0.95], [0.45, '#7cb342', 0]])}${lg('dxg3', '1', '0', [[0.5, '#e53935', 0], [1, '#c62828', 0.55]])}${leafGrad('dxgl')}</defs>
    <path d="M50 13c27 0 43 22 39 46-4 23-23 35-41 33-19-2-35-19-35-41 0-23 15-38 37-38z" fill="url(#dxg)"/>
    <path d="M50 13c27 0 43 22 39 46-4 23-23 35-41 33-19-2-35-19-35-41 0-23 15-38 37-38z" fill="url(#dxg2)"/>
    <path d="M50 13c27 0 43 22 39 46-4 23-23 35-41 33-19-2-35-19-35-41 0-23 15-38 37-38z" fill="url(#dxg3)"/>
    ${dots(scatter(52, 54, 32, 22, 0.6), '#fff8e1', 0.45)}
    <path d="M52 14c2-4 5-6 9-7" stroke="#5d4037" stroke-width="3" fill="none" stroke-linecap="round"/>${leaf(58, 9, -10, 'dxgl')}${gloss(34, 36)}`,
  grapes: `<defs>${rg('dxp', '36%', '30%', [[0, '#d7a8e8'], [0.4, '#7b1fa2'], [0.85, '#3d0a5e'], [1, '#230535']])}${leafGrad('dxpl')}</defs>
    <path d="M50 8v14M50 14c-6-2-10 0-12 3" stroke="#6d5a2a" stroke-width="3" fill="none" stroke-linecap="round"/>${leaf(51, 13, -15, 'dxpl')}
    ${[[38, 30], [62, 30], [50, 33], [28, 45], [50, 49], [72, 45], [38, 62], [62, 62], [50, 77]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="url(#dxp)" stroke="#2a0640" stroke-width=".6"/><circle cx="${x - 4}" cy="${y - 5}" r="3" fill="#fff" opacity=".75"/><circle cx="${x}" cy="${y}" r="12" fill="#e1d5ec" opacity=".12"/>`)
      .join('')}`,
};

const FACE: Record<DuelFruit, string> = {
  apple: `<defs>${rg('fxa', '50%', '50%', [[0, '#fffbe6'], [0.75, '#fff2c2'], [1, '#f3dc96']])}</defs>
    <circle cx="50" cy="50" r="40" fill="#c62828"/><circle cx="50" cy="50" r="37.5" fill="url(#fxa)"/>
    <path d="M50 32l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z" fill="#f0d98a" stroke="#c9a74a" stroke-width="1.2"/>
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="50" cy="41" rx="2.2" ry="4" fill="#4e2a12" transform="rotate(${a} 50 50)"/>`).join('')}`,
  orange: `<defs>${rg('fxo', '50%', '50%', [[0, '#ffe0a8'], [0.6, '#ffa726'], [1, '#f57c00']])}</defs>
    <circle cx="50" cy="50" r="40" fill="#ef6c00"/><circle cx="50" cy="50" r="37" fill="#fff3e0"/>
    ${Array.from({ length: 10 }, (_, i) => `<path d="M50 50L${(50 + 33 * Math.cos((i * 36 + 3) * 0.01745)).toFixed(1)} ${(50 + 33 * Math.sin((i * 36 + 3) * 0.01745)).toFixed(1)}A33 33 0 0 1 ${(50 + 33 * Math.cos((i * 36 + 33) * 0.01745)).toFixed(1)} ${(50 + 33 * Math.sin((i * 36 + 33) * 0.01745)).toFixed(1)}Z" fill="url(#fxo)"/>`).join('')}
    <circle cx="50" cy="50" r="4" fill="#fff8ec"/>${dots(scatter(50, 50, 28, 26, 0.9), '#fff', 0.35)}`,
  melon: `<defs>${rg('fxm', '50%', '50%', [[0, '#ff6f6f'], [0.7, '#f4323a'], [1, '#e8505a']])}</defs>
    <circle cx="50" cy="50" r="40" fill="#1b5e20"/><circle cx="50" cy="50" r="37" fill="#c5e1a5"/><circle cx="50" cy="50" r="34" fill="#f1f8e9"/>
    <circle cx="50" cy="50" r="31.5" fill="url(#fxm)"/>
    ${Array.from({ length: 11 }, (_, i) => `<path d="M0-3c2 0 3 3 0 7-3-4-2-7 0-7z" fill="#1a1a1a" transform="translate(${(50 + 19 * Math.cos(i * 0.571)).toFixed(1)} ${(50 + 19 * Math.sin(i * 0.571)).toFixed(1)}) rotate(${Math.round(i * 32.7 + 90)})"/>`).join('')}
    ${dots(scatter(50, 50, 28, 30, 0.8), '#ffd0d0', 0.4)}`,
  banana: `<circle cx="50" cy="56" r="22" fill="#f9d849"/><circle cx="50" cy="56" r="19" fill="#fff7d6"/><circle cx="50" cy="56" r="15" fill="#fff1b8"/>
    <g stroke="#e0c77a" stroke-width="1.2"><path d="M50 56V47M50 56l8 5M50 56l-8 5"/></g>${dots([[50, 52, 1.1], [53.5, 58, 1.1], [46.5, 58, 1.1]], '#8d6e3f', 0.8)}`,
  mango: `<defs>${rg('fxg', '50%', '50%', [[0, '#ffd54f'], [0.7, '#ffa000'], [1, '#f57c00']])}</defs>
    <circle cx="50" cy="50" r="40" fill="#e65100"/><circle cx="50" cy="50" r="37.5" fill="url(#fxg)"/>
    <ellipse cx="50" cy="50" rx="11" ry="22" fill="#fff3c4" stroke="#e8c66a" stroke-width="1.4"/>
    <g stroke="#e8c66a" stroke-width=".8" opacity=".8"><path d="M45 34l-8-6M55 34l8-6M44 50h-10M56 50h10M45 66l-8 6M55 66l8 6"/></g>`,
  grapes: `<circle cx="50" cy="50" r="40" fill="#4a148c"/><circle cx="50" cy="50" r="37" fill="#dcedc8"/><circle cx="50" cy="50" r="30" fill="#e8f5d0" opacity=".9"/>
    <ellipse cx="44" cy="50" rx="3.5" ry="6" fill="#8d6e3f"/><ellipse cx="56" cy="50" rx="3.5" ry="6" fill="#8d6e3f"/>`,
};

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

/** the whole fruit, glossy and upright */
export const wholeSvg = (kind: DuelFruit) => svg(WHOLE[kind]);
/** the inside of the fruit where the blade went through */
export const faceSvg = (kind: DuelFruit) => svg(FACE[kind]);
