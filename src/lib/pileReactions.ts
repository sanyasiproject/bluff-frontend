import { useSyncExternalStore } from 'react';

/** an emoji someone dropped on the last play (long-press the pile) */
export interface PileReaction {
  key: number;
  emoji: string;
  who: string;
}

/** how long one shows on the pile */
const SHOW_MS = 2500;

let items: PileReaction[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

/** kept apart from the floating reactions; a few can stack */
export function pushPileReaction(emoji: string, who: string): void {
  const r = { key: ++seq, emoji, who };
  items = [...items.slice(-3), r];
  notify();
  window.setTimeout(() => {
    items = items.filter((x) => x !== r);
    notify();
  }, SHOW_MS);
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** the reactions on the pile right now */
export const usePileReactions = () => useSyncExternalStore(subscribe, () => items);
