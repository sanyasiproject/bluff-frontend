import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from '../lib/motion';
import type { Card } from '../types';
import { PlayingCard } from './PlayingCard';

export interface Flight {
  key: string;
  count: number;
  from: DOMRect;
  to: DOMRect;
  /** ms before the first card leaves */
  delay?: number;
  /** cards shrink into a seat or hand (dealing, picking up the pile) instead of landing on the pile */
  vanish?: boolean;
  /** shown face up (the card played in Crazy 7) instead of face-down backs */
  card?: Card;
  /** size of the flying cards */
  size?: 'sm' | 'md' | 'lg';
}

/** face-down cards sliding from a seat (or your hand) onto the pile, or from the pile to a player */
export function FlyingCards({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const { from, to } = flight;
  const x = to.left + to.width / 2;
  const y = to.top + to.height / 2;

  useLayoutEffect(() => {
    const dx = from.left + from.width / 2 - x;
    const dy = from.top + from.height / 2 - y;
    if (reducedMotion()) {
      onDone();
      return;
    }
    const start = (i: number) => `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.75) rotate(${i * 9 - 18}deg)`;
    const runs = refs.current.map((el, i) =>
      el?.animate(
        flight.vanish
          ? [
              { transform: start(i), opacity: 1 },
              { transform: `translate(-50%, -50%) scale(0.9) rotate(${i * 7 - 10}deg)`, opacity: 1, offset: 0.8 },
              { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
            ]
          : [
              { transform: start(i), opacity: 0.4 },
              { transform: `translate(-50%, -50%) rotate(${((i * 23) % 30) - 15}deg)`, opacity: 1 },
            ],
        {
          duration: flight.vanish ? 460 : 380,
          delay: (flight.delay ?? 0) + i * 70,
          easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
          fill: 'both',
        },
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
          {flight.card ? <PlayingCard card={flight.card} size={flight.size ?? 'sm'} /> : <PlayingCard faceDown size={flight.size ?? 'sm'} />}
        </div>
      ))}
    </div>
  );
}
