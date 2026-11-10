import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { sfx } from '../lib/sounds';
import type { Card } from '../types';
import { PlayingCard } from './PlayingCard';

// fixed positions so the background looks the same on every render
const SUITS = [
  { s: '♠', left: 6, size: 34, dur: 26, delay: -4 },
  { s: '♥', left: 22, size: 22, dur: 21, delay: -15 },
  { s: '♣', left: 38, size: 28, dur: 29, delay: -9 },
  { s: '♦', left: 55, size: 20, dur: 23, delay: -19 },
  { s: '♠', left: 70, size: 26, dur: 27, delay: -1 },
  { s: '♥', left: 84, size: 32, dur: 24, delay: -12 },
  { s: '♦', left: 93, size: 18, dur: 31, delay: -22 },
  { s: '♣', left: 13, size: 18, dur: 33, delay: -27 },
];

/** faint card suits floating up behind the home screen and lobby */
export function SuitDrift() {
  return (
    <div className="suit-drift" aria-hidden>
      {SUITS.map((x, i) => (
        <span
          key={i}
          className={cx(x.s === '♥' || x.s === '♦' ? 'red' : 'black')}
          style={{ left: `${x.left}%`, fontSize: x.size, animationDuration: `${x.dur}s`, animationDelay: `${x.delay}s` } as CSSProperties}
        >
          {x.s}
        </span>
      ))}
    </div>
  );
}

const PEEKS: Card[] = [
  { id: 'p1', rank: 'K', suit: 'C' },
  { id: 'p2', rank: '7', suit: 'D' },
  { id: 'p3', rank: 'J', suit: 'H' },
  { id: 'p4', rank: '3', suit: 'S' },
  { id: 'p5', rank: 'A', suit: 'H' },
  { id: 'p6', rank: '9', suit: 'C' },
];

/** the home screen's card fan: deals in, sways, and the middle card flips when tapped */
export function HeroFan() {
  const [peek, setPeek] = useState<Card | null>(null);
  const next = useRef(0);

  useEffect(() => {
    if (!peek) return;
    const t = setTimeout(() => setPeek(null), 1400);
    return () => clearTimeout(t);
  }, [peek]);

  return (
    <button
      type="button"
      className="hero-cards"
      aria-label="Peek at the middle card"
      onClick={() => {
        sfx.play(1);
        setPeek(PEEKS[next.current++ % PEEKS.length]);
      }}
    >
      <span className="hero-slot c1">
        <PlayingCard card={{ id: 'h1', rank: 'A', suit: 'S' }} size="lg" />
      </span>
      <span className="hero-slot c2">
        {/* re-keyed so each peek flips the card */}
        <PlayingCard key={peek?.id ?? 'back'} card={peek} faceDown={!peek} size="lg" className="hero-flip" />
      </span>
      <span className="hero-slot c3">
        <PlayingCard card={{ id: 'h3', rank: 'Q', suit: 'H' }} size="lg" />
      </span>
    </button>
  );
}

/** a title whose letters bounce in, then shine now and then */
export function ShineTitle({ text }: { text: string }) {
  return (
    <h1 className="shine-title" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden style={{ '--i': i } as CSSProperties}>
          {ch}
        </span>
      ))}
    </h1>
  );
}
