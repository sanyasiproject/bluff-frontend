// The last account seen on this phone, so Home shows the player right away while a sleeping server wakes up
import { loadAuthToken, loadPref, savePref } from './storage';
import type { PublicUser } from '../types';

const KEY = 'userCache';

/** the cached account, only while a login token is saved */
export function loadCachedUser(): PublicUser | null {
  if (!loadAuthToken()) return null;
  try {
    const raw = loadPref(KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function saveCachedUser(user: PublicUser | null) {
  savePref(KEY, user ? JSON.stringify(user) : '');
}
