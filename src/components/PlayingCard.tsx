import type { CSSProperties } from 'react';
import { cx, isRed, rankName, SUIT_NAME } from '../lib/cards';
import type { Card, Rank, Suit } from '../types';

interface Props {
  card?: Card | null;
  faceDown?: boolean;
  /** omit to inherit --cw from the parent (used by the hand) */
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  /** 1-based tap order, shown as a badge on selected cards */
  order?: number;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  /** added to what a screen reader says, e.g. ", playable" */
  note?: string;
  /** a face-down card's back (CARD_BACKS id): its owner's; omit for this phone's own back */
  back?: string;
  /** a Kismat card: wild this game, marked with a small 🍀 */
  wild?: boolean;
}

/** suit shapes drawn in the card's colour, so they look the same on every phone */
const SUIT_PATH: Record<Suit, string> = {
  S: 'M12 1.6C9.4 5.6 3 9 3 14a4.6 4.6 0 0 0 7.7 3.4c-.3 1.9-1.1 3.4-2.7 4.9h8c-1.6-1.5-2.4-3-2.7-4.9A4.6 4.6 0 0 0 21 14c0-5-6.4-8.4-9-12.4z',
  H: 'M12 21.8C5.8 16.9 2.4 13.4 2.4 8.9A5 5 0 0 1 12 6.1a5 5 0 0 1 9.6 2.8c0 4.5-3.4 8-9.6 12.9z',
  D: 'M12 1.4 20.2 12 12 22.6 3.8 12z',
  C: 'M12 2.2a4.5 4.5 0 0 0-3.9 6.8 4.5 4.5 0 1 0 2.6 8.2c-.3 2-1.1 3.6-2.7 5.1h8c-1.6-1.5-2.4-3.1-2.7-5.1a4.5 4.5 0 1 0 2.6-8.2A4.5 4.5 0 0 0 12 2.2z',
};

function SuitIcon({ suit }: { suit: Suit }) {
  return (
    <svg className="suit" viewBox="0 0 24 24" aria-hidden>
      <path d={SUIT_PATH[suit]} />
    </svg>
  );
}

/** the headpiece over a court card's letter: a pointed crown (K), a pearl tiara (Q), a plumed cap (J) */
function CourtArt({ rank }: { rank: Rank }) {
  return (
    <svg className="court-art" viewBox="0 0 32 19" aria-hidden>
      {rank === 'K' && (
        <>
          <path d="M4 17.5V7l6 4.5 6-8 6 8 6-4.5v10.5z" />
          <circle cx="16" cy="2.4" r="1.9" />
          <circle cx="4" cy="6" r="1.4" />
          <circle cx="28" cy="6" r="1.4" />
        </>
      )}
      {rank === 'Q' && (
        <>
          <path d="M3 17.5c1-5 6-8.5 13-8.5s12 3.5 13 8.5z" />
          <circle cx="6" cy="12" r="1.6" />
          <circle cx="10.5" cy="9" r="1.6" />
          <circle cx="16" cy="7.4" r="1.9" />
          <circle cx="21.5" cy="9" r="1.6" />
          <circle cx="26" cy="12" r="1.6" />
        </>
      )}
      {rank === 'J' && (
        <>
          <path d="M19 10c.5-4.5 4-8 10-9-2.2 2.2-3.4 5.3-4.4 9.4z" className="plume" />
          <path d="M5 17.5c0-5.4 4.6-8.5 11-8.5s11 3.1 11 8.5z" />
          <path d="M5.5 14.5h21" className="band" />
        </>
      )}
    </svg>
  );
}

export function PlayingCard({ card, faceDown, size, selected, order, onClick, className, style, note = '', back, wild }: Props) {
  const shown = faceDown ? null : (card ?? null);
  const court = !!shown && ['J', 'Q', 'K'].includes(shown.rank);
  const classes = cx(
    'card',
    size && `card-${size}`,
    !shown ? 'back' : isRed(shown.suit) ? 'red' : 'black',
    court && 'court',
    selected && 'selected',
    shown && wild && 'wild',
    onClick && 'tappable',
    className,
  );
  const label = (shown ? `${rankName(shown.rank)} of ${SUIT_NAME[shown.suit]}${wild ? ', wild Kismat card' : ''}` : 'Face-down card') + note;
  // "10" is squeezed a little so it fits the slice of an overlapped card
  const corner = (pos: 'tl' | 'br') =>
    shown && (
      <span className={cx('corner', pos)}>
        <b className={cx(shown.rank === '10' && 'ten')}>{shown.rank}</b>
        <SuitIcon suit={shown.suit} />
      </span>
    );
  const body = shown && (
    <>
      {court ? (
        <span className="pip face">
          <CourtArt rank={shown.rank} />
          <b>{shown.rank}</b>
          <SuitIcon suit={shown.suit} />
        </span>
      ) : (
        <span className={cx('pip', shown.rank === 'A' && 'ace')}>
          <SuitIcon suit={shown.suit} />
        </span>
      )}
      {corner('tl')}
      {corner('br')}
      {wild && (
        <span className="wild-mark" aria-hidden>
          🍀
        </span>
      )}
      {order !== undefined && <span className="order-badge">{order}</span>}
    </>
  );

  const backId = shown ? undefined : back;
  return onClick ? (
    <button type="button" className={classes} style={style} onClick={onClick} aria-label={label} aria-pressed={selected} data-back={backId}>
      {body}
    </button>
  ) : (
    <div className={classes} style={style} role="img" aria-label={label} data-back={backId}>
      {body}
    </div>
  );
}
