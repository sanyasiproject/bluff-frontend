// When each game was last played on this phone, for the home grid's "Last played" mark
import { loadPref, savePref } from '../lib/storage';
import type { GameKind } from '../types';

const KEY = 'lastPlayed';

export function loadLastPlayed(): Partial<Record<GameKind, number>> {
  try {
    const v = JSON.parse(loadPref(KEY) ?? '{}') as unknown;
    return v && typeof v === 'object' ? (v as Partial<Record<GameKind, number>>) : {};
  } catch {
    return {};
  }
}

export function markPlayed(kind: GameKind): void {
  savePref(KEY, JSON.stringify({ ...loadLastPlayed(), [kind]: Date.now() }));
}

/** the game played most recently on this phone, if any */
export function lastGame(): GameKind | null {
  const all = Object.entries(loadLastPlayed()) as [GameKind, number][];
  return all.length ? all.sort((a, b) => b[1] - a[1])[0][0] : null;
}

const COUNT_KEY = 'playCount';

/** how many games of each kind this phone started */
function loadCounts(): Partial<Record<GameKind, number>> {
  try {
    const v = JSON.parse(loadPref(COUNT_KEY) ?? '{}') as unknown;
    return v && typeof v === 'object' ? (v as Partial<Record<GameKind, number>>) : {};
  } catch {
    return {};
  }
}

export function countPlayed(kind: GameKind): void {
  const all = loadCounts();
  savePref(COUNT_KEY, JSON.stringify({ ...all, [kind]: (all[kind] ?? 0) + 1 }));
}

/** the games played most on this phone, most first */
export function mostPlayed(n: number): GameKind[] {
  return (Object.entries(loadCounts()) as [GameKind, number][]).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}
