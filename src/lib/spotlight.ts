import { useEffect, useRef } from 'react';
import { sfx } from './sounds';

/** a heartbeat and a short buzz when someone goes down to one card; once per player until they have more again */
export function useOneCardAlert(ids: string[]): void {
  const seen = useRef(new Set<string>());
  const key = [...ids].sort().join(',');
  useEffect(() => {
    const now = new Set(ids);
    const fresh = ids.filter((id) => !seen.current.has(id));
    seen.current = now;
    if (fresh.length === 0) return;
    sfx.heartbeat();
    // browsers block vibration until the page has been tapped once
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([40, 90, 40]);
  }, [key]);
}
