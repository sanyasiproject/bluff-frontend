// Timers owned by a component: all cleared on unmount, so no sound or confetti fires after leaving a table
import { useEffect, useMemo, useRef } from 'react';

export interface Timeouts {
  /** setTimeout that is cleared when the component unmounts; returns the id */
  later(fn: () => void, ms: number): number;
  /** clear one timer made by later */
  clear(id: number | undefined): void;
  /** clear every pending timer */
  clearAll(): void;
}

export function useTimeouts(): Timeouts {
  const ids = useRef(new Set<number>());
  const api = useMemo<Timeouts>(
    () => ({
      later(fn, ms) {
        const id = window.setTimeout(() => {
          ids.current.delete(id);
          fn();
        }, ms);
        ids.current.add(id);
        return id;
      },
      clear(id) {
        if (id === undefined) return;
        window.clearTimeout(id);
        ids.current.delete(id);
      },
      clearAll() {
        for (const id of ids.current) window.clearTimeout(id);
        ids.current.clear();
      },
    }),
    [],
  );
  useEffect(() => () => api.clearAll(), [api]);
  return api;
}
