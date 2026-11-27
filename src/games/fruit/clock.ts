// The server's clock as seen from this phone: each view gives a lower bound on (server time - phone time), keep the best one
import { useRef } from 'react';

export interface ServerClock {
  /** server time now (ms since epoch) */
  now(): number;
  /** a server time the view was sent at or after */
  sample(serverAtLeast: number): void;
  reset(): void;
}

export function makeClock(): ServerClock {
  let offset: number | null = null;
  return {
    now: () => Date.now() + (offset ?? 0),
    sample(serverAtLeast) {
      const s = serverAtLeast - Date.now();
      if (offset === null || s > offset) offset = s;
    },
    reset() {
      offset = null;
    },
  };
}

/** one clock per table, kept across renders */
export function useServerClock(): ServerClock {
  const ref = useRef<ServerClock | null>(null);
  if (!ref.current) ref.current = makeClock();
  return ref.current;
}
