// Chrome offers "Install app" only to the top page, so the shell keeps the prompt and the game inside asks for it
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** messages between the game (inside) and the shell about installing */
export const SHELL_INSTALL_STATE = 'bluff:install-state';
export const SHELL_INSTALL_ASK = 'bluff:install-ask';
export const SHELL_INSTALL_DONE = 'bluff:install-done';

export interface InstallState {
  type: typeof SHELL_INSTALL_STATE;
  can: boolean;
  installed: boolean;
}

/** the shell's side: catch the prompt early, tell the frame, and show it when the game asks */
export function startShellInstall(frame: HTMLIFrameElement, installed: () => boolean) {
  // decided once at start: later full screen from a tap also matches display-mode: fullscreen
  const app = installed() && !document.fullscreenElement;
  const isApp = () => app;
  let deferred: InstallPromptEvent | null = null;
  const tell = () =>
    frame.contentWindow?.postMessage({ type: SHELL_INSTALL_STATE, can: deferred !== null, installed: isApp() } satisfies InstallState, location.origin);

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    tell();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    tell();
  });
  frame.addEventListener('load', tell);

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const type = (e.data as { type?: string } | null)?.type;
    if (type === SHELL_INSTALL_STATE) return tell();
    if (type !== SHELL_INSTALL_ASK) return;
    const ev = deferred;
    const reply = (accepted: boolean) => {
      frame.contentWindow?.postMessage({ type: SHELL_INSTALL_DONE, accepted }, location.origin);
      tell();
    };
    if (!ev) return reply(false);
    deferred = null;
    // the tap inside the frame counts as a tap on this page too, so the prompt is allowed
    ev.prompt()
      .then(() => ev.userChoice)
      .then((c) => reply(c.outcome === 'accepted'))
      .catch(() => reply(false));
  });
}
