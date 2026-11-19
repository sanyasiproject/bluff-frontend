import { AVATAR_BACKGROUNDS, parseAvatar } from '../types';

export type AvatarBackground = (typeof AVATAR_BACKGROUNDS)[number];

// a soft light from the top, laid over every background
const SHINE = 'radial-gradient(120% 70% at 50% 0%, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.1) 42%, transparent 62%)';
// a little shade at the bottom so the face pops
const SHADE = 'radial-gradient(90% 60% at 50% 112%, rgba(0, 0, 0, 0.38), transparent 70%)';
// a glow of one colour, placed by x/y percent
const glow = (x: number, y: number, rgba: string, size = '55% 45%') => `radial-gradient(${size} at ${x}% ${y}%, ${rgba}, transparent 70%)`;
// one tiny star
const star = (x: number, y: number, px = 1, color = '#fff') => `radial-gradient(${px}px ${px}px at ${x}% ${y}%, ${color} 50%, transparent 51%)`;
// a peacock feather eye: navy centre, teal ring, gold rim
const eye = (x: number, y: number, w: number) =>
  `radial-gradient(${w}% ${w * 1.25}% at ${x}% ${y}%, #1d2a7a 0 30%, #1fb5a8 36% 58%, #f2c94c 63% 76%, transparent 84%)`;

/** the look of each background: layered gradients, the shine and shade on top */
const BACKGROUNDS: Record<string, string> = {
  sunset: [SHINE, SHADE, glow(72, 30, 'rgba(255, 236, 140, 0.75)', '45% 38%'), 'linear-gradient(165deg, #ffd06b 0%, #ff8a4c 35%, #f0507a 68%, #8e2d8f 100%)'].join(', '),
  ocean: [
    SHINE,
    SHADE,
    glow(28, 30, 'rgba(160, 250, 255, 0.6)', '50% 40%'),
    'repeating-radial-gradient(120% 60% at 50% 130%, rgba(255, 255, 255, 0.07) 0 3px, transparent 3px 11px)',
    'linear-gradient(165deg, #6ff2ff 0%, #2aa8ff 38%, #1f52d9 72%, #142b86 100%)',
  ].join(', '),
  forest: [SHINE, SHADE, glow(30, 28, 'rgba(210, 255, 160, 0.55)', '50% 40%'), 'linear-gradient(165deg, #b4f5a0 0%, #3ccf84 35%, #12876a 70%, #08463f 100%)'].join(', '),
  grape: [SHINE, SHADE, glow(70, 30, 'rgba(255, 170, 240, 0.5)', '50% 40%'), 'linear-gradient(165deg, #e6bcff 0%, #a463ff 35%, #5d27cf 70%, #2b0e70 100%)'].join(', '),
  candy: [
    SHINE,
    glow(25, 30, 'rgba(255, 255, 255, 0.6)', '40% 32%'),
    'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0 6px, transparent 6px 14px)',
    'linear-gradient(165deg, #ffe0f0 0%, #ff9ccf 45%, #ff8fa8 70%, #ffb07c 100%)',
  ].join(', '),
  mint: [
    SHINE,
    SHADE,
    glow(70, 26, 'rgba(255, 255, 255, 0.5)', '42% 34%'),
    'linear-gradient(165deg, #e2fff2 0%, #8ff2cc 32%, #33c9a4 66%, #127f80 100%)',
  ].join(', '),
  fire: [
    SHINE,
    glow(50, 88, 'rgba(255, 228, 100, 0.9)', '62% 46%'),
    glow(22, 72, 'rgba(255, 170, 60, 0.65)', '32% 24%'),
    glow(80, 70, 'rgba(255, 120, 40, 0.55)', '30% 26%'),
    'linear-gradient(172deg, #ffa043 0%, #f4452b 50%, #b0131f 80%, #5c0812 100%)',
  ].join(', '),
  ice: [
    SHINE,
    glow(30, 28, 'rgba(255, 255, 255, 0.9)', '40% 26%'),
    'repeating-linear-gradient(60deg, rgba(255, 255, 255, 0.18) 0 2px, transparent 2px 9px)',
    'repeating-linear-gradient(-60deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 12px)',
    'linear-gradient(165deg, #ffffff 0%, #c6ecff 40%, #6cc2f7 75%, #2f86d6 100%)',
  ].join(', '),
  night: [
    star(22, 28, 1.2),
    star(70, 18),
    star(84, 58, 1.4, '#dfe6ff'),
    star(32, 80),
    star(56, 42),
    star(14, 55, 0.9),
    glow(76, 24, 'rgba(255, 246, 210, 0.5)', '22% 22%'),
    SHINE,
    'linear-gradient(165deg, #4152c4 0%, #232b80 45%, #10154a 75%, #070922 100%)',
  ].join(', '),
  peacock: [
    SHINE,
    eye(15, 24, 13),
    eye(86, 20, 11),
    eye(86, 80, 13),
    eye(14, 82, 11),
    glow(60, 30, 'rgba(120, 255, 210, 0.45)', '50% 40%'),
    'linear-gradient(165deg, #3fe0c5 0%, #12a1a6 32%, #0d5f92 66%, #0b2a66 100%)',
  ].join(', '),
  gold: [
    glow(30, 20, 'rgba(255, 255, 255, 0.8)', '70% 45%'),
    star(74, 26, 1.6, '#fffbe6'),
    star(22, 64, 1.2, '#fffbe6'),
    SHADE,
    'linear-gradient(135deg, #fff4bf 0%, #f7c94f 26%, #b9840c 50%, #fbe08a 70%, #9a6a12 100%)',
  ].join(', '),
  galaxy: [
    star(20, 30, 1.2),
    star(76, 22),
    star(62, 74, 1.4, '#ffe4ff'),
    star(32, 68),
    star(88, 48, 1, '#cfe3ff'),
    glow(70, 34, 'rgba(240, 100, 220, 0.65)', '55% 40%'),
    glow(24, 76, 'rgba(70, 160, 255, 0.6)', '50% 40%'),
    glow(50, 52, 'rgba(255, 255, 255, 0.18)', '30% 14%'),
    SHINE,
    'linear-gradient(165deg, #6a46c2 0%, #2f1d6a 50%, #120a36 80%, #06031a 100%)',
  ].join(', '),
  rainbow: [
    SHINE,
    'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.4), transparent 58%)',
    'conic-gradient(from 200deg, #ff5f6d, #ffb347, #f9f871, #47e891, #34d3ff, #5b7cff, #b36cff, #ff5f9e, #ff5f6d)',
  ].join(', '),
  aurora: [
    star(18, 20),
    star(80, 16, 1.2),
    star(64, 34, 0.9),
    'radial-gradient(70% 22% at 40% 46%, rgba(80, 255, 170, 0.7), transparent 70%)',
    'radial-gradient(60% 18% at 64% 34%, rgba(110, 200, 255, 0.55), transparent 70%)',
    'radial-gradient(64% 20% at 50% 60%, rgba(190, 110, 255, 0.55), transparent 70%)',
    SHINE,
    'linear-gradient(175deg, #0c2a52 0%, #0a1a3c 45%, #0b0f2c 75%, #050816 100%)',
  ].join(', '),
};

/** the special backgrounds: a slow light sweep and a glowing ring */
const SHIMMER = new Set(['gold', 'galaxy', 'rainbow', 'aurora']);

export interface AvatarLook {
  /** an emoji face, or null for a character */
  emoji: string | null;
  /** a girl or boy character id (lib/characters.ts), or null for an emoji */
  character: string | null;
  background: string;
  bgId: string;
  shimmer: boolean;
}

/** what to draw for a stored avatar ("face.bg"); null shows the first letter */
export function avatarLook(avatar: string | null | undefined): AvatarLook | null {
  const parts = parseAvatar(avatar);
  if (!parts) return null;
  const background = BACKGROUNDS[parts.bg.id];
  if (!background) return null;
  const face = parts.face;
  const emoji = 'emoji' in face ? face.emoji : null;
  return { emoji, character: emoji ? null : face.id, background, bgId: parts.bg.id, shimmer: SHIMMER.has(parts.bg.id) };
}

/** a background's look on its own, for the picker */
export const backgroundCss = (id: string) => BACKGROUNDS[id] ?? BACKGROUNDS.sunset;

export const faceUnlocked = (face: { level: number }, level: number) => level >= face.level;
export const bgUnlocked = (bg: AvatarBackground, level: number) => level >= bg.level;

export const avatarValue = (faceId: string, bgId: string) => `${faceId}.${bgId}`;

/** a character's display name: its id, capitalised */
export const characterName = (id: string) => id[0].toUpperCase() + id.slice(1);

/** display names for the backgrounds */
export const BACKGROUND_NAMES: Record<string, string> = {
  sunset: 'Sunset',
  ocean: 'Ocean',
  forest: 'Forest',
  grape: 'Grape',
  candy: 'Candy',
  fire: 'Fire',
  ice: 'Ice',
  night: 'Night',
  gold: 'Gold',
  galaxy: 'Galaxy',
  rainbow: 'Rainbow',
  mint: 'Mint',
  peacock: 'Peacock',
  aurora: 'Aurora',
};
