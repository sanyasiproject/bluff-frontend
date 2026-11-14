import { useEffect, useState } from 'react';
import { levelOf } from '../types';
import type { Auth } from '../useAuth';
import { loadPref, savePref } from './storage';

// Table themes and card backs: cosmetic only, unlocked by level, chosen per account on this phone

export interface TableLook {
  id: string;
  name: string;
  emoji: string;
  /** level that unlocks it */
  level: number;
  /** light, felt and deep shades, for the swatch */
  colors: [string, string, string];
  /** phone status bar colour */
  bar: string;
}

export interface BackLook {
  id: string;
  name: string;
  emoji: string;
  level: number;
}

export const DEFAULT_TABLE = 'classic';
export const DEFAULT_BACK = 'classic';

export const TABLES: TableLook[] = [
  { id: 'classic', name: 'Classic green', emoji: '🟢', level: 1, colors: ['#177650', '#0e4d35', '#05261a'], bar: '#062a1d' },
  { id: 'royal', name: 'Royal blue', emoji: '🔵', level: 3, colors: ['#2a5bb8', '#163a7a', '#08183a'], bar: '#08183a' },
  { id: 'wood', name: 'Wooden', emoji: '🪵', level: 6, colors: ['#9a6a3c', '#6b4423', '#2b170a'], bar: '#2b170a' },
  { id: 'midnight', name: 'Midnight', emoji: '🌙', level: 10, colors: ['#2c3550', '#161b2e', '#07090f'], bar: '#07090f' },
  { id: 'maroon', name: 'Maroon velvet', emoji: '🍷', level: 15, colors: ['#8a1f3a', '#5a0f24', '#24040e'], bar: '#24040e' },
  { id: 'emerald', name: 'Emerald gold', emoji: '✨', level: 20, colors: ['#12b585', '#06664a', '#01261c'], bar: '#01261c' },
  { id: 'galaxy', name: 'Galaxy', emoji: '🌌', level: 30, colors: ['#5b3fa8', '#2a1b5e', '#0a0620'], bar: '#0a0620' },
];

export const BACKS: BackLook[] = [
  { id: 'classic', name: 'Classic red', emoji: '🟥', level: 1 },
  { id: 'ocean', name: 'Ocean blue', emoji: '🌊', level: 2 },
  { id: 'paisley', name: 'Paisley', emoji: '🌼', level: 5 },
  { id: 'neon', name: 'Neon', emoji: '💡', level: 8 },
  { id: 'gold', name: 'Royal gold', emoji: '👑', level: 12 },
  { id: 'mandala', name: 'Mandala', emoji: '🪷', level: 18 },
  { id: 'diamond', name: 'Diamond', emoji: '💎', level: 25 },
  { id: 'legend', name: 'Legend', emoji: '🏆', level: 40 },
];

export interface LookChoice {
  table: string;
  back: string;
}

const prefKey = (owner: string) => `look.${owner}`;
const listeners = new Set<() => void>();

function saved(owner: string): Partial<LookChoice> {
  try {
    const raw = loadPref(prefKey(owner));
    return raw ? (JSON.parse(raw) as Partial<LookChoice>) : {};
  } catch {
    return {};
  }
}

/** what this player sees: their saved choice while their level allows it, otherwise the defaults */
export function currentLook(owner: string | null, level: number): LookChoice {
  if (!owner) return { table: DEFAULT_TABLE, back: DEFAULT_BACK };
  const s = saved(owner);
  const table = TABLES.find((t) => t.id === s.table && t.level <= level)?.id ?? DEFAULT_TABLE;
  const back = BACKS.find((b) => b.id === s.back && b.level <= level)?.id ?? DEFAULT_BACK;
  return { table, back };
}

/** saves a choice for this player on this phone and repaints the app */
export function setLook(owner: string, level: number, change: Partial<LookChoice>): LookChoice {
  const next = { ...currentLook(owner, level), ...change };
  savePref(prefKey(owner), JSON.stringify(next));
  listeners.forEach((fn) => fn());
  return currentLook(owner, level);
}

/** looks first unlocked at exactly this level (for the level-up screen) */
export function unlocksAt(level: number): { tables: TableLook[]; backs: BackLook[] } {
  return { tables: TABLES.filter((t) => t.level === level), backs: BACKS.filter((b) => b.level === level) };
}

/** the next look still locked at this level, table or back, whichever comes first */
export function nextUnlock(level: number): (TableLook | BackLook) | null {
  const locked = [...TABLES, ...BACKS].filter((l) => l.level > level).sort((a, b) => a.level - b.level);
  return locked[0] ?? null;
}

/** paints the chosen table and card back on the whole app; guests always see the defaults */
export function useLook(auth: Auth): void {
  const owner = auth.user?.id ?? null;
  const level = auth.user ? levelOf(auth.user.stats) : 1;
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);

  useEffect(() => {
    const look = currentLook(owner, level);
    const root = document.documentElement;
    root.dataset.table = look.table;
    root.dataset.back = look.back;
    // the phone's status bar follows the table
    const bar = TABLES.find((t) => t.id === look.table)?.bar;
    if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
  }, [owner, level, version]);
}
