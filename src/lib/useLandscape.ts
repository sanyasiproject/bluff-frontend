import { useEffect, useState } from 'react';

const QUERY = '(orientation: landscape)';

/** true while the screen is wider than tall (phones sideways, laptops, tablets) */
export function useLandscape() {
  const [on, setOn] = useState(() => window.matchMedia?.(QUERY).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(QUERY);
    if (!m) return;
    const sync = () => setOn(m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  }, []);
  return on;
}
