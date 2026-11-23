import { paperSteps } from './Table3D';
import type { CSSProperties, RefObject } from 'react';
import { cx, SUIT_SYMBOL } from '../lib/cards';
import type { Crazy7View } from '../types';
import { PlayingCard } from './PlayingCard';

/** Crazy 7's deck as a real stack on the felt: paper layers that shrink as it empties, a back on top; tap to pick */
export function Deck3D({ count, live, penalty, boxRef, onPick }: { count: number; live: boolean; penalty: number; boxRef: RefObject<HTMLButtonElement>; onPick: () => void }) {
  // one paper layer for every two cards, so a full deck stands tall
  const layers = Math.min(Math.ceil(Math.max(count - 1, 0) / 2), 30);
  return (
    <button
      ref={boxRef}
      type="button"
      className={cx('c7-deck3d', live && 'live')}
      disabled={!live}
      aria-label={live ? (penalty > 0 ? `Pick ${penalty} cards, ${count} left in the deck` : `Pick a card, ${count} left in the deck`) : `${count} cards in the deck`}
      onClick={onPick}
      style={{ ['--layers' as string]: layers } as CSSProperties}
    >
      {count === 0 && <span className="c7-3d-empty">Empty</span>}
      {live && <i className="c7-deck3d-glow" aria-hidden />}
      {paperSteps(layers).map((i) => (
        <i key={i} className="c7-3d-layer back" style={{ ['--i' as string]: i } as CSSProperties} />
      ))}
      {count > 0 && <PlayingCard faceDown className="c7-3d-card c7-deck3d-top" />}
      {count > 0 && (
        <span key={count} className="c7-3d-count bump">
          {count}
        </span>
      )}
    </button>
  );
}

/** the discard pile as a real stack: paper layers for its height, the last few cards peeking out at odd angles, the top card face up */
export function Discard3D({ c7, boxRef }: { c7: Crazy7View; boxRef: RefObject<HTMLDivElement> }) {
  const under = c7.under.slice(-3);
  const below = Math.max(c7.pileCount - under.length - 1, 0);
  const layers = Math.min(Math.ceil(below / 2), 30);
  const top = c7.top;
  return (
    <div
      className="c7-discard3d"
      ref={boxRef}
      aria-label={top ? `Top card ${top.rank}${SUIT_SYMBOL[top.suit]}, ${c7.pileCount} in the pile` : 'Pile'}
      style={{ ['--layers' as string]: layers } as CSSProperties}
    >
      {!top && <span className="c7-3d-empty">Pile</span>}
      {paperSteps(layers).map((i) => (
        <i key={i} className="c7-3d-layer" style={{ ['--i' as string]: i, rotate: `${((i * 37) % 9) - 4}deg` } as CSSProperties} />
      ))}
      {under.map((c, i) => {
        const n = c7.pileCount - under.length + i;
        return (
          <PlayingCard
            key={`${c.id}-${n}`}
            card={c}
            className="c7-3d-card c7-3d-under"
            style={
              {
                rotate: `${((n * 47) % 50) - 25}deg`,
                translate: `${((n * 13) % 25) - 12}px ${((n * 7) % 13) - 6}px calc(var(--layers) * 0.9px + ${i * 1.2 + 1}px)`,
              } as CSSProperties
            }
          />
        );
      })}
      {top && (
        // re-keyed when a new card lands, so it drops in
        <PlayingCard
          key={`${top.id}-${c7.pileCount}`}
          card={top}
          className={cx('c7-3d-card c7-3d-top', top.rank === '7' && 'seven')}
          style={{ rotate: `${((c7.pileCount * 37) % 15) - 7}deg` } as CSSProperties}
        />
      )}
      {c7.pileCount > 0 && (
        <span key={c7.pileCount} className="c7-3d-count bump">
          {c7.pileCount}
        </span>
      )}
    </div>
  );
}
