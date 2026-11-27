// Aiming: hold on the board to bring up a reticle that wobbles like a hand (steadiest after a moment, worse the longer you hold); let go to throw
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { BOARD_SPAN } from './DartBoard';

/** how far the hand drifts (board units) after holding this long */
export function wobbleAmp(ms: number): number {
  if (ms < 650) return 0.16 - (0.125 * ms) / 650;
  if (ms < 1300) return 0.035;
  return Math.min(0.3, 0.035 + ((ms - 1300) / 1000) * 0.07);
}

/** the drift itself: two slow wobbles mixed, so it never repeats neatly */
export function wobble(ms: number): [number, number] {
  const a = wobbleAmp(ms);
  const t = ms / 1000;
  return [a * (0.7 * Math.sin(t * 8.2) + 0.3 * Math.sin(t * 19.5 + 1)), a * (0.7 * Math.cos(t * 6.9 + 0.5) + 0.3 * Math.sin(t * 17 + 2))];
}

interface Props {
  live: boolean;
  onThrow: (x: number, y: number) => void;
  children: ReactNode;
}

export function AimBoard({ live, onThrow, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const ret = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const hold = useRef<{ id: number; at: number; x: number; y: number; lift: number } | null>(null);
  const [aiming, setAiming] = useState(false);
  const raf = useRef(0);

  /** where the reticle is now, board units (y up) */
  const spot = (now: number): [number, number] => {
    const h = hold.current!;
    const [wx, wy] = reducedMotion() ? [0, 0] : wobble(now - h.at);
    return [h.x + wx, h.y + wy];
  };
  const toBoard = (cx: number, cy: number, lift: number): [number, number] => {
    const r = box.current!.getBoundingClientRect();
    const s = r.width / (BOARD_SPAN * 2);
    return [(cx - r.left - r.width / 2) / s, -(cy - lift - r.top - r.height / 2) / s];
  };
  const paint = () => {
    const h = hold.current;
    const el = ret.current;
    if (!h || !box.current) return;
    // the reticle mounts on the next render
    if (!el) {
      raf.current = requestAnimationFrame(paint);
      return;
    }
    const now = performance.now();
    const [x, y] = spot(now);
    const w = box.current.offsetWidth;
    const s = w / (BOARD_SPAN * 2);
    el.style.transform = `translate(${w / 2 + x * s}px, ${w / 2 - y * s}px)`;
    const amp = wobbleAmp(now - h.at);
    el.dataset.steady = amp <= 0.04 ? 'yes' : amp > 0.12 ? 'no' : 'mid';
    // the steadiness meter: full and green when steady, short and red when shaky
    const steady = Math.max(0.06, Math.min(1, 1 - (amp - 0.035) / 0.2));
    el.style.setProperty('--steady', `${steady}`);
    el.style.setProperty('--steady-col', `hsl(${Math.round(steady * 125)} 90% 55%)`);
    // the ghost: where it'll land, round the spot the hand aims at
    const g = ghost.current;
    if (g) g.style.transform = `translate(${w / 2 + h.x * s}px, ${w / 2 - h.y * s}px) scale(${Math.max(0.05, amp * s * 2.1) / 100})`;
    raf.current = requestAnimationFrame(paint);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (!live && hold.current) {
      hold.current = null;
      setAiming(false);
      cancelAnimationFrame(raf.current);
    }
  }, [live]);

  return (
    <div
      ref={box}
      className={cx('da-board', live && 'live', aiming && 'aiming')}
      onPointerDown={(e) => {
        if (!live || hold.current) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // a pointer the browser no longer tracks: aim without capture
        }
        // a finger hides the spot: aim a little above it
        const lift = e.pointerType === 'touch' ? 56 : 0;
        const [x, y] = toBoard(e.clientX, e.clientY, lift);
        hold.current = { id: e.pointerId, at: performance.now(), x, y, lift };
        setAiming(true);
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(paint);
      }}
      onPointerMove={(e) => {
        const h = hold.current;
        if (!h || h.id !== e.pointerId) return;
        [h.x, h.y] = toBoard(e.clientX, e.clientY, h.lift);
      }}
      onPointerUp={(e) => {
        const h = hold.current;
        if (!h || h.id !== e.pointerId) return;
        const [x, y] = spot(performance.now());
        hold.current = null;
        setAiming(false);
        cancelAnimationFrame(raf.current);
        const c = (v: number) => Math.round(Math.max(-1.9, Math.min(1.9, v)) * 1000) / 1000;
        onThrow(c(x), c(y));
      }}
      onPointerCancel={() => {
        hold.current = null;
        setAiming(false);
        cancelAnimationFrame(raf.current);
      }}
    >
      {children}
      {aiming && <span ref={ghost} className="da-ghost" aria-hidden />}
      {aiming && (
        <span ref={ret} className="da-reticle" aria-hidden>
          <i />
          <em className="da-meter">
            <span />
          </em>
        </span>
      )}
    </div>
  );
}
