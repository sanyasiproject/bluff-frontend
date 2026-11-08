import { useEffect, useState } from 'react';

/** current time, refreshed every `ms` so time-limited UI (toasts, reactions) can expire */
export function useNow(ms: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
