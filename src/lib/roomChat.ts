import { useEffect, useSyncExternalStore } from 'react';
import type { RoomMessage } from '../types';
import { socket } from './socket';

// the current room's chat list, kept on the server while the room exists; the app holds a copy
let code: string | null = null;
let messages: RoomMessage[] = [];
/** the newest line already seen (tray opened) */
let seenId = 0;
/** a fresh connection: the list is fetched again once the room's state arrives */
let stale = true;
let version = 0;
const listeners = new Set<() => void>();
const SEEN_KEY = 'bluff.roomChatSeen';

/** what I'd read in this room, kept across a reload of the page */
function loadSeen(forCode: string): number {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? 'null') as { code?: unknown; id?: unknown } | null;
    return saved?.code === forCode && typeof saved.id === 'number' ? saved.id : 0;
  } catch {
    return 0;
  }
}

function changed(): void {
  version++;
  listeners.forEach((l) => l());
}

socket.on('room:msg', (m: RoomMessage) => {
  if (!code || messages.some((x) => x.id === m.id)) return;
  messages = [...messages, m];
  changed();
});
socket.on('connect', () => {
  stale = true;
});

async function load(forCode: string): Promise<void> {
  stale = false;
  try {
    const res = (await socket.timeout(5000).emitWithAck('room:messages', {})) as { ok: boolean; messages?: RoomMessage[] };
    // older servers have no room chat: keep what we have
    if (code !== forCode || !res.ok || !Array.isArray(res.messages)) return;
    // lines that came in while loading are in the list already
    const ids = new Set(res.messages.map((m) => m.id));
    messages = [...res.messages, ...messages.filter((m) => !ids.has(m.id))].sort((a, b) => a.id - b.id);
    changed();
  } catch {
    stale = true;
  }
}

/** keeps the copy in step with the room I'm in; call with every view */
export function useRoomChatSync(roomCode: string | null): void {
  useEffect(() => {
    if (roomCode !== code) {
      code = roomCode;
      messages = [];
      seenId = roomCode ? loadSeen(roomCode) : 0;
      stale = true;
      changed();
    }
    if (roomCode && stale) void load(roomCode);
  });
}

export function useRoomMessages(): RoomMessage[] {
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => version,
  );
  return messages;
}

/** lines from others since the tray was last opened */
export const unreadOf = (list: RoomMessage[], meId: string) => list.filter((m) => m.id > seenId && m.from !== meId).length;

export function markSeen(): void {
  const last = messages.length > 0 ? messages[messages.length - 1].id : 0;
  if (last === seenId) return;
  seenId = last;
  try {
    if (code) sessionStorage.setItem(SEEN_KEY, JSON.stringify({ code, id: last }));
  } catch {
    // private mode: counts start again after a reload
  }
  changed();
}

/** sends a typed line; the error to show, or null */
export async function sayInRoom(text: string): Promise<string | null> {
  try {
    const res = (await socket.timeout(5000).emitWithAck('room:say', { text })) as { ok: boolean; error?: string };
    return res.ok ? null : (res.error ?? 'Could not send');
  } catch {
    return 'No connection, try again';
  }
}
