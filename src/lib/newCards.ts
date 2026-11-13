import { useEffect, useRef, useState } from 'react';
import type { Card } from '../types';

/** how long cards that just came into my hand stay marked */
export const NEW_CARD_MS = 3000;

interface Options {
  /** wait while this is true (a reveal still open), then mark them */
  hold?: () => boolean;
  /** a new deal when this changes: nothing in it is new */
  reset?: unknown;
}

/** ids of cards that just came into my hand (picked up or picked), marked for a few seconds so they're easy to find */
export function useNewCards(hand: Card[], { hold, reset }: Options = {}): string[] {
  const [ids, setIds] = useState<string[]>([]);
  const prev = useRef<string[] | null>(null);
  const prevReset = useRef(reset);
  /** arrived, not marked yet */
  const waiting = useRef<string[]>([]);
  /** about to be marked once they've landed */
  const landing = useRef<string[]>([]);
  const timer = useRef<number>();

  useEffect(() => {
    const now = hand.map((c) => c.id);
    const before = prev.current;
    prev.current = now;
    if (!Object.is(prevReset.current, reset)) {
      prevReset.current = reset;
      waiting.current = [];
      landing.current = [];
      window.clearTimeout(timer.current);
      setIds([]);
      return;
    }
    if (!before) return;
    const had = new Set(before);
    // a card already played away is no longer new
    waiting.current = [...waiting.current.filter((id) => now.includes(id)), ...now.filter((id) => !had.has(id))];
  }, [hand, reset]);

  // runs after every render, so it notices as soon as nothing holds it back
  useEffect(() => {
    if (waiting.current.length === 0 || hold?.()) return;
    landing.current = [...landing.current, ...waiting.current];
    waiting.current = [];
    window.clearTimeout(timer.current);
    // a moment for the cards to land in the hand first
    timer.current = window.setTimeout(() => {
      const add = landing.current;
      landing.current = [];
      setIds((cur) => [...new Set([...cur, ...add])]);
      timer.current = window.setTimeout(() => setIds([]), NEW_CARD_MS);
    }, 350);
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const inHand = new Set(hand.map((c) => c.id));
  return ids.filter((id) => inHand.has(id));
}
