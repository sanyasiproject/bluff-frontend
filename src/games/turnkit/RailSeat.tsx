// A player card on the side rails (landscape): avatar, name, the game's key number big, a turn glow and "Your turn!" pill
import type { CSSProperties, ReactNode, Ref } from 'react';
import { Seat } from '../../components/Table';
import { cx } from '../../lib/cards';
import type { PublicPlayer } from '../../types';
import type { ChatBubble } from '../../useBluff';
import { ColorMark, colorName } from './ColorMark';

/** corners → which rail and where on it (top or bottom) */
export const railOf = (corner: string): 'l' | 'r' => (corner === 'tl' || corner === 'bl' ? 'l' : 'r');
const railRank = (corner: string) => (corner === 'tl' || corner === 'tr' ? 0 : 1);

interface Props {
  player: PublicPlayer | undefined;
  goneName?: string;
  color: string;
  turn: boolean;
  mine: boolean;
  out?: boolean;
  bubble: ChatBubble | null;
  turnEndsAt?: number | null;
  turnSec?: number;
  /** the big number (points left, boxes, cells, score) */
  big: ReactNode;
  /** re-keys the number so it bumps when it changes */
  bigKey?: string | number;
  /** what the number is, small under it */
  label?: ReactNode;
  /** the pill when it's their turn (mine says "Your turn!") */
  turnText?: string;
  /** the pill on my own card (default "Your turn!") */
  myTurnText?: string;
  /** extra rows under the number (darts of the turn, a share bar…) */
  children?: ReactNode;
  /** a game skin class for the card */
  skin?: string;
  numRef?: Ref<HTMLElement>;
  onTap?: () => void;
  /** show the colour chip ("You · Red" on mine); icon is the player's piece, a colour dot by default */
  chip?: boolean;
  icon?: ReactNode;
  /** the chip's name instead of the colour's (e.g. a coin colour) */
  chipName?: string;
}

export function RailSeat({ player, goneName, color, turn, mine, out, bubble, turnEndsAt, turnSec, big, bigKey, label, turnText, myTurnText, children, skin, numRef, onTap, chip, icon, chipName }: Props) {
  const style = { '--pc': color, '--seat-ring': color, '--lu-col': color } as CSSProperties;
  const stat = (
    <span className="pr-stat">
      <b ref={numRef as Ref<HTMLElement>} key={bigKey} className="pr-num bump">
        {big}
      </b>
      {label && <small className="pr-label">{label}</small>}
    </span>
  );
  const tag = chip ? (
    <>
      {stat}
      <ColorMark color={color} name={chipName ?? colorName(color)} icon={icon} mine={mine} />
    </>
  ) : (
    stat
  );
  return (
    <div className={cx('pr-seat', skin, chip && 'has-chip', turn && 'turn', mine && 'mine', out && 'out')} style={style}>
      {turn && <span className="pr-pill">{mine ? (myTurnText ?? 'Your turn!') : (turnText ?? 'Their turn')}</span>}
      {player ? (
        <Seat
          player={player}
          turn={turn}
          passed={false}
          bubble={bubble}
          onClick={onTap}
          label={onTap ? `Throw an emoji at ${player.name}` : player.name}
          tag={tag}
          extra="pr-seat-inner"
          turnEndsAt={turn ? (turnEndsAt ?? null) : null}
          turnSec={turnSec}
        />
      ) : (
        <div className="seat pr-seat-inner gone">
          <span className="avatar pr-gone-av">👋</span>
          <span className="seat-name">{goneName ?? '?'}</span>
          {tag}
        </div>
      )}
      {children && <div className="pr-extra">{children}</div>}
    </div>
  );
}

/** two side rails of seat cards; each item says its corner */
export function Rails({ items }: { items: { id: string; corner: string; node: ReactNode }[] }) {
  const side = (s: 'l' | 'r') =>
    items
      .filter((x) => railOf(x.corner) === s)
      .sort((a, b) => railRank(a.corner) - railRank(b.corner))
      .map((x) => <div key={x.id} className="pr-slot">{x.node}</div>);
  return (
    <>
      <div className="pr-rail pr-left">{side('l')}</div>
      <div className="pr-rail pr-right">{side('r')}</div>
    </>
  );
}

/** a stacked bar of each player's share (boxes, cells), the rest left grey */
export function ShareBar({ parts, total, label }: { parts: { id: string; n: number; color: string }[]; total: number; label?: string }) {
  return (
    <div className="pr-share" role="img" aria-label={label ?? 'Share of the board'}>
      {parts.map((p) =>
        p.n > 0 ? <i key={p.id} style={{ flexGrow: p.n, background: p.color } as CSSProperties}><b>{p.n}</b></i> : null,
      )}
      {total - parts.reduce((a, p) => a + p.n, 0) > 0 && <i className="rest" style={{ flexGrow: total - parts.reduce((a, p) => a + p.n, 0) }} />}
    </div>
  );
}
