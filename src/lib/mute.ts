import { useSyncExternalStore } from 'react';
import type { RoomView } from '../types';

// players I muted, just for me: their chat, emojis, throws and live voice don't reach me
const KEY = 'bluff.muted';
const listeners = new Set<() => void>();
/** logged-in players by username, kept on this phone; guests by member id, for this visit only */
let muted = new Set<string>(load());
let version = 0;

function load(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...muted].filter((k) => k.startsWith('u:'))));
  } catch {
    // private mode: muted for this visit only
  }
}

/** the key a player is muted under */
export const muteKeyOf = (p: { id: string; username: string | null }) => (p.username ? `u:${p.username}` : `m:${p.id}`);

export const isMuted = (p: { id: string; username: string | null }) => muted.has(muteKeyOf(p));

export function setMuted(p: { id: string; username: string | null }, on: boolean): void {
  const key = muteKeyOf(p);
  if (on === muted.has(key)) return;
  muted = new Set(muted);
  if (on) muted.add(key);
  else muted.delete(key);
  version++;
  save();
  listeners.forEach((l) => l());
}

/** a member of this room I muted (seated or watching) */
export function mutedMember(view: RoomView | null | undefined, memberId: string): boolean {
  if (!view || memberId === view.meId) return false;
  const p = [...view.players, ...view.watchers].find((x) => x.id === memberId);
  return !!p && isMuted(p);
}

export function onMuteChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** re-renders when the muted list changes */
export function useMuteVersion(): number {
  return useSyncExternalStore(onMuteChange, () => version);
}
