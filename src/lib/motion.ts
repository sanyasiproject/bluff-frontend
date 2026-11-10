import { useEffect, useRef, useState } from 'react';

/** the phone asks for less motion, or the browser can't animate from code */
export const reducedMotion = () =>
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) || typeof Element.prototype.animate !== 'function';

/** a number that rolls from its old value to the new one (coins, XP) */
export function useCountUp(value: number, ms = 900, from?: number): number {
  const [shown, setShown] = useState(from ?? value);
  const current = useRef(shown);
  useEffect(() => {
    const start = current.current;
    if (start === value || reducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / ms);
      // ease out: fast at first, settles gently
      const next = Math.round(start + (value - start) * (1 - (1 - t) ** 3));
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

const CONFETTI_COLORS = ['#f6c453', '#3ccf91', '#ff6b81', '#7cc4ff', '#ffffff', '#c792ff'];

/** a burst of confetti from a point on the screen; cleans itself up */
export function confetti(x: number, y: number, { count = 36, spread = 1 }: { count?: number; spread?: number } = {}): void {
  if (reducedMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'confetti-layer';
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  document.body.appendChild(layer);
  let left = count;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement('i');
    bit.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    if (i % 3 === 0) bit.style.borderRadius = '50%';
    layer.appendChild(bit);
    const angle = Math.random() * Math.PI * 2;
    const power = (60 + Math.random() * 120) * spread;
    const dx = Math.cos(angle) * power;
    const dy = Math.sin(angle) * power - 80 * spread;
    const turn = (Math.random() - 0.5) * 900;
    const run = bit.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${turn / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx * 1.2}px, ${dy + 220}px) rotate(${turn}deg) scale(0.7)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(0.15, 0.7, 0.4, 1)', fill: 'forwards' },
    );
    run.onfinish = () => {
      left -= 1;
      if (left === 0) layer.remove();
    };
  }
}

/** confetti from the middle of an element */
export function confettiAt(el: Element | null | undefined, opts?: { count?: number; spread?: number }): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top + r.height / 2, opts);
}
