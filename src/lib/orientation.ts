// landscape play: full screen and the sideways lock where the phone allows it
import { stepBack } from './back';
import { insideShell, SHELL_FS_ON, SHELL_FS_STATE, SHELL_FULLSCREEN } from './landscapeShell';

/** the installed app (home screen icon) already runs full screen */
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.matchMedia?.('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

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

/** no orientation locks: they only hold in full screen and made the app flip upright and back (see landscapeShell.ts) */
export function lockLandscape() {
  // kept as a no-op so older callers still compile
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
    }
  } catch {
    // refused (no tap, or the browser said no): stay as we are
  }
}

/**
 * like a phone game: the status bar and browser bar stay hidden. Browsers only allow full screen after a tap,
 * so on touch phones every tap while not full screen asks for it (Android; iPhone has no full screen for pages)
 */
export function autoFullscreen() {
  const touch = navigator.maxTouchPoints > 0 || (window.matchMedia?.('(any-pointer: coarse)').matches ?? false);
  if (!touch) return;
  // On Android the back button first only leaves full screen, so a back press seemed to do nothing.
  // When full screen ends without us asking, take it as that back press.
  // switching apps also ends full screen: only count it while the app is still in front a moment later
  const lost = () =>
    window.setTimeout(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) stepBack();
    }, 250);
  if (insideShell()) {
    let on = false;
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || e.data?.type !== SHELL_FS_STATE) return;
      const now = !!e.data.on;
      if (on && !now) lost();
      on = now;
    });
    // the tap's permission reaches the shell page too, so it may go full screen (the shell skips it in the installed app)
    window.addEventListener('pointerdown', () => {
      if (!on) window.parent.postMessage(SHELL_FS_ON, location.origin);
    }, { capture: true, passive: true });
    return;
  }
  // the installed app is already full screen (manifest): asking again only costs an extra back press
  if (!document.documentElement.requestFullscreen || isStandalone()) return;
  let was = false;
  document.addEventListener('fullscreenchange', () => {
    const now = !!document.fullscreenElement;
    if (was && !now) lost();
    was = now;
  });
  window.addEventListener('pointerdown', () => {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }, { capture: true, passive: true });
}
