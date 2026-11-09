import { useLayoutEffect, useRef } from 'react';
import { PlayingCard } from './PlayingCard';

export interface Flight {
  key: string;
  count: number;
  from: DOMRect;
  to: DOMRect;
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** face-down cards sliding from a seat (or your hand) onto the pile */
export function FlyingCards({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const { from, to } = flight;
  const x = to.left + to.width / 2;
  const y = to.top + to.height / 2;

  useLayoutEffect(() => {
    const dx = from.left + from.width / 2 - x;
    const dy = from.top + from.height / 2 - y;
    if (reducedMotion() || typeof Element.prototype.animate !== 'function') {
      onDone();
      return;
    }
    const runs = refs.current.map((el, i) =>
      el?.animate(
        [
          { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.75) rotate(${i * 9 - 18}deg)`, opacity: 0.4 },
          { transform: `translate(-50%, -50%) rotate(${((i * 23) % 30) - 15}deg)`, opacity: 1 },
        ],
        { duration: 380, delay: i * 70, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'both' },
      ),
    );
    const last = runs[runs.length - 1];
    if (last) last.onfinish = onDone;
    else onDone();
    return () => runs.forEach((a) => a?.cancel());
  }, [flight.key]);

  return (
    <div className="fly-layer" aria-hidden style={{ left: x, top: y }}>
      {Array.from({ length: flight.count }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="fly-card"
        >
          <PlayingCard faceDown size="sm" />
        </div>
      ))}
    </div>
  );
}
