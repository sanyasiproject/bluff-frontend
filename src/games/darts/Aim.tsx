// Aiming in two taps: a line sweeps up and down (tap to fix the height), then one sweeps left and right (tap to fix it); the dart flies to where they cross
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { cx } from '../../lib/cards';
import { BOARD_SPAN } from './DartBoard';

/** how far either side of the centre the lines travel (board units; the double ring ends at 1) */
export const SWEEP_REACH = 1.08;
/** one pass from edge to edge */
export const SWEEP_PASS_MS = 1100;
/** the locked crosshair shows this long before the dart goes */
const CROSS_MS = 320;
/** a second tap sooner than this is a double tap, not a choice */
const TAP_GAP_MS = 160;

/** where a sweeping line is after ms: edge to edge and back at a constant speed, starting at from × reach */
export function sweepAt(ms: number, from: 1 | -1): number {
  const t = (Math.max(0, ms) / SWEEP_PASS_MS) % 2;
  const f = t < 1 ? t : 2 - t;
  return from * SWEEP_REACH * (1 - 2 * f);
}

export type AimPhase = 'off' | 'y' | 'x' | 'locked';

interface Props {
  live: boolean;
  onThrow: (x: number, y: number) => void;
  /** the area that takes the taps (the whole stage); the board itself if not given */
  zone?: RefObject<HTMLElement | null>;
  onPhase?: (phase: AimPhase) => void;
  children: ReactNode;
}

/** board units to px inside the square board box */
const toPx = (v: number, w: number) => w / 2 + (v * w) / (BOARD_SPAN * 2);
const pct = (v: number) => `${((v + BOARD_SPAN) / (BOARD_SPAN * 2)) * 100}%`;

export function AimBoard({ live, onThrow, zone, onPhase, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const hLine = useRef<HTMLSpanElement>(null);
  const vLine = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<AimPhase>('off');
  const [lock, setLock] = useState({ x: 0, y: 0 });
  const [fading, setFading] = useState(false);
  // `shown` is where the moving line was last drawn: a tap locks exactly that, not a fresh time reading
  const st = useRef({ phase: 'off' as AimPhase, at: 0, y: 0, tapAt: 0, shown: 0 });
  const raf = useRef(0);
  const timer = useRef(0);
  const cb = useRef({ onThrow, onPhase });
  cb.current = { onThrow, onPhase };

  const go = (p: AimPhase) => {
    st.current.phase = p;
    setPhase(p);
    cb.current.onPhase?.(p);
  };

  const paint = () => {
    const s = st.current;
    const w = box.current?.offsetWidth ?? 0;
    const now = performance.now();
    if (s.phase === 'y' && hLine.current) {
      s.shown = sweepAt(now - s.at, 1);
      hLine.current.style.transform = `translateY(${toPx(-s.shown, w)}px)`;
    }
    if (s.phase === 'x' && vLine.current) {
      s.shown = sweepAt(now - s.at, -1);
      vLine.current.style.transform = `translateX(${toPx(s.shown, w)}px)`;
    }
    if (s.phase === 'y' || s.phase === 'x') raf.current = requestAnimationFrame(paint);
  };

  // a new dart: the up-down line starts at the top; the turn ending clears it (a thrown crosshair fades out)
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (live) {
      window.clearTimeout(timer.current);
      setFading(false);
      st.current.at = performance.now();
      st.current.shown = SWEEP_REACH;
      go('y');
      raf.current = requestAnimationFrame(paint);
    } else if (st.current.phase === 'locked') setFading(true);
    else go('off');
    return () => cancelAnimationFrame(raf.current);
  }, [live]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** one tap: fix the height, then the left-right, then throw */
  const tap = () => {
    const s = st.current;
    const now = performance.now();
    if (now - s.tapAt < TAP_GAP_MS) return;
    s.tapAt = now;
    if (s.phase === 'y') {
      s.y = s.shown;
      s.at = now;
      s.shown = -SWEEP_REACH;
      setLock({ x: -SWEEP_REACH, y: s.y });
      go('x');
      navigator.vibrate?.(12);
    } else if (s.phase === 'x') {
      const x = s.shown;
      const y = s.y;
      cancelAnimationFrame(raf.current);
      setLock({ x, y });
      go('locked');
      navigator.vibrate?.(18);
      const c = (v: number) => Math.round(Math.max(-1.9, Math.min(1.9, v)) * 1000) / 1000;
      timer.current = window.setTimeout(() => cb.current.onThrow(c(x), c(y)), CROSS_MS);
    }
  };
  const tapRef = useRef(tap);
  tapRef.current = tap;

  // taps anywhere on the zone (not on its buttons), and Space / Enter on a keyboard
  useEffect(() => {
    if (!live) return;
    const el = zone?.current ?? box.current;
    const down = (e: PointerEvent) => {
      if (e.button > 0 || (e.target as Element | null)?.closest?.('button, a, input, [role="button"]')) return;
      tapRef.current();
    };
    const key = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return;
      if ((e.target as Element | null)?.closest?.('input, textarea, button, select, [contenteditable="true"]')) return;
      // a sheet or menu is open over the board
      if (document.querySelector('[role="dialog"], .backdrop, .tinfo-panel')) return;
      e.preventDefault();
      tapRef.current();
    };
    el?.addEventListener('pointerdown', down);
    window.addEventListener('keydown', key);
    return () => {
      el?.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', key);
    };
  }, [live, zone]);

  const w = box.current?.offsetWidth ?? 0;
  const showV = phase === 'x' || phase === 'locked';
  return (
    <div ref={box} className={cx('da-board', live && 'live', `aim-${phase}`, fading && 'aim-gone')}>
      {children}
      {phase !== 'off' && (
        <span ref={hLine} className={cx('da-sweep h', phase !== 'y' && 'set')} style={{ transform: `translateY(${toPx(phase === 'y' ? -SWEEP_REACH : -lock.y, w)}px)` }} aria-hidden>
          <b />
        </span>
      )}
      {showV && (
        <span ref={vLine} className={cx('da-sweep v', phase === 'locked' && 'set')} style={{ transform: `translateX(${toPx(lock.x, w)}px)` }} aria-hidden>
          <b />
        </span>
      )}
      {phase === 'locked' && <span className="da-cross" style={{ left: pct(lock.x), top: pct(-lock.y) }} aria-hidden />}
    </div>
  );
}
