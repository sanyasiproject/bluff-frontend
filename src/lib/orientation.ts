// landscape play: full screen and the sideways lock where the phone allows it
import { insideShell, SHELL_FULLSCREEN } from './landscapeShell';

type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

/** the installed app (home screen icon) already runs full screen */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** element full screen exists (Android, tablets, laptops; not iPhone) */
export const canFullscreen = () => {
  // inside the sideways shell, the shell page goes full screen (not iPhone, which has none)
  if (insideShell()) {
    try {
      return !!window.parent.document.fullscreenEnabled;
    } catch {
      return false;
    }
  }
  return !!document.documentElement.requestFullscreen && !isStandalone();
};

/** keeps the phone sideways; only works in full screen or the installed app, so failures are ignored */
export function lockLandscape() {
  const o = screen.orientation as LockableOrientation | undefined;
  o?.lock?.('landscape').catch(() => {});
}

/** full screen on, or off when it already is */
export async function toggleFullscreen() {
  if (insideShell()) {
    window.parent.postMessage(SHELL_FULLSCREEN, location.origin);
    return;
  }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      lockLandscape();
    }
  } catch {
    // refused (no tap, or the browser said no): stay as we are
  }
}
