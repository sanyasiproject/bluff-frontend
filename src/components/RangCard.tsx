import { createContext, useContext, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import type { RangCard as RangCardData, RangColor, RangValue } from '../types';
import { PlayingCard } from './PlayingCard';

/** colour names as shown on screen */
export const RANG_COLOR_NAME: Record<RangColor, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' };

/** the four card colours */
export const RANG_HEX: Record<RangColor, string> = { red: '#e2342f', blue: '#1f74e0', green: '#21a150', yellow: '#f6b80c' };

const VALUE_NAME: Partial<Record<RangValue, string>> = { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw 2', wild: 'Wild', wild4: 'Wild Draw 4' };
const SYMBOL: Partial<Record<RangValue, string>> = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: '✦', wild4: '+4' };

export const isRangWild = (c: Pick<RangCardData, 'value'>) => c.value === 'wild' || c.value === 'wild4';

/** a short sign for chips and text: a digit, ⊘, ⇄, +2, ✦ or +4 */
export const rangSymbol = (c: Pick<RangCardData, 'value'>) => SYMBOL[c.value] ?? c.value;

/** "Red 7", "Blue Skip", "Green Draw 2", "Wild", "Wild Draw 4" */
export function rangCardName(c: Pick<RangCardData, 'color' | 'value'>): string {
  const value = VALUE_NAME[c.value] ?? c.value;
  if (isRangWild(c) || !c.color) return value;
  return `${RANG_COLOR_NAME[c.color]} ${value}`;
}

/** 7-0 swap is on at this table: 0 and 7 carry a swap badge */
export const RangSwapContext = createContext(false);

/** the swap badge: a 0 passes every hand round the table, a 7 swaps hands with one player */
function SwapBadge({ value }: { value: '0' | '7' }) {
  return (
    <span className={cx('rg-swap', value === '0' ? 'rotate' : 'switch')} aria-hidden>
      <svg viewBox="0 0 24 24">
        {value === '0' ? (
          <>
            <path d="M19 12a7 7 0 1 1-2.05-4.95" />
            <path d="M18.5 3.5v4.2h-4.2" />
          </>
        ) : (
          <>
            <path d="M4 8h14" />
            <path d="M14.5 4.5 18 8l-3.5 3.5" />
            <path d="M20 16H6" />
            <path d="M9.5 12.5 6 16l3.5 3.5" />
          </>
        )}
      </svg>
    </span>
  );
}

/** Skip and Reverse, drawn white with a dark edge */
function ActionIcon({ value }: { value: 'skip' | 'reverse' }) {
  const stroke = { stroke: 'rgba(20,10,0,.72)', strokeWidth: 9, fill: 'none', strokeLinecap: 'round' as const };
  const white = { stroke: '#fff', strokeWidth: 5, fill: 'none', strokeLinecap: 'round' as const };
  if (value === 'skip') {
    const shape = (s: typeof stroke) => (
      <>
        <circle cx="24" cy="24" r="16" {...s} />
        <line x1="12.7" y1="35.3" x2="35.3" y2="12.7" {...s} />
      </>
    );
    return (
      <svg viewBox="0 0 48 48" aria-hidden>
        {shape(stroke)}
        {shape(white)}
      </svg>
    );
  }
  const shape = (s: typeof stroke) => (
    <>
      <path d="M10 20a12 12 0 0 1 22-6" {...s} />
      <path d="M38 28a12 12 0 0 1-22 6" {...s} />
      <path d="M33 6v9h-9" {...s} strokeLinejoin="round" />
      <path d="M15 42v-9h9" {...s} strokeLinejoin="round" />
    </>
  );
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      {shape(stroke)}
      {shape(white)}
    </svg>
  );
}

interface Props {
  card?: RangCardData | null;
  faceDown?: boolean;
  /** omit to inherit --cw from the parent (used by the hand) */
  size?: 'sm' | 'md' | 'lg';
  /** a wild on the pile: the colour named with it, shown as a ring */
  chosen?: RangColor | null;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  /** added to what a screen reader says, e.g. ", playable" */
  note?: string;
  /** a face-down card: its owner's card back (CARD_BACKS id); omit for this phone's own back */
  back?: string;
  /** a face-down card's owner's shop aura */
  aura?: string | null;
}

/** a face-down Rang card: the same backs players unlock and pick for Bluff and Crazy 7 */
export function RangCardBack({ size, className, style, back, aura }: { size?: 'sm' | 'md' | 'lg'; className?: string; style?: CSSProperties; back?: string; aura?: string | null }) {
  return <PlayingCard faceDown size={size} className={className} style={style} back={back} aura={aura} />;
}

/** a Rang card: white stock, a bold colour panel, a big outlined number or a drawn sign; wilds on black with a four-colour disc */
export function RangCard({ card, faceDown, size, chosen, onClick, className, style, note = '', back, aura }: Props) {
  const swapOn = useContext(RangSwapContext);
  if (faceDown || !card) return <RangCardBack size={size} className={className} style={style} back={back} aura={aura} />;
  const swap = swapOn && (card.value === '0' || card.value === '7') ? card.value : null;
  const wild = isRangWild(card);
  const digit = /^[0-9]$/.test(card.value);
  const sym = rangSymbol(card);
  const classes = cx('card rang-card', size && `card-${size}`, wild ? 'rg-wild' : `rg-${card.color ?? 'red'}`, sym.length > 1 && 'rg-wide', onClick && 'tappable', className);
  const label =
    rangCardName(card) + (wild && chosen ? `, ${RANG_COLOR_NAME[chosen]}` : '') + (swap === '0' ? ', passes every hand on' : swap === '7' ? ', swaps hands' : '') + note;
  const corner = card.value === 'skip' || card.value === 'reverse' ? <ActionIcon value={card.value} /> : card.value === 'wild' ? 'W' : sym;
  const body = (
    <>
      <span className="rg-face" aria-hidden>
        {card.value === 'wild' && <span className="rg-disc" />}
        {card.value === 'wild4' && (
          <span className="rg-fan">
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
        {(card.value === 'skip' || card.value === 'reverse') && (
          <span className="rg-icon">
            <ActionIcon value={card.value} />
          </span>
        )}
        {(digit || card.value === 'draw2' || card.value === 'wild4') && (
          <b className={cx('rg-big', (card.value === '6' || card.value === '9') && 'under')}>{sym}</b>
        )}
        {swap && <SwapBadge value={swap} />}
        <span className="rg-corner tl">{corner}</span>
        <span className="rg-corner br">{corner}</span>
      </span>
      {wild && chosen && <span className="rg-chosen" style={{ '--chosen': RANG_HEX[chosen] } as CSSProperties} aria-hidden />}
    </>
  );
  return onClick ? (
    <button type="button" className={classes} style={style} onClick={onClick} aria-label={label}>
      {body}
    </button>
  ) : (
    <div className={classes} style={style} role="img" aria-label={label}>
      {body}
    </div>
  );
}

/** a tiny card chip for seat labels: the sign on the card's colour */
export function RangChip({ card, color }: { card: RangCardData; color?: RangColor | null }) {
  const wild = isRangWild(card);
  const tint = wild ? (color ?? null) : card.color;
  return (
    <i className={cx('rg-chip', wild && 'wild', tint && `rg-${tint}`)} aria-label={rangCardName(card)} role="img">
      {rangSymbol(card)}
    </i>
  );
}
