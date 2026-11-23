import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from '../lib/motion';
import type { Card, RangCard as RangCardData } from '../types';
import { PlayingCard } from './PlayingCard';
import { RangCard } from './RangCard';

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
  /** Rang: the card played, shown face up */
  rangCard?: RangCardData;
  /** size of the flying cards */
  size?: 'sm' | 'md' | 'lg';
  /** face-down cards' backs, one per card (repeating): their owners'; omit for this phone's own back */
  backs?: string[];
  /** their owners' shop auras, lined up with backs */
  auras?: (string | null)[];
  /** my own Bluff play: each card leaves from its own place in my hand, face up, and turns face down on the way */
  faces?: Card[];
  /** where each of those cards starts (lined up with faces) */
  froms?: DOMRect[];
  /** landing on the 3D table: the card lies down at the table's lean as it lands */
  onTable?: boolean;
}

// how far the table leans (land-world.css --tilt), so a landing card lies flat on it
const TABLE_TILT = 56;
const P = 'perspective(900px)';

/** cards flying between a seat or my hand and the table: an arc up, a turn in the air, and a landing that lies on the felt */
export function FlyingCards({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const { from, to } = flight;
  const x = to.left + to.width / 2;
  const y = to.top + to.height / 2;
  const faces = flight.faces ?? null;
  const count = faces ? faces.length : flight.count;

  useLayoutEffect(() => {
    if (reducedMotion()) {
      onDone();
      return;
    }
    const tilt = flight.onTable ? TABLE_TILT : 0;
    const runs = refs.current.slice(0, count).map((el, i) => {
      if (!el) return undefined;
      const src = flight.froms?.[i] ?? from;
      const dx = src.left + src.width / 2 - x;
      const dy = src.top + src.height / 2 - y;
      // the arc's top: above both ends, higher for longer flights
      const lift = Math.min(140, 40 + Math.hypot(dx, dy) * 0.25);
      if (flight.vanish) {
        return el.animate(
          [
            { transform: `${P} translate(-50%, -50%) translate(${dx}px, ${dy}px) rotateX(${tilt}deg) scale(0.75) rotate(${i * 9 - 18}deg)`, opacity: 1 },
            { transform: `${P} translate(-50%, -50%) translate(${dx * 0.4}px, ${dy * 0.4 - lift * 0.5}px) rotateX(${tilt / 2}deg) scale(0.95) rotate(${i * 7 - 10}deg)`, opacity: 1, offset: 0.5 },
            { transform: `${P} translate(-50%, -50%) scale(0.5)`, opacity: 0 },
          ],
          { duration: 520, delay: (flight.delay ?? 0) + i * 70, easing: 'cubic-bezier(0.3, 0.7, 0.3, 1)', fill: 'both' },
        );
      }
      // my own cards start face up and turn over in the air (Bluff plays land face down)
      const turn = faces ? 180 : 0;
      const spin = ((i * 23) % 30) - 15;
      return el.animate(
        [
          { transform: `${P} translate(-50%, -50%) translate(${dx}px, ${dy}px) rotateY(0deg) rotate(${faces ? 0 : i * 9 - 18}deg) scale(${faces ? 1 : 0.8})`, opacity: faces ? 1 : 0.5 },
          {
            transform: `${P} translate(-50%, -50%) translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) rotateX(${tilt * 0.3}deg) rotateY(${turn / 2}deg) rotate(${spin / 2}deg) scale(1.12)`,
            opacity: 1,
            offset: 0.45,
          },
          { transform: `${P} translate(-50%, -50%) rotateX(${tilt}deg) rotateY(${turn}deg) rotate(${spin}deg) scale(0.92)`, opacity: 1 },
        ],
        { duration: faces ? 640 : 480, delay: (flight.delay ?? 0) + i * 80, easing: 'cubic-bezier(0.25, 0.75, 0.35, 1)', fill: 'both' },
      );
    });
    const last = runs[runs.length - 1];
    if (last) last.onfinish = onDone;
    else onDone();
    return () => runs.forEach((a) => a?.cancel());
  }, [flight.key]);

  return (
    <div className="fly-layer" aria-hidden style={{ left: x, top: y }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={faces ? 'fly-card fly-turn' : 'fly-card'}
        >
          {faces ? (
            <>
              {/* both sides of the card: the face turns away and the owner's back turns in */}
              <PlayingCard card={faces[i]} size={flight.size ?? 'md'} className="fly-front" />
              <PlayingCard faceDown size={flight.size ?? 'md'} back={flight.backs?.[0]} aura={flight.auras?.[0] ?? null} className="fly-back" />
            </>
          ) : flight.rangCard ? (
            <RangCard card={flight.rangCard} size={flight.size ?? 'sm'} />
          ) : flight.card ? (
            <PlayingCard card={flight.card} size={flight.size ?? 'sm'} />
          ) : (
            <PlayingCard
              faceDown
              size={flight.size ?? 'sm'}
              back={flight.backs?.length ? flight.backs[i % flight.backs.length] : undefined}
              aura={flight.auras?.length ? flight.auras[i % flight.auras.length] : null}
            />
          )}
        </div>
      ))}
    </div>
  );
}
