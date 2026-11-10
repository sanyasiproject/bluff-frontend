import { useEffect, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { reducedMotion } from '../lib/motion';
import { sfx } from '../lib/sounds';
import { RANKS, SUITS as CARD_SUITS, type Card } from '../types';
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

const FLIP_EVERY_MS = 3200;

/** three different random cards for the fan */
function freshCards(round: number): Card[] {
  const picked: Card[] = [];
  while (picked.length < 3) {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suit = CARD_SUITS[Math.floor(Math.random() * CARD_SUITS.length)];
    if (!picked.some((c) => c.rank === rank && c.suit === suit)) picked.push({ id: `${rank}${suit}-${round}`, rank, suit });
  }
  return picked;
}

/** the home screen's card fan: deals in, sways, and all three cards flip to new ones every few seconds (or on a tap) */
export function HeroFan() {
  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<Card[]>(() => [
    { id: 'h1', rank: 'A', suit: 'S' },
    { id: 'h2', rank: 'K', suit: 'C' },
    { id: 'h3', rank: 'Q', suit: 'H' },
  ]);
  const flip = () => {
    setRound((r) => r + 1);
    setCards(freshCards(Date.now()));
  };

  // each flip restarts the timer, so a tap never gets a second flip right after it
  useEffect(() => {
    if (reducedMotion()) return;
    const t = setTimeout(flip, round === 0 ? FLIP_EVERY_MS + 800 : FLIP_EVERY_MS);
    return () => clearTimeout(t);
  }, [round]);

  // the middle card and the two side cards take turns: one side of the fan is always hidden, like in Bluff
  const middleDown = round % 2 === 0;
  const isDown = (i: number) => (i === 1 ? middleDown : !middleDown);
  return (
    <button
      type="button"
      className="hero-cards"
      aria-label="Flip the cards"
      onClick={() => {
        sfx.play(1);
        flip();
      }}
    >
      {cards.map((card, i) => (
        <span key={i} className={`hero-slot c${i + 1}`}>
          {/* re-keyed so every round flips the card, one after another */}
          <PlayingCard
            key={isDown(i) ? `back-${round}-${i}` : card.id}
            card={card}
            faceDown={isDown(i)}
            size="lg"
            className="hero-flip"
            style={{ animationDelay: `${i * 130}ms` }}
          />
        </span>
      ))}
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
