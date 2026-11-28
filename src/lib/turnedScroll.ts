// Inside the turned shell (phone upright, game drawn sideways) Chrome can't scroll lists with a finger: the swipe is
// measured on the upright page, not the turned frame. This scrolls them by hand from the frame's own touch points.
import { insideShell } from './landscapeShell';

const SLOP = 8;
const FRICTION = 0.95;

/** the frame is drawn turned 90° on an upright page */
function turned() {
  try {
    const p = window.parent;
    return p !== window && p.innerHeight > p.innerWidth && innerWidth > innerHeight;
  } catch {
    return false;
  }
}

const scrolls = (v: string) => v === 'auto' || v === 'scroll' || v === 'overlay';

/** the nearest element under the finger that can scroll along this axis; none inside game gesture areas */
function scrollerFor(start: Element | null, axis: 'x' | 'y'): HTMLElement | null {
  for (let el = start; el && el !== document.documentElement; el = el.parentElement) {
    const s = getComputedStyle(el);
    if (s.touchAction === 'none') return null;
    const h = el as HTMLElement;
    if (axis === 'x' && scrolls(s.overflowX) && h.scrollWidth > h.clientWidth + 1) return h;
    if (axis === 'y' && scrolls(s.overflowY) && h.scrollHeight > h.clientHeight + 1) return h;
  }
  const root = document.scrollingElement as HTMLElement | null;
  if (!root) return null;
  const fits = axis === 'x' ? root.scrollWidth <= root.clientWidth + 1 : root.scrollHeight <= root.clientHeight + 1;
  return fits ? null : root;
}

/** finger scrolling for lists and pages while the shell has the game turned */
export function startTurnedScroll() {
  if (!insideShell()) return;
  let id: number | null = null;
  let x0 = 0;
  let y0 = 0;
  let lx = 0;
  let ly = 0;
  let lt = 0;
  let v = 0;
  let axis: 'x' | 'y' | null = null;
  let el: HTMLElement | null = null;
  let target: Element | null = null;
  let snap = '';
  let glide = 0;
  let dragged = -1e9;
  /** where our own scrolling left the list: anything else moved it means the browser scrolls it itself */
  let expect = 0;

  const pos = () => (!el ? 0 : axis === 'x' ? el.scrollLeft : el.scrollTop);
  const by = (d: number) => {
    if (!el) return;
    if (axis === 'x') el.scrollLeft += d;
    else el.scrollTop += d;
    expect = pos();
  };
  const release = () => {
    // give the list its snapping back once it has stopped
    if (el) el.style.scrollSnapType = snap;
    el = null;
    axis = null;
  };
  const stopGlide = () => {
    if (glide) cancelAnimationFrame(glide);
    glide = 0;
  };

  window.addEventListener('touchstart', (e) => {
    stopGlide();
    release();
    if (e.touches.length !== 1 || !turned()) {
      id = null;
      return;
    }
    const t = e.touches[0];
    id = t.identifier;
    x0 = lx = t.clientX;
    y0 = ly = t.clientY;
    lt = performance.now();
    v = 0;
    target = e.target as Element;
  }, { capture: true, passive: true });

  window.addEventListener('touchmove', (e) => {
    const t = Array.from(e.changedTouches).find((c) => c.identifier === id);
    if (!t) return;
    if (!axis) {
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.hypot(dx, dy) < SLOP) return;
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      el = scrollerFor(target, axis);
      if (!el) {
        id = null;
        axis = null;
        return;
      }
      snap = el.style.scrollSnapType;
      // snapping would pull back every small step
      el.style.scrollSnapType = 'none';
      dragged = performance.now();
      expect = pos();
    } else if (Math.abs(pos() - expect) > 1) {
      // Chrome does scroll this one (some vertical lists): leave it to the browser
      release();
      id = null;
      return;
    }
    const d = axis === 'x' ? lx - t.clientX : ly - t.clientY;
    const now = performance.now();
    by(d);
    v = 0.8 * (d / Math.max(1, now - lt)) + 0.2 * v;
    lx = t.clientX;
    ly = t.clientY;
    lt = now;
    dragged = now;
  }, { capture: true, passive: true });

  const end = (e: TouchEvent) => {
    if (!Array.from(e.changedTouches).some((c) => c.identifier === id)) return;
    id = null;
    if (!el) return;
    // a finger that stopped before lifting doesn't fling
    if (performance.now() - lt > 80) v = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      by(v * dt);
      v *= Math.pow(FRICTION, dt / 16);
      if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step);
      else {
        glide = 0;
        release();
      }
    };
    glide = requestAnimationFrame(step);
  };
  window.addEventListener('touchend', end, { capture: true, passive: true });
  window.addEventListener('touchcancel', end, { capture: true, passive: true });

  // a drag never also counts as a tap on the tile under it
  window.addEventListener('click', (e) => {
    if (performance.now() - dragged < 350) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });
}
