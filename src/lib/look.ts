import { useEffect } from 'react';
import { CARD_BACKS, cardBackOf, DEFAULT_CARD_BACK, DEFAULT_TABLE_THEME, levelOf, TABLE_THEMES, tableThemeOf } from '../types';
import type { Auth } from '../useAuth';
import { loadPref, savePref } from './storage';

// Table themes and card backs: cosmetic only, unlocked by level, saved on the account.
// Everyone at the table sees them: your seat box in your table, your face-down cards in your back.

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

export const DEFAULT_TABLE = DEFAULT_TABLE_THEME;
export const DEFAULT_BACK = DEFAULT_CARD_BACK;

/** each table's shades: light, felt, deep, then the status bar */
const TABLE_COLORS: Record<string, [string, string, string, string]> = {
  classic: ['#177650', '#0e4d35', '#05261a', '#062a1d'],
  royal: ['#2a5bb8', '#163a7a', '#08183a', '#08183a'],
  wood: ['#9a6a3c', '#6b4423', '#2b170a', '#2b170a'],
  midnight: ['#2c3550', '#161b2e', '#07090f', '#07090f'],
  maroon: ['#8a1f3a', '#5a0f24', '#24040e', '#24040e'],
  emerald: ['#12b585', '#06664a', '#01261c', '#01261c'],
  galaxy: ['#5b3fa8', '#2a1b5e', '#0a0620', '#0a0620'],
};

export const TABLES: TableLook[] = TABLE_THEMES.map((t) => {
  const [light, felt, deep, bar] = TABLE_COLORS[t.id];
  return { ...t, colors: [light, felt, deep], bar };
});

export const BACKS: BackLook[] = [...CARD_BACKS];

export interface LookChoice {
  table: string;
  back: string;
}

/** this player's look: what the account saved, while their level allows it, otherwise the defaults */
export function currentLook(level: number, tableTheme: string | null, cardBack: string | null): LookChoice {
  const table = tableThemeOf(tableTheme);
  const back = cardBackOf(cardBack);
  return {
    table: table && table.level <= level ? table.id : DEFAULT_TABLE,
    back: back && back.level <= level ? back.id : DEFAULT_BACK,
  };
}

// before looks were saved on the account, each phone kept them here
const legacyKey = (owner: string) => `look.${owner}`;

/** a look picked on this phone before it was saved on the account, to move over once */
function legacyLook(owner: string, level: number): Partial<LookChoice> {
  let old: Partial<LookChoice> = {};
  try {
    const raw = loadPref(legacyKey(owner));
    old = raw ? (JSON.parse(raw) as Partial<LookChoice>) : {};
  } catch {
    return {};
  }
  const table = tableThemeOf(old.table);
  const back = cardBackOf(old.back);
  return {
    table: table && table.level <= level && table.id !== DEFAULT_TABLE ? table.id : undefined,
    back: back && back.level <= level && back.id !== DEFAULT_BACK ? back.id : undefined,
  };
}

/** a player's card back for drawing their cards; the classic one when unknown */
export const backOf = (players: readonly { id: string; back: string }[], id: string | null | undefined): string =>
  players.find((p) => p.id === id)?.back ?? DEFAULT_BACK;

/** looks first unlocked at exactly this level (for the level-up screen) */
export function unlocksAt(level: number): { tables: TableLook[]; backs: BackLook[] } {
  return { tables: TABLES.filter((t) => t.level === level), backs: BACKS.filter((b) => b.level === level) };
}

/** the next look still locked at this level, table or back, whichever comes first */
export function nextUnlock(level: number): (TableLook | BackLook) | null {
  const locked = [...TABLES, ...BACKS].filter((l) => l.level > level).sort((a, b) => a.level - b.level);
  return locked[0] ?? null;
}

/** paints this player's table and own card back (deck, practice, home screen) on the app; guests always see the defaults */
export function useLook(auth: Auth): void {
  const owner = auth.user?.id ?? null;
  const level = auth.user ? levelOf(auth.user.stats) : 1;
  const tableTheme = auth.user?.tableTheme ?? null;
  const cardBack = auth.user?.cardBack ?? null;
  const { setTableTheme, setCardBack } = auth;

  // a look chosen on this phone before it was saved on the account moves over once, so others see it too
  useEffect(() => {
    if (!owner) return;
    const old = legacyLook(owner, level);
    if (!old.table && !old.back) return;
    savePref(legacyKey(owner), '{}');
    if (old.table && tableTheme === null) setTableTheme(old.table).catch(() => {});
    if (old.back && cardBack === null) setCardBack(old.back).catch(() => {});
  }, [owner]);

  useEffect(() => {
    const look = owner ? currentLook(level, tableTheme, cardBack) : { table: DEFAULT_TABLE, back: DEFAULT_BACK };
    const root = document.documentElement;
    root.dataset.table = look.table;
    root.dataset.back = look.back;
    // the phone's status bar follows the table
    const bar = TABLES.find((t) => t.id === look.table)?.bar;
    if (bar) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bar);
  }, [owner, level, tableTheme, cardBack]);
}
