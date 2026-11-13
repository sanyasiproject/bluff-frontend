import type { CSSProperties } from 'react';
import { cx, isRed, rankName, SUIT_NAME, SUIT_SYMBOL } from '../lib/cards';
import type { Card } from '../types';

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
}

export function PlayingCard({ card, faceDown, size, selected, order, onClick, className, style, note = '' }: Props) {
  const shown = faceDown ? null : (card ?? null);
  const classes = cx(
    'card',
    size && `card-${size}`,
    !shown ? 'back' : isRed(shown.suit) ? 'red' : 'black',
    selected && 'selected',
    onClick && 'tappable',
    className,
  );
  const label = (shown ? `${rankName(shown.rank)} of ${SUIT_NAME[shown.suit]}` : 'Face-down card') + note;
  const face = shown && ['J', 'Q', 'K'].includes(shown.rank);
  const body = shown && (
    <>
      <span className="corner tl">
        <b>{shown.rank}</b>
        <i>{SUIT_SYMBOL[shown.suit]}</i>
      </span>
      <span className={cx('pip', face && 'face')}>
        {face ? shown.rank : SUIT_SYMBOL[shown.suit]}
        {face && <small>{SUIT_SYMBOL[shown.suit]}</small>}
      </span>
      <span className="corner br">
        <b>{shown.rank}</b>
        <i>{SUIT_SYMBOL[shown.suit]}</i>
      </span>
      {order !== undefined && <span className="order-badge">{order}</span>}
    </>
  );

  return onClick ? (
    <button type="button" className={classes} style={style} onClick={onClick} aria-label={label} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={classes} style={style} role="img" aria-label={label}>
      {body}
    </div>
  );
}
