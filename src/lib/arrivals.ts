import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

interface Options<T extends { id: string }> {
  /** my hand as the server sends it */
  hand: T[];
  /** my hand on screen (cards carry data-card) */
  handRef: RefObject<HTMLElement>;
  /** where picked cards come from: the deck */
  source: () => DOMRect | null | undefined;
  /** off for watchers, portrait, or while a deal runs */
  enabled: boolean;
  /** start one card's flight; call done when it has landed */
  launch: (card: T, from: DOMRect, to: DOMRect, delay: number, done: () => void) => void;
}

/**
 * cards that just came into my hand from the deck: each one's place stays empty while it flies in from the deck
 * and lands exactly there. Returns the ids still on their way (to hide them in the hand until they land)
 */
export function useArrivals<T extends { id: string }>({ hand, handRef, source, enabled, launch }: Options<T>): string[] {
  const prev = useRef<Set<string> | null>(null);
  const [arriving, setArriving] = useState<string[]>([]);

  useLayoutEffect(() => {
    const ids = new Set(hand.map((c) => c.id));
    const before = prev.current;
    prev.current = ids;
    if (!before || !enabled) return;
    const added = hand.filter((c) => !before.has(c.id));
    // nothing new, or a whole new hand (a deal, a rematch, a 7-0 swap): not a pick
    if (added.length === 0 || before.size === 0 || added.length >= hand.length) return;
    const from = source();
    if (!from) return;
    const list = added.slice(-8);
    setArriving((a) => [...a, ...list.map((c) => c.id)]);
    // once the hand has laid the new cards out, each flies to its own place
    requestAnimationFrame(() => {
      list.forEach((card, i) => {
        const done = () => setArriving((a) => a.filter((x) => x !== card.id));
        const el = handRef.current?.querySelector<HTMLElement>(`[data-card="${CSS.escape(card.id)}"]`);
        if (!el) return done();
        const r = el.getBoundingClientRect();
        // the card's own size, centred where it sits (a leaning card's box is wider than the card)
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const to = new DOMRect(r.left + r.width / 2 - w / 2, r.top + r.height / 2 - h / 2, w, h);
        launch(card, from, to, i * 150, done);
      });
    });
  }, [hand]);

  return arriving;
}

/** css that keeps cards still on their way invisible in the hand (their place stays, empty) */
export const arrivingCss = (ids: string[]) => ids.map((id) => `[data-card="${CSS.escape(id)}"]{visibility:hidden}`).join('');
