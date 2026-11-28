// Each registry game's table download, shared by the lazy tables and the prefetch so the chunk is fetched once
import type { ComponentType } from 'react';
import { isPlugged, type GameKind, type PluggedKind } from '../types';
import type { TableProps } from './registry';
import { lastGame, mostPlayed } from './lastPlayed';
import { retryImport } from '../lib/lazyRetry';

type Load = () => Promise<ComponentType<TableProps>>;

export const TABLE_LOADS: Record<PluggedKind, Load> = {
  ludo: () => import('./ludo/LudoTable').then((m) => m.LudoTable),
  snakes: () => import('./snakes/SnakesTable').then((m) => m.SnakesTable),
  rmcs: () => import('./rmcs/RmcsTable').then((m) => m.RmcsTable),
  fruit: () => import('./fruit/FruitTable').then((m) => m.FruitTable),
  spikes: () => import('./spikes/SpikesTable').then((m) => m.SpikesTable),
  darts: () => import('./darts/DartsTable').then((m) => m.DartsTable),
  colorwar: () => import('./colorwar/ColorWarTable').then((m) => m.ColorWarTable),
  dots: () => import('./dots/DotsTable').then((m) => m.DotsTable),
  chess: () => import('./chess/ChessTable').then((m) => m.ChessTable),
  carrom: () => import('./carrom/CarromTable').then((m) => m.CarromTable),
  bomb: () => import('./bomb/BombTable').then((m) => m.BombTable),
  seabattle: () => import('./seabattle/SeaTable').then((m) => m.SeaTable),
  gomoku: () => import('./gomoku/GomokuTable').then((m) => m.GomokuTable),
  uttt: () => import('./uttt/UtttTable').then((m) => m.UtttTable),
  wordhunt: () => import('./wordhunt/WordHuntTable').then((m) => m.WordHuntTable),
};

const started = new Set<PluggedKind>();
/** tables already downloaded: drawn straight away, without a Suspense pass */
export const LOADED: Partial<Record<PluggedKind, ComponentType<TableProps>>> = {};

/** download a game's table once; remembers it for LOADED */
export function loadTable(kind: PluggedKind): Promise<ComponentType<TableProps>> {
  return retryImport(TABLE_LOADS[kind])().then((T) => (LOADED[kind] = T));
}

/** start downloading a game's table now (no-op for hand-wired games or one already fetched); errors are ignored */
export function prefetchTable(kind: GameKind | null | undefined): void {
  if (!kind || !isPlugged(kind) || started.has(kind)) return;
  started.add(kind);
  loadTable(kind).catch(() => started.delete(kind));
}

/** run once the page is idle (requestIdleCallback, else ~2 s later); returns a cancel */
export function whenIdle(fn: () => void): () => void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(fn, 2000);
  return () => window.clearTimeout(t);
}

/** home is idle: fetch the tables of the games this phone plays most and last (their shared pieces come with them) */
export function prefetchFavourites(): void {
  for (const kind of new Set([lastGame(), ...mostPlayed(2)])) prefetchTable(kind);
}
