// Install-as-app: Android and desktop Chrome/Edge offer an install prompt; iPhone needs Share → Add to Home Screen
import { SHELL_INSTALL_ASK, SHELL_INSTALL_DONE, SHELL_INSTALL_STATE, type InstallState } from './shellInstall';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

// inside the phone shell's frame Chrome never fires the prompt here; the shell holds it and reports
const framed = (() => {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
})();
let shellCan = false;
let shellInstalled = false;
let shellAnswer: ((accepted: boolean) => void) | null = null;

if (framed) {
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    const d = e.data as (Partial<InstallState> & { accepted?: boolean }) | null;
    if (d?.type === SHELL_INSTALL_STATE) {
      shellCan = !!d.can;
      shellInstalled = !!d.installed;
      notify();
    } else if (d?.type === SHELL_INSTALL_DONE) {
      shellAnswer?.(!!d.accepted);
      shellAnswer = null;
    }
  });
  // ask once at start in case the prompt arrived before this page was listening
  window.parent.postMessage({ type: SHELL_INSTALL_STATE }, location.origin);
}

// the browser fires this early, so catch it at startup and keep it for the Install button
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

/** true when opened from the home-screen icon */
// decided once at start: later full screen from a tap in Chrome also matches display-mode: fullscreen
const openedAsApp =
  window.matchMedia('(display-mode: standalone)').matches ||
  // the installed app opens full screen (manifest display)
  (window.matchMedia('(display-mode: fullscreen)').matches && !document.fullscreenElement) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** true when opened from the home-screen icon (inside the shell, the shell knows) */
export const isInstalled = () => (framed ? shellInstalled : openedAsApp);

// iPads report a Mac platform, so a touch-screen "Mac" counts as iOS unless the browser says Android
export const isIos = () =>
  !/android/i.test(navigator.userAgent) &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export const canPrompt = () => deferred !== null || (framed && shellCan);

export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) {
    if (!(framed && shellCan)) return false;
    shellCan = false;
    // the shell shows Chrome's prompt; the tap here counts for it
    const accepted = await new Promise<boolean>((resolve) => {
      shellAnswer = resolve;
      window.parent.postMessage({ type: SHELL_INSTALL_ASK }, location.origin);
    });
    notify();
    return accepted;
  }
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}

/** returns an unsubscribe function */
export function onInstallChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
