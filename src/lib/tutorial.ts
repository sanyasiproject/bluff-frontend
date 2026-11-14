// The practice lessons: everyone sees each one once (per account, or per phone for guests)
import type { GameKind } from '../types';
import type { Auth } from '../useAuth';
import { loadPref, savePref } from './storage';

/** a local copy, so a lesson stays done even if the server couldn't be told */
const localKey = (auth: Auth, game: GameKind) => (auth.user ? `tutorial.${auth.user.id}.${game}` : `tutorial.${game}`);

export function tutorialSeen(auth: Auth, game: GameKind): boolean {
  if (auth.user?.tutorials?.includes(game)) return true;
  return loadPref(localKey(auth, game)) === '1';
}

/** finished or skipped: it isn't offered again (it stays open from How to play) */
export function markTutorialSeen(auth: Auth, game: GameKind): void {
  savePref(localKey(auth, game), '1');
  if (auth.user) void auth.markTutorial(game);
}

export const gameName = (game: GameKind) => (game === 'crazy7' ? 'Crazy 7' : 'Bluff');
