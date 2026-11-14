import { AVATAR_BACKGROUNDS, parseAvatar } from '../types';

export type AvatarBackground = (typeof AVATAR_BACKGROUNDS)[number];

// a soft light from the top, laid over every background
const SHINE = 'radial-gradient(120% 70% at 50% 0%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.08) 45%, transparent 60%)';
// a little shade at the bottom so the face pops
const SHADE = 'radial-gradient(90% 60% at 50% 110%, rgba(0, 0, 0, 0.35), transparent 70%)';

/** the look of each background: layered gradients, the shine and shade on top */
const BACKGROUNDS: Record<string, string> = {
  sunset: `${SHINE}, ${SHADE}, linear-gradient(150deg, #ffb347 0%, #ff6a5c 48%, #e0408f 100%)`,
  ocean: `${SHINE}, ${SHADE}, linear-gradient(150deg, #5ee7ff 0%, #2e9bff 50%, #2348d6 100%)`,
  forest: `${SHINE}, ${SHADE}, linear-gradient(150deg, #7ef0b0 0%, #1fb37a 50%, #0b6f6a 100%)`,
  grape: `${SHINE}, ${SHADE}, linear-gradient(150deg, #c79bff 0%, #8a4dff 50%, #4b1fb0 100%)`,
  candy: `${SHINE}, ${SHADE}, linear-gradient(150deg, #ffd1e8 0%, #ff8fc6 45%, #ffb38a 100%)`,
  fire: [
    SHINE,
    'radial-gradient(60% 45% at 50% 85%, rgba(255, 220, 90, 0.85), transparent 70%)',
    'radial-gradient(30% 20% at 25% 70%, rgba(255, 170, 60, 0.6), transparent 70%)',
    'linear-gradient(170deg, #ff9a3c 0%, #f2412b 55%, #8a0f1a 100%)',
  ].join(', '),
  ice: [
    SHINE,
    'radial-gradient(40% 25% at 30% 30%, rgba(255, 255, 255, 0.85), transparent 70%)',
    'repeating-linear-gradient(60deg, rgba(255, 255, 255, 0.16) 0 2px, transparent 2px 9px)',
    'linear-gradient(160deg, #ffffff 0%, #bfe9ff 45%, #59b7f5 100%)',
  ].join(', '),
  night: [
    'radial-gradient(1.2px 1.2px at 22% 28%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent 51%)',
    'radial-gradient(1.4px 1.4px at 80% 62%, #dfe6ff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 35% 78%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 55% 45%, #fff 50%, transparent 51%)',
    SHINE,
    'linear-gradient(160deg, #3a4bb8 0%, #1d2470 50%, #0a0d33 100%)',
  ].join(', '),
  gold: [
    'radial-gradient(70% 45% at 30% 20%, rgba(255, 255, 255, 0.75), transparent 60%)',
    SHADE,
    'linear-gradient(135deg, #fff2b0 0%, #f6c453 30%, #b8860b 55%, #f9d976 75%, #9a6a12 100%)',
  ].join(', '),
  galaxy: [
    'radial-gradient(1.2px 1.2px at 20% 30%, #fff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 75% 25%, #fff 50%, transparent 51%)',
    'radial-gradient(1.4px 1.4px at 62% 72%, #ffe4ff 50%, transparent 51%)',
    'radial-gradient(1px 1px at 32% 68%, #fff 50%, transparent 51%)',
    'radial-gradient(55% 40% at 70% 35%, rgba(230, 90, 220, 0.6), transparent 70%)',
    'radial-gradient(50% 40% at 25% 75%, rgba(70, 150, 255, 0.55), transparent 70%)',
    SHINE,
    'linear-gradient(160deg, #5b3fa8 0%, #2a1b5e 55%, #0a0620 100%)',
  ].join(', '),
  rainbow: [
    SHINE,
    'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.35), transparent 55%)',
    'conic-gradient(from 200deg, #ff5f6d, #ffc371, #f9f871, #47e891, #4facfe, #a66cff, #ff5f6d)',
  ].join(', '),
};

/** backgrounds that get a slow light sweep */
const SHIMMER = new Set(['gold', 'galaxy', 'rainbow']);

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
};
