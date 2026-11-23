import { useEffect, useState } from 'react';
import { canFullscreen, isStandalone, lockLandscape, toggleFullscreen } from '../lib/orientation';

/** phones held upright: a full screen "turn your phone" card over the app (CSS shows it only in portrait on touch screens) */
export function RotateGate() {
  useEffect(() => {
    if (isStandalone()) lockLandscape();
  }, []);
  return (
    <div className="rotate-gate" role="alert" aria-live="polite">
      <div className="rotate-phone" aria-hidden>
        <span className="rotate-screen">
          <i />
          <i />
          <i />
        </span>
      </div>
      <h2>Turn your phone</h2>
      <p>Bluff plays sideways, like a real card table.</p>
      <p className="rotate-tip">Rotation lock on? Turn it off in your phone's quick settings.</p>
    </div>
  );
}

/** ⛶ full screen switch for the top bar: hides the browser bar so the table gets the whole height */
export function FullscreenButton({ className = 'icon-btn' }: { className?: string }) {
  const [on, setOn] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!canFullscreen()) return null;
  return (
    <button type="button" className={`${className} fs-btn`} aria-label={on ? 'Leave full screen' : 'Full screen'} aria-pressed={on} onClick={() => void toggleFullscreen()}>
      {on ? '🗗' : '⛶'}
    </button>
  );
}
