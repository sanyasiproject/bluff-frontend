// This phone's offline play: the last setup per game and the game in progress (so closing the app resumes it)
import { fitSetup, isOfflineKind, type OfflineKind, type OfflineSetup } from './games';

const SETUP_KEY = 'bluff.offline.setup';
const GAME_KEY = 'bluff.offline.game';

export interface SavedGame {
  setup: OfflineSetup;
  /** the runner's own snapshot */
  state: unknown;
  savedAt: number;
}

const get = (k: string): unknown => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const put = (k: string, v: unknown) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // storage full or blocked: the game just won't resume
  }
};

const validSetup = (s: unknown): s is OfflineSetup => {
  const x = s as OfflineSetup | null;
  return !!x && isOfflineKind(x.kind) && Array.isArray(x.seats) && x.seats.every((p) => typeof p?.id === 'string' && typeof p?.name === 'string');
};

/** the setup last played per game, and which game was last */
export function loadSetups(): { last: OfflineKind | null; byKind: Partial<Record<OfflineKind, OfflineSetup>> } {
  const v = get(SETUP_KEY) as { last?: unknown; byKind?: Record<string, unknown> } | null;
  const byKind: Partial<Record<OfflineKind, OfflineSetup>> = {};
  for (const [k, s] of Object.entries(v?.byKind ?? {})) if (isOfflineKind(k) && validSetup(s)) byKind[k] = fitSetup(s);
  return { last: isOfflineKind(v?.last) ? v.last : null, byKind };
}

export function saveSetup(s: OfflineSetup) {
  const cur = loadSetups();
  put(SETUP_KEY, { last: s.kind, byKind: { ...cur.byKind, [s.kind]: s } });
}

export function loadGame(): SavedGame | null {
  const v = get(GAME_KEY) as SavedGame | null;
  return v && validSetup(v.setup) && v.state != null ? v : null;
}

export const saveGame = (g: SavedGame | null) => put(GAME_KEY, g);
