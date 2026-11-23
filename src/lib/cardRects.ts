import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * where each of my cards sat (by data-card id), kept from the render before the last one too,
 * so a card that just left my hand can still fly from its own place
 */
export function useCardRects(ref: RefObject<HTMLElement>) {
  const prev = useRef(new Map<string, DOMRect>());
  const cur = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    prev.current = cur.current;
    const next = new Map<string, DOMRect>();
    ref.current?.querySelectorAll('[data-card]').forEach((el) => {
      const id = el.getAttribute('data-card');
      if (id) next.set(id, el.getBoundingClientRect());
    });
    cur.current = next;
  });
  return (id: string): DOMRect | undefined => cur.current.get(id) ?? prev.current.get(id);
}
