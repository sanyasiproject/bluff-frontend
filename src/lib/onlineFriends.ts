import { useEffect, useState } from 'react';
import type { FriendView, FriendsResponse } from '../types';
import { api } from './api';
import { socket } from './socket';

/** how often the list is read again while something on screen shows it */
const POLL_MS = 20_000;
/** a friend:online burst is read once, a moment later */
const BURST_MS = 1_500;

type Listener = (friends: FriendView[] | null) => void;

/** one shared friends list for the Home strip and the corner count, so they read the server once between them */
let friends: FriendView[] | null = null;
let token: string | null = null;
const listeners = new Set<Listener>();
let pollTimer: number | undefined;
let burstTimer: number | undefined;
let loading = false;

const emit = () => listeners.forEach((l) => l(friends));

/** reads the friends list now; quietly keeps the old one if it fails */
export async function refreshOnlineFriends(): Promise<void> {
  if (!token || loading || document.hidden) return;
  loading = true;
  const asked = token;
  try {
    const res = await api<FriendsResponse>('/friends', { token: asked });
    // logged out or switched account while it was loading
    if (asked !== token) return;
    friends = res.friends;
    emit();
  } catch {
    // keep what we had; the next poll tries again
  } finally {
    loading = false;
  }
}

const onOnline = () => {
  window.clearTimeout(burstTimer);
  burstTimer = window.setTimeout(() => void refreshOnlineFriends(), BURST_MS);
};

const onVisible = () => {
  if (!document.hidden) void refreshOnlineFriends();
};

function start(): void {
  void refreshOnlineFriends();
  pollTimer = window.setInterval(() => void refreshOnlineFriends(), POLL_MS);
  socket.on('friend:online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
}

function stop(): void {
  window.clearInterval(pollTimer);
  window.clearTimeout(burstTimer);
  socket.off('friend:online', onOnline);
  document.removeEventListener('visibilitychange', onVisible);
}

/** this account's friends, kept fresh while on screen; null for guests or until first read */
export function useOnlineFriends(authToken: string | null | undefined): FriendView[] | null {
  const [list, setList] = useState<FriendView[] | null>(() => (authToken && authToken === token ? friends : null));

  useEffect(() => {
    if (!authToken) {
      setList(null);
      return;
    }
    // another account: forget the old list
    if (authToken !== token) {
      token = authToken;
      friends = null;
      emit();
      if (listeners.size > 0) void refreshOnlineFriends();
    }
    setList(friends);
    listeners.add(setList);
    if (listeners.size === 1) start();
    return () => {
      listeners.delete(setList);
      if (listeners.size === 0) stop();
    };
  }, [authToken]);

  return list;
}

/** online friends first: free ones, then in a lobby, then in a game; each group by name */
export function onlineFirst(list: FriendView[]): FriendView[] {
  const busy = (f: FriendView) => (f.inRoom === null ? 0 : f.roomPhase === 'playing' ? 2 : 1);
  return list
    .filter((f) => f.online)
    .sort((a, b) => busy(a) - busy(b) || a.displayName.localeCompare(b.displayName));
}

/** the friend seen most recently among those offline, for the empty line */
export function lastSeenFriend(list: FriendView[]): FriendView | null {
  return list
    .filter((f) => !f.online && f.lastSeen)
    .reduce<FriendView | null>((best, f) => (!best || f.lastSeen! > best.lastSeen! ? f : best), null);
}
