import type { CSSProperties } from 'react';
import { cx, isRed, rankPlural, SUIT_SYMBOL } from '../../lib/cards';
import { PlayingCard } from '../PlayingCard';
import type { Reveal, TableState } from './lessons';

/** Bluff's face-down pile, like the real table */
function Pile({ count }: { count: number }) {
  const shown = Math.min(count, 7);
  return (
    <div className="pile" aria-label={`${count} cards in the pile`}>
      {count === 0 && <div className="pile-empty">Pile</div>}
      {Array.from({ length: shown }, (_, i) => {
        const n = count - shown + i;
        return (
          <PlayingCard
            key={n}
            faceDown
            size="sm"
            className="pile-card"
            style={{ transform: `translate(-50%, -50%) rotate(${((n * 47) % 34) - 17}deg) translate(${((n * 13) % 11) - 5}px, ${-i}px)` }}
          />
        );
      })}
      {count > 0 && (
        <span key={count} className="pile-count bump">
          {count}
        </span>
      )}
    </div>
  );
}

/** a call turned over: one card face up, the rest face down */
function RevealRow({ r, picked }: { r: Reveal; picked: number }) {
  const at = r.at === 'picked' ? Math.min(picked, r.slots - 1) : r.at;
  return (
    <div className={cx('tut-reveal', r.caught ? 'caught' : 'truth')}>
      <p className="tut-reveal-title">{r.text}</p>
      <div className="reveal-cards">
        {Array.from({ length: r.slots }, (_, k) => (
          <div key={k} className={cx('reveal-slot', k === at && 'miss picked')}>
            <PlayingCard card={k === at ? r.card : null} faceDown={k !== at} size="md" className={k === at ? 'flip' : undefined} />
            {k === at && <span className="mark">✗</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface BluffProps {
  t: TableState;
  picked: number;
  pickTarget: boolean;
  onPick: (index: number) => void;
}

export function BluffBoard({ t, picked, pickTarget, onPick }: BluffProps) {
  return (
    <>
      <div className={cx('round-chip', t.round ? 'set' : 'blank')}>
        Round <b>{t.round ? rankPlural(t.round) : '–'}</b>
      </div>
      {t.reveal ? (
        <RevealRow r={t.reveal} picked={picked} />
      ) : t.pickFrom > 0 ? (
        <div className="pick-row">
          {Array.from({ length: t.pickFrom }, (_, k) => (
            <PlayingCard key={k} faceDown size="md" className={cx('pick-card', pickTarget && 'tut-target')} onClick={() => onPick(k)} />
          ))}
        </div>
      ) : (
        <Pile count={t.pile} />
      )}
      {t.lastPlay && !t.reveal && <p className="last-play">{t.lastPlay}</p>}
    </>
  );
}

interface Crazy7Props {
  t: TableState;
  deckTarget: boolean;
  onDeck: () => void;
}

export function Crazy7Board({ t, deckTarget, onDeck }: Crazy7Props) {
  const under = t.under.slice(-3);
  return (
    <>
      <div className="c7-board">
        <button
          type="button"
          className={cx('c7-deck', deckTarget && 'live')}
          aria-label={deckTarget ? `${t.pickLabel}, ${t.deck} left in the deck` : `${t.deck} cards in the deck`}
          onClick={onDeck}
        >
          {[0, 1, 2].map((k) => (
            <PlayingCard key={k} faceDown size="md" className="c7-deck-card" style={{ translate: `${k * -2}px ${k * -3}px` } as CSSProperties} />
          ))}
          <span key={t.deck} className="c7-count bump">
            {t.deck}
          </span>
          {deckTarget && <span className="c7-deck-tip">{t.pickLabel}</span>}
        </button>
        <div className="c7-pile" aria-label={t.top ? `Top card ${t.top.rank}${SUIT_SYMBOL[t.top.suit]}` : 'Pile'}>
          {under.map((card, k) => (
            <PlayingCard key={card.id} card={card} size="md" className="c7-under" style={{ rotate: `${((k * 23) % 30) - 15}deg` } as CSSProperties} />
          ))}
          {t.top && (
            // re-keyed when a new card lands, so it drops in
            <div key={t.top.id} className={cx('c7-top', t.top.rank === '7' && 'seven')}>
              <PlayingCard card={t.top} size="lg" />
            </div>
          )}
        </div>
      </div>
      {t.top && (
        <p className="c7-hint">
          Match <b className={cx('c7-suit', isRed(t.top.suit) && 'red')}>{SUIT_SYMBOL[t.top.suit]}</b> or <b>{t.top.rank}</b>
        </p>
      )}
    </>
  );
}
