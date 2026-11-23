// Landscape without asking: a web page can't force a phone sideways (iPhone never, Android only in full screen),
// so on touch phones the app runs inside a frame that is turned 90° while the phone is upright. The game inside
// always sees a landscape screen; with the rotation lock on, the player just holds the phone sideways.

const SHORT_SIDE_MAX = 1100;
/** messages between the game (inside) and the shell */
export const SHELL_FULLSCREEN = 'bluff:fullscreen';
export const SHELL_FS_STATE = 'bluff:fs';
/** the game asks the shell to hide the phone's bars (full screen on), never off */
export const SHELL_FS_ON = 'bluff:fs-on';

/** this page is the game inside the shell's frame */
export function insideShell() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** touch phones and tablets use the shell; laptops and desktops run the app directly (?flat skips it, for testing) */
export function wantsShell() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  // any touch screen counts: an iPad with a keyboard and trackpad, or a tablet with a pen, reports a fine pointer
  const touch = navigator.maxTouchPoints > 0 || (window.matchMedia?.('(any-pointer: coarse)').matches ?? false);
  return touch && Math.min(screen.width, screen.height) <= SHORT_SIDE_MAX;
}

/** builds the shell: a dark page with the game in a frame that turns with the phone */
export function startShell() {
  // the first intro (index.html, drawn sideways by CSS) stays until the game inside has loaded, so there's no blank moment
  const root = document.getElementById('root');
  Object.assign(document.documentElement.style, { height: '100%', background: '#020604' });
  Object.assign(document.body.style, { margin: '0', height: '100%', overflow: 'hidden', background: '#020604' });

  // the notch and home bar stay outside the game
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;z-index:10;top:env(safe-area-inset-top);bottom:env(safe-area-inset-bottom);left:env(safe-area-inset-left);right:env(safe-area-inset-right);overflow:hidden;opacity:0;transition:opacity .25s ease';
  const frame = document.createElement('iframe');
  frame.title = 'Bluff';
  frame.allow = 'fullscreen; microphone; autoplay; clipboard-write; web-share';
  frame.style.cssText = 'position:absolute;left:50%;top:50%;border:0;transform-origin:50% 50%;background:#020604';

  // the game gets the invite link (?room=) and keeps it; the shell's own address drops it so a reload doesn't join again
  const url = new URL(location.href);
  url.searchParams.set('inner', '1');
  frame.src = url.pathname + url.search + url.hash;
  if (new URLSearchParams(location.search).has('room')) history.replaceState(null, '', location.pathname + location.hash);

  box.appendChild(frame);
  document.body.appendChild(box);
  frame.addEventListener('load', () => {
    // the game's own intro is up: show it and drop the first one
    box.style.background = '#020604';
    box.style.opacity = '1';
    setTimeout(() => root?.replaceChildren(), 300);
  }, { once: true });

  // which way the phone is held: 90 = left side down (the usual), -90 = right side down
  let side = 90;
  const fit = () => {
    const r = box.getBoundingClientRect();
    // a box with no size yet (mid-rotation on some tablets): try again next frame
    if (r.width < 2 || r.height < 2) {
      requestAnimationFrame(fit);
      return;
    }
    const upright = r.height > r.width;
    frame.style.width = `${upright ? r.height : r.width}px`;
    frame.style.height = `${upright ? r.width : r.height}px`;
    frame.style.transform = `translate(-50%, -50%) rotate(${upright ? side : 0}deg)`;
  };
  // tablets report the new size at different moments while turning, so watch the box itself and check again for a while
  const settle = () => {
    const end = performance.now() + 800;
    const tick = () => {
      fit();
      if (performance.now() < end) requestAnimationFrame(tick);
    };
    tick();
  };
  fit();
  new ResizeObserver(fit).observe(box);
  window.addEventListener('resize', settle);
  window.addEventListener('orientationchange', settle);
  window.visualViewport?.addEventListener('resize', settle);
  (screen.orientation as ScreenOrientation | undefined)?.addEventListener?.('change', settle);

  // No screen.orientation.lock anywhere: it only holds while in full screen, so leaving full screen (the back gesture,
  // switching apps) let an app installed with the old portrait setting snap upright, and the next tap locked it again:
  // the flip-flop with a blank moment at each turn. Landscape comes from turning the frame (above) or, once Chrome
  // has updated the installed app, from the manifest. Coming back to the app just re-checks the size.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') settle();
  });

  // Android says which edge is down; turn the game over only when the phone has clearly been turned the other way
  // for a moment, so tilting it while playing never flips the screen
  let want = side;
  let since = 0;
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma === null || e.beta === null) return;
    // held fairly upright and well over to one side; anything else keeps the current way round
    const clear = Math.abs(e.gamma) > 68 && Math.abs(e.beta) < 50;
    const next = !clear ? side : e.gamma > 0 ? -90 : 90;
    const now = performance.now();
    if (next !== want) {
      want = next;
      since = now;
    }
    if (want !== side && now - since > 700) {
      side = want;
      fit();
    }
  });

  // the game asks the shell to hide the phone's bars (full screen; never an orientation lock)
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || (e.data !== SHELL_FULLSCREEN && e.data !== SHELL_FS_ON)) return;
    const done = () => frame.contentWindow?.postMessage({ type: SHELL_FS_STATE, on: !!document.fullscreenElement }, location.origin);
    if (document.fullscreenElement) {
      if (e.data === SHELL_FULLSCREEN) void document.exitFullscreen().catch(() => {});
    } else void document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    setTimeout(done, 400);
  });
  document.addEventListener('fullscreenchange', () => {
    frame.contentWindow?.postMessage({ type: SHELL_FS_STATE, on: !!document.fullscreenElement }, location.origin);
    settle();
  });
}
