import { useEffect, useState } from 'react';
import type { DmUnreadResponse } from '../types';
import { api } from './api';
import { socket } from './socket';

const EMPTY: DmUnreadResponse = { total: 0, byFriend: {} };

/** one shared unread count for every screen that shows it */
let current: DmUnreadResponse = EMPTY;
let token: string | null = null;
const listeners = new Set<(u: DmUnreadResponse) => void>();
let wired = false;

const set = (u: DmUnreadResponse) => {
  current = u;
  for (const l of listeners) l(u);
};

/** reads the unread counts again (after a new message, a read, or a reconnect) */
export async function refreshUnread(): Promise<void> {
  const t = token;
  if (!t) return set(EMPTY);
  try {
    const res = await api<DmUnreadResponse>('/friends/unread', { token: t });
    if (t === token) set(res);
  } catch {
    // keep the last counts
  }
}

function wire() {
  if (wired) return;
  wired = true;
  const again = () => void refreshUnread();
  socket.on('dm', again);
  socket.on('dm:read', again);
  socket.on('connect', again);
  socket.on('friends:changed', again);
}

/** unread private messages (total and per friend) for this login; empty for guests */
export function useDmUnread(authToken: string | null): DmUnreadResponse {
  const [u, setU] = useState(current);
  useEffect(() => {
    wire();
    listeners.add(setU);
    if (authToken !== token) {
      token = authToken;
      set(EMPTY);
      void refreshUnread();
    } else {
      setU(current);
    }
    return () => {
      listeners.delete(setU);
    };
  }, [authToken]);
  return u;
}
