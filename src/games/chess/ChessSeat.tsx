// A player's card beside the board: avatar, name, rating (with ? while provisional), material lead and a big clock
import type { CSSProperties, ReactNode } from 'react';
import { Avatar } from '../../components/Avatar';
import { cx } from '../../lib/cards';
import type { PublicPlayer } from '../../types';
import type { ChatBubble } from '../../useBluff';
import { clockText } from './clock';
import type { Color, Role } from './lib';
import { PieceSvg, type PieceSet } from './pieceArt';

interface Props {
  player: PublicPlayer | undefined;
  name: string;
  color: Color;
  rating?: { r: number; prov: boolean } | null;
  /** bot level, for bots */
  botLevel?: number | null;
  /** rating change at the end, e.g. +14 */
  diff?: number | null;
  lead: { roles: Role[]; plus: number };
  set: PieceSet;
  clock: number | null;
  /** whose clock is running */
  active: boolean;
  /** tick sounds and red under 10 s */
  fast: boolean;
  mine: boolean;
  bubble: ChatBubble | null;
  /** three-check: checks this side has given */
  checks?: number | null;
  onTap?: () => void;
  children?: ReactNode;
}

export const ratingText = (r: { r: number; prov: boolean }) => `${Math.round(r.r)}${r.prov ? '?' : ''}`;

export function ChessSeat({ player, name, color, rating, botLevel, diff, lead, set, clock, active, fast, mine, bubble, checks, onTap, children }: Props) {
  const low = clock !== null && clock < 10_000;
  const style = { '--side': color === 'w' ? '#f4efe3' : '#2a2623' } as CSSProperties;
  const head = (
    <>
      <span className="ch-av">
        <Avatar name={player?.name ?? name} avatar={player?.avatar} bot={player?.bot} member={player?.id} />
        <i className={cx('ch-side-dot', color)} aria-label={color === 'w' ? 'White' : 'Black'} />
      </span>
      <span className="ch-who">
        <b className="ch-name" data-no-translate>
          {name}
        </b>
        <span className="ch-rating">
          {rating ? ratingText(rating) : botLevel ? `🤖 Level ${botLevel}` : player?.bot ? 'Bot' : 'Casual'}
          {diff != null && <em className={cx('ch-diff', diff > 0 ? 'up' : diff < 0 ? 'down' : '')}>{diff > 0 ? `+${diff}` : diff}</em>}
        </span>
        <span className="ch-lead" aria-label={lead.plus ? `${lead.plus} points ahead` : undefined}>
          {lead.roles.map((r, i) => (
            <i key={i} className={cx('ch-cap', r)}>
              <PieceSvg role={r} color={color === 'w' ? 'b' : 'w'} set={set} />
            </i>
          ))}
          {lead.plus > 0 && <small>+{lead.plus}</small>}
        </span>
      </span>
    </>
  );
  return (
    <div className={cx('ch-seat', active && 'active', mine && 'mine')} style={style}>
      {onTap ? (
        <button type="button" className="ch-seat-head" aria-label={`Throw an emoji at ${name}`} onClick={onTap}>
          {head}
        </button>
      ) : (
        <div className="ch-seat-head">{head}</div>
      )}
      {checks != null && (
        <span className="ch-checks" aria-label={`${checks} of 3 checks given`}>
          {[0, 1, 2].map((i) => (
            <i key={i} className={cx(i < checks && 'on')}>+</i>
          ))}
        </span>
      )}
      {clock !== null && (
        <span className={cx('ch-clock', active && 'run', low && 'low', fast && low && active && 'tick')} role="timer" aria-label={`${name}'s clock`}>
          {clockText(clock)}
        </span>
      )}
      {children}
      {bubble && (
        <span key={bubble.key} className="seat-bubble ch-bubble" data-no-translate>
          {bubble.text}
        </span>
      )}
    </div>
  );
}
