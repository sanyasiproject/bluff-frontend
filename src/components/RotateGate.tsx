import { useEffect, useState } from 'react';
import { SHELL_FS_STATE } from '../lib/landscapeShell';
import { canFullscreen, toggleFullscreen } from '../lib/orientation';

/** phones held upright: a full screen "turn your phone" card over the app (CSS shows it only in portrait on touch screens) */
export function RotateGate() {
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
      <p>Game Baithak Wide plays sideways, like a real game table.</p>
      <p className="rotate-tip">Just hold the phone sideways.</p>
    </div>
  );
}

/** ⛶ full screen switch for the top bar: hides the browser bar so the table gets the whole height */
export function FullscreenButton({ className = 'icon-btn' }: { className?: string }) {
  const [on, setOn] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    // inside the sideways shell, the shell says when it went full screen
    const fromShell = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === SHELL_FS_STATE) setOn(!!e.data.on);
    };
    document.addEventListener('fullscreenchange', sync);
    window.addEventListener('message', fromShell);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      window.removeEventListener('message', fromShell);
    };
  }, []);
  if (!canFullscreen()) return null;
  return (
    <button type="button" className={`${className} fs-btn`} aria-label={on ? 'Leave full screen' : 'Full screen'} aria-pressed={on} onClick={() => void toggleFullscreen()}>
      {on ? '🗗' : '⛶'}
    </button>
  );
}
