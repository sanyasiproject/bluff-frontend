import type { CSSProperties, RefObject } from 'react';
import { DEFAULT_CARD_BACK } from '../types';
import { PlayingCard } from './PlayingCard';

/** paper layers for a stack of n: at most 6 drawn, spread over the same height (each 3D layer costs the phone a lot) */
export function paperSteps(n: number): number[] {
  if (n <= 6) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: 6 }, (_, j) => Math.round(((j + 1) * n) / 6) - 1);
}

/** an opponent's cards lying face down on the felt in front of them: a small fan, more cards a wider fan */
export function OppCards({ count, back, aura, turn }: { count: number; back?: string; aura?: string | null; turn: number }) {
  const shown = Math.min(count, 7);
  if (shown === 0) return null;
  const spread = Math.min(56, 9 * (shown - 1));
  return (
    <div className="opp-cards" style={{ rotate: `${turn.toFixed(1)}deg` } as CSSProperties} aria-hidden>
      {Array.from({ length: shown }, (_, i) => {
        const t = shown > 1 ? i / (shown - 1) - 0.5 : 0;
        return (
          <PlayingCard
            key={i}
            faceDown
            back={back ?? DEFAULT_CARD_BACK}
            aura={aura}
            className="opp-card"
            style={{ rotate: `${(t * spread).toFixed(1)}deg`, ['--k' as string]: i } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** Bluff's pile as a real stack on the felt: paper layers that grow with the count, the last cards played on top at odd angles */
export function Pile3D({
  count,
  boxRef,
  playKey,
  backs,
  auras = [],
}: {
  count: number;
  boxRef: RefObject<HTMLDivElement>;
  playKey: string | null;
  backs: string[];
  auras?: (string | null)[];
}) {
  const top = Math.min(count, 6);
  const under = count - top;
  // one paper layer for every two cards underneath, so a big pile stands tall
  const layers = Math.min(Math.ceil(under / 2), 40);
  const offset = top - backs.length;
  return (
    <div className="pile3d" ref={boxRef} aria-label={`${count} cards in the pile`} style={{ ['--layers' as string]: layers } as CSSProperties}>
      {count === 0 && <div className="pile3d-empty">Pile</div>}
      {paperSteps(layers).map((i) => (
        <i key={`l${i}`} className="pile3d-layer" style={{ ['--i' as string]: i, rotate: `${((i * 37) % 9) - 4}deg` } as CSSProperties} />
      ))}
      {Array.from({ length: top }, (_, i) => {
        const n = under + i;
        return (
          <PlayingCard
            key={n}
            faceDown
            back={backs[i - offset] ?? DEFAULT_CARD_BACK}
            aura={auras[i - offset]}
            className="pile3d-card"
            style={
              {
                ['--i' as string]: i,
                rotate: `${((n * 47) % 40) - 20}deg`,
                translate: `${((n * 13) % 15) - 7}px ${((n * 29) % 11) - 5}px calc(var(--layers) * 0.9px + ${i * 1.2 + 1}px)`,
              } as CSSProperties
            }
          />
        );
      })}
      {playKey && count > 0 && <span key={playKey} className="pile-ripple" />}
      {count > 0 && (
        <span key={count} className="pile3d-count bump">
          {count}
        </span>
      )}
    </div>
  );
}
