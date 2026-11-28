// Landscape without asking: a web page can't force a phone sideways (iPhone never, Android only in full screen),
// so on touch phones the app runs inside a frame that is turned 90° while the phone is upright. The game inside
// always sees a landscape screen; with the rotation lock on, the player just holds the phone sideways.

import { startShellInstall } from './shellInstall';

const SHORT_SIDE_MAX = 1100;
/** screens this wide on their short side are tablets: no turned frame */
const TABLET_SHORT_SIDE = 600;
/** the night colour behind everything (manifest theme and background colour) */
const NIGHT = '#120b2e';
/** messages between the game (inside) and the shell */
export const SHELL_FULLSCREEN = 'bluff:fullscreen';
export const SHELL_FS_STATE = 'bluff:fs';
/** the game asks the shell to hide the phone's bars (full screen on), never off */
export const SHELL_FS_ON = 'bluff:fs-on';

/** opened from the home-screen icon */
const installed = () =>
  window.matchMedia?.('(display-mode: fullscreen)').matches ||
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** this page is the game inside the shell's frame */
export function insideShell() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** touch phones use the shell; tablets, laptops and desktops run the app directly (?flat skips it, for testing) */
export function wantsShell() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  // any touch screen counts: an iPad with a keyboard and trackpad, or a tablet with a pen, reports a fine pointer
  const touch = navigator.maxTouchPoints > 0 || (window.matchMedia?.('(any-pointer: coarse)').matches ?? false);
  const short = Math.min(screen.width, screen.height);
  // big high-res tablets drop parts of a full-screen frame (unpainted bands); held upright they get the turn card
  return touch && short < TABLET_SHORT_SIDE && short <= SHORT_SIDE_MAX;
}

/** builds the shell: a dark page with the game in a frame that turns with the phone */
export function startShell() {
  // the first intro (index.html, drawn sideways by CSS) stays until the game inside has loaded, so there's no blank moment
  const root = document.getElementById('root');
  Object.assign(document.documentElement.style, { height: '100%', background: NIGHT });
  Object.assign(document.body.style, { margin: '0', height: '100%', overflow: 'hidden', background: NIGHT });

  // the box covers the whole screen; the game is placed in it by hand (fit), so the phone's bars only ever lie over it
  const box = document.createElement('div');
  box.style.cssText = `position:fixed;z-index:10;inset:0;overflow:hidden;background:${NIGHT};opacity:0;transition:opacity .25s ease`;
  // reads the safe-area insets (notch, status bar, home bar) in px
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  const frame = document.createElement('iframe');
  frame.title = 'Game Baithak';
  frame.allow = 'fullscreen; microphone; autoplay; clipboard-write; web-share';
  frame.style.cssText = `position:absolute;left:0;top:0;border:0;transform-origin:50% 50%;background:${NIGHT};color-scheme:dark`;
  // Chrome's install prompt only reaches this page; pass it through to the game's "Get app" button
  startShellInstall(frame, installed);

  // the game gets the invite link (?room=) and keeps it; the shell's own address drops it so a reload doesn't join again
  const url = new URL(location.href);
  url.searchParams.set('inner', '1');
  frame.src = url.pathname + url.search + url.hash;
  if (new URLSearchParams(location.search).has('room')) history.replaceState(null, '', location.pathname + location.hash);

  box.appendChild(frame);
  document.body.appendChild(probe);
  document.body.appendChild(box);
  frame.addEventListener('load', () => {
    // the game's own intro is up: show it and drop the first one
    box.style.opacity = '1';
    setTimeout(() => root?.replaceChildren(), 300);
  }, { once: true });

  // which way the phone is held: 90 = left side down (the usual), -90 = right side down
  let side = 90;
  /**
   * The phone's bars (status bar, back-gesture bar) come and go over the game like in a native game: the game never
   * shrinks or moves for them. Insets only grow while bars show, so the smallest seen since the last turn is the
   * notch alone. A shorter screen counts only in a browser tab that stays shorter (full screen really ended).
   */
  let pad = { t: 0, r: 0, b: 0, l: 0 };
  let held = { w: 0, h: 0, upright: false };
  let shrinkTimer: number | null = null;
  const SHRINK_WAIT = 2600;
  /** the bars stayed out in the installed app: the next tap asks for full screen again */
  let stuck = false;
  const insets = () => {
    const s = getComputedStyle(probe);
    return { t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0, b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0 };
  };
  const place = () => {
    const w = held.w - pad.l - pad.r;
    const h = held.h - pad.t - pad.b;
    const fw = held.upright ? h : w;
    const fh = held.upright ? w : h;
    frame.style.width = `${fw}px`;
    frame.style.height = `${fh}px`;
    // centred on the space inside the notch, from the screen's top left
    frame.style.transform = `translate(${pad.l + w / 2 - fw / 2}px, ${pad.t + h / 2 - fh / 2}px) rotate(${held.upright ? side : 0}deg)`;
  };
  /** just turned round (maybe 180°): insets are read fresh for a moment */
  let freshUntil = 0;
  let queued = 0;
  const fit = () => {
    queued = 0;
    const W = window.innerWidth;
    const H = window.innerHeight;
    // no size yet (mid-rotation on some tablets): try again next frame
    if (W < 2 || H < 2) {
      queued = requestAnimationFrame(fit);
      return;
    }
    const upright = H > W;
    const now = insets();
    const turned = upright !== held.upright || held.w === 0 || performance.now() < freshUntil;
    // a new way round starts fresh: the notch may be on the other side now
    pad = turned
      ? now
      : { t: Math.min(pad.t, now.t), r: Math.min(pad.r, now.r), b: Math.min(pad.b, now.b), l: Math.min(pad.l, now.l) };
    stuck = installed() && (now.t > pad.t || now.b > pad.b || now.r > pad.r || now.l > pad.l);
    if (turned || (W >= held.w - 0.5 && H >= held.h - 0.5)) {
      // turned, first fit, or as much room as before or more: take it at once
      if (shrinkTimer !== null) clearTimeout(shrinkTimer);
      shrinkTimer = null;
      held = { w: W, h: H, upright };
      place();
      return;
    }
    // less room: keep the game's size (the bars lie over it)
    place();
    if (installed()) {
      stuck = true;
      return;
    }
    // in a browser tab, a screen that stays shorter (the address bar is back) is the new size
    if (shrinkTimer === null) {
      shrinkTimer = window.setTimeout(() => {
        shrinkTimer = null;
        if (window.innerWidth < held.w - 0.5 || window.innerHeight < held.h - 0.5) {
          held = { w: window.innerWidth, h: window.innerHeight, upright: window.innerHeight > window.innerWidth };
          place();
        }
      }, SHRINK_WAIT);
    }
  };
  // one measure per frame, however many resize-type events arrive
  const refit = () => {
    if (!queued) queued = requestAnimationFrame(fit);
  };
  // tablets report the new size at different moments while turning, so watch the box itself and check again for a while
  const settle = () => {
    const end = performance.now() + 800;
    const tick = () => {
      refit();
      if (performance.now() < end) requestAnimationFrame(tick);
    };
    tick();
  };
  fit();
  new ResizeObserver(refit).observe(box);
  window.addEventListener('resize', settle);
  const angle = () => screen.orientation?.angle ?? Number((window as Window & { orientation?: number }).orientation ?? 0);
  let lastAngle = angle();
  const turnedRound = () => {
    // only a real turn of the phone, not a size change reported as one
    if (angle() !== lastAngle) freshUntil = performance.now() + 800;
    lastAngle = angle();
    settle();
  };
  window.addEventListener('orientationchange', turnedRound);
  window.visualViewport?.addEventListener('resize', settle);
  (screen.orientation as ScreenOrientation | undefined)?.addEventListener?.('change', turnedRound);
  // the insets change on their own when the bars come and go
  new ResizeObserver(refit).observe(probe, { box: 'border-box' });

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
    // which way is down, on the screen as it is drawn now: the sensor reads the device's own axes, and many tablets
    // are landscape-shaped devices, so an upright screen there is turned 90° from them (screen.orientation.angle)
    const b = (e.beta * Math.PI) / 180;
    const g = (e.gamma * Math.PI) / 180;
    const dx = Math.cos(b) * Math.sin(g);
    const dy = -Math.sin(b);
    const turn = (((screen.orientation?.angle ?? Number((window as Window & { orientation?: number }).orientation ?? 0)) % 360) + 360) % 360;
    const a = (turn * Math.PI) / 180;
    const sx = dx * Math.cos(a) + dy * Math.sin(a);
    const sy = -dx * Math.sin(a) + dy * Math.cos(a);
    // held fairly upright and well over to one side (of the screen); anything else keeps the current way round
    const clear = Math.abs(sx) > 0.6 && Math.abs(sy) < 0.7;
    const next = !clear ? side : sx > 0 ? -90 : 90;
    const now = performance.now();
    if (next !== want) {
      want = next;
      since = now;
    }
    if (want !== side && now - since > 700) {
      side = want;
      place();
    }
  });

  // the game asks the shell to hide the phone's bars (full screen; never an orientation lock)
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || (e.data !== SHELL_FULLSCREEN && e.data !== SHELL_FS_ON)) return;
    // the installed app already runs full screen (manifest display: fullscreen); asking again only costs a back press,
    // unless the phone's bars stayed out: then a tap hides them again
    if (e.data === SHELL_FS_ON && installed() && !stuck) return;
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
