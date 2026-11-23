import { useLayoutEffect, useRef, type CSSProperties } from 'react';
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
  /** the card starts at this width (its size in my hand), from `from` */
  startWidth?: number;
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
  /** the size each card starts at when it leaves my hand, else 0 (its own size class) */
  const cwOf = (i: number) => Math.round(flight.froms?.[i]?.width ?? flight.startWidth ?? 0);
  const sized = (i: number) => (cwOf(i) ? undefined : (flight.size ?? 'md'));

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
      const lift = Math.min(150, 50 + Math.hypot(dx, dy) * 0.28);
      if (flight.vanish) {
        return el.animate(
          [
            { transform: `${P} translate(-50%, -50%) translate(${dx}px, ${dy}px) rotateX(${tilt}deg) scale(0.75) rotate(${i * 9 - 18}deg)`, opacity: 1 },
            { transform: `${P} translate(-50%, -50%) translate(${dx * 0.4}px, ${dy * 0.4 - lift * 0.5}px) rotateX(${tilt / 2}deg) scale(0.95) rotate(${i * 7 - 10}deg)`, opacity: 1, offset: 0.5 },
            { transform: `${P} translate(-50%, -50%) scale(0.5)`, opacity: 0 },
          ],
          { duration: 560, delay: (flight.delay ?? 0) + i * 70, easing: 'cubic-bezier(0.4, 0, 0.3, 1)', fill: 'both' },
        );
      }
      // a card from my hand starts at its real size and shrinks to the pile's as it lands
      const startW = src.width > 8 && (flight.froms || flight.startWidth) ? src.width : 0;
      const endScale = startW ? Math.min(1.1, Math.max(0.45, to.width / startW)) : 0.92;
      // my own Bluff cards start face up and turn over in the air
      const turn = faces ? 180 : 0;
      const spin = ((i * 23) % 30) - 15;
      const at = (fx: number, fy: number) => `${P} translate(-50%, -50%) translate(${fx}px, ${fy}px)`;
      return el.animate(
        [
          // still in the hand
          { transform: `${at(dx, dy)} rotateY(0deg) rotate(${startW ? 0 : i * 9 - 18}deg) scale(${startW ? 1 : 0.8})`, opacity: startW ? 1 : 0.5, easing: 'ease-out' },
          // lifted out of the hand
          { transform: `${at(dx, dy - 28)} rotateY(${turn * 0.08}deg) rotate(${spin * 0.2}deg) scale(${startW ? 1.08 : 0.95})`, opacity: 1, offset: 0.18, easing: 'ease-in-out' },
          // over the top of the arc, turning
          { transform: `${at(dx * 0.4, dy * 0.4 - lift)} rotateX(${tilt * 0.4}deg) rotateY(${turn * 0.7}deg) rotate(${spin * 0.7}deg) scale(${(1 + endScale) / 2 + 0.06})`, opacity: 1, offset: 0.6, easing: 'ease-out' },
          // lying on the pile
          { transform: `${at(0, 0)} rotateX(${tilt}deg) rotateY(${turn}deg) rotate(${spin}deg) scale(${endScale})`, opacity: 1 },
        ],
        { duration: faces ? 820 : 700, delay: (flight.delay ?? 0) + i * 90, fill: 'both' },
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
          // a card leaving my hand keeps its size at the start (its cards inherit --cw)
          style={cwOf(i) ? ({ ['--cw' as string]: `${cwOf(i)}px` } as CSSProperties) : undefined}
        >
          {faces ? (
            <>
              {/* both sides of the card: the face turns away and the owner's back turns in */}
              <PlayingCard card={faces[i]} size={sized(i)} className="fly-front" />
              <PlayingCard faceDown size={sized(i)} back={flight.backs?.[0]} aura={flight.auras?.[0] ?? null} className="fly-back" />
            </>
          ) : flight.rangCard ? (
            <RangCard card={flight.rangCard} size={cwOf(i) ? undefined : (flight.size ?? 'sm')} />
          ) : flight.card ? (
            <PlayingCard card={flight.card} size={cwOf(i) ? undefined : (flight.size ?? 'sm')} />
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
