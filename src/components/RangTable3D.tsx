import { paperSteps } from './Table3D';
import type { CSSProperties, RefObject } from 'react';
import { cx } from '../lib/cards';
import type { RangView } from '../types';
import { isRangWild, RANG_HEX, RangCard, RangCardBack, rangCardName } from './RangCard';

/** a steady small turn for a card, the same on every screen */
function tiltOf(id: string, n: number, range = 15) {
  let h = n * 31;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) % 997;
  return (h % range) - (range - 1) / 2;
}

/** Rang's draw deck as a real stack on the felt: paper layers for the cards left, a few backs on top; tap to pick when it glows */
export function RangDeck3D({ count, live, penalty, boxRef, onPick }: { count: number; live: boolean; penalty: number; boxRef: RefObject<HTMLButtonElement>; onPick: () => void }) {
  // one paper layer for every three cards, so a full deck stands tall
  const layers = Math.min(Math.ceil(Math.max(count - 2, 0) / 3), 32);
  const backs = Math.min(count, 2);
  return (
    <button
      ref={boxRef}
      type="button"
      className={cx('rg3-deck', live && 'live')}
      disabled={!live}
      style={{ ['--layers' as string]: layers } as CSSProperties}
      aria-label={live ? (penalty > 0 ? `Pick ${penalty} cards, ${count} left in the deck` : `Pick a card, ${count} left in the deck`) : `${count} cards in the deck`}
      onClick={onPick}
    >
      {live && <span className="rg3-glow" aria-hidden />}
      {count === 0 && <span className="rg3-empty">Empty</span>}
      {paperSteps(layers).map((i) => (
        <i key={i} className="rg3-layer" style={{ ['--i' as string]: i, rotate: `${((i * 37) % 5) - 2}deg` } as CSSProperties} aria-hidden />
      ))}
      {Array.from({ length: backs }, (_, i) => (
        <RangCardBack
          key={i}
          className="rg3-card rg3-back"
          style={{ rotate: `${i === backs - 1 ? 0 : -3}deg`, translate: `0 0 calc(var(--layers) * 0.9px + ${i * 1.2 + 1}px)` } as CSSProperties}
        />
      ))}
      {count > 0 && (
        <span key={count} className="rg3-count bump">
          {count}
        </span>
      )}
      {live && <span className="rg3-tip">{penalty > 0 ? `Pick ${penalty}` : 'Pick'}</span>}
    </button>
  );
}

/** the discard pile as a stack: the top card face up, the ones before it peeking out under it at odd angles */
export function RangPile3D({ rg, boxRef }: { rg: RangView; boxRef: RefObject<HTMLDivElement> }) {
  const under = rg.under.slice(-4);
  const rest = Math.max(rg.pileCount - under.length - (rg.top ? 1 : 0), 0);
  const layers = Math.min(Math.ceil(rest / 2), 30);
  const topZ = `calc(var(--layers) * 0.9px + ${under.length * 1.2 + 2}px)`;
  return (
    <div
      className="rg3-pile"
      ref={boxRef}
      style={{ ['--layers' as string]: layers } as CSSProperties}
      aria-label={rg.top ? `Top card ${rangCardName(rg.top)}, ${rg.pileCount} in the pile` : 'Pile'}
    >
      {paperSteps(layers).map((i) => (
        <i key={`l${i}`} className="rg3-layer" style={{ ['--i' as string]: i, rotate: `${((i * 41) % 13) - 6}deg` } as CSSProperties} aria-hidden />
      ))}
      {under.map((c, i) => {
        const n = rg.pileCount - under.length - 1 + i;
        return (
          <RangCard
            key={`${c.id}-${n}`}
            card={c}
            className="rg3-card rg3-under"
            style={
              {
                rotate: `${((n * 47) % 40) - 20}deg`,
                translate: `${((n * 13) % 15) - 7}px ${((n * 29) % 11) - 5}px calc(var(--layers) * 0.9px + ${i * 1.2 + 1}px)`,
              } as CSSProperties
            }
          />
        );
      })}
      {rg.top && (
        // re-keyed when a new card lands or the colour changes, so it drops in
        <div
          key={`${rg.top.id}-${rg.pileCount}-${rg.color}`}
          className={cx('rg3-top', (rg.top.value === 'draw2' || rg.top.value === 'wild4') && 'hit')}
          style={{ rotate: `${tiltOf(rg.top.id, rg.pileCount)}deg`, translate: `0 0 ${topZ}` } as CSSProperties}
        >
          <RangCard card={rg.top} className="rg3-card" chosen={isRangWild(rg.top) ? rg.color : null} />
        </div>
      )}
      <span className="rg3-count">{rg.pileCount}</span>
    </div>
  );
}

/** the colour in play: a glowing ring lying on the felt round the pile */
export function RangRing({ rg }: { rg: RangView }) {
  if (!rg.color) return null;
  return <span key={rg.color} className="rg3-ring" style={{ ['--rg-now' as string]: RANG_HEX[rg.color] } as CSSProperties} aria-hidden />;
}

/** the way play goes: two faint curved arrows on the felt round the deck and pile; they flip when it reverses */
export function RangArrows({ dir }: { dir: 1 | -1 }) {
  return (
    <span key={dir} className={cx('rg3-dir', dir === -1 && 'ccw')} role="img" aria-label={dir === 1 ? 'Play goes clockwise' : 'Play goes anticlockwise'}>
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden>
        <path d="M20 30 Q100 -12 180 30" />
        <path d="M180 30 l-7 -14 M180 30 l-16 2" />
        <path d="M180 70 Q100 112 20 70" />
        <path d="M20 70 l7 14 M20 70 l16 -2" />
      </svg>
    </span>
  );
}
