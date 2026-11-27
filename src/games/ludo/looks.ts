// Ludo looks: board themes, goti styles and dice skins, unlocked by level and chosen per phone
import { useEffect, useState } from 'react';
import { loadPref, savePref } from '../../lib/storage';

export interface LudoLook {
  id: string;
  name: string;
  emoji: string;
  /** level that unlocks it */
  level: number;
}

export const LUDO_BOARDS: LudoLook[] = [
  { id: 'classic', name: 'Classic', emoji: '🎲', level: 1 },
  { id: 'wood', name: 'Wood', emoji: '🪵', level: 3 },
  { id: 'neon', name: 'Neon', emoji: '🌃', level: 6 },
  { id: 'royal', name: 'Royal', emoji: '👑', level: 10 },
];

export const LUDO_GOTIS: LudoLook[] = [
  { id: 'glossy', name: 'Glossy', emoji: '🔴', level: 1 },
  { id: 'marble', name: 'Marble', emoji: '⚪', level: 4 },
  { id: 'gem', name: 'Gem', emoji: '💎', level: 8 },
];

export const LUDO_DICE: LudoLook[] = [
  { id: 'ivory', name: 'Ivory', emoji: '🎲', level: 1 },
  { id: 'ruby', name: 'Ruby', emoji: '♦️', level: 2 },
  { id: 'neon', name: 'Neon', emoji: '💡', level: 5 },
  { id: 'gold', name: 'Gold', emoji: '🥇', level: 7 },
];

export type LudoLookKind = 'board' | 'goti' | 'dice';
export const LUDO_LOOK_LISTS: Record<LudoLookKind, LudoLook[]> = { board: LUDO_BOARDS, goti: LUDO_GOTIS, dice: LUDO_DICE };

export interface LudoLooks {
  board: string;
  goti: string;
  dice: string;
}

const KEY = (k: LudoLookKind) => `ludo.${k}`;
const EVENT = 'ludo-looks';

/** the saved pick, or the first look when it is missing or locked at this level */
function picked(kind: LudoLookKind, level: number): string {
  const list = LUDO_LOOK_LISTS[kind];
  const saved = loadPref(KEY(kind));
  const look = list.find((l) => l.id === saved && l.level <= level);
  return (look ?? list[0]).id;
}

export const loadLudoLooks = (level: number): LudoLooks => ({ board: picked('board', level), goti: picked('goti', level), dice: picked('dice', level) });

/** saves one pick on this phone and tells every open Ludo screen */
export function saveLudoLook(kind: LudoLookKind, id: string): void {
  savePref(KEY(kind), id);
  window.dispatchEvent(new Event(EVENT));
}

/** this phone's Ludo looks, kept in step when they change */
export function useLudoLooks(level: number): LudoLooks {
  const [looks, setLooks] = useState(() => loadLudoLooks(level));
  useEffect(() => {
    const update = () => setLooks(loadLudoLooks(level));
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, [level]);
  return looks;
}
