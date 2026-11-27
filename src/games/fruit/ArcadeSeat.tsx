// A player at an arcade table (Fruit Slice Duel, Spike Attack): the shared seat (avatar, name, chat, voice) in their party colour plus the game's tags
import type { CSSProperties, ReactNode } from 'react';
import { Seat } from '../../components/Table';
import { cx } from '../../lib/cards';
import type { PublicPlayer } from '../../types';
import type { ChatBubble } from '../../useBluff';

interface Props {
  player: PublicPlayer | undefined;
  goneName?: string;
  color: string;
  mine: boolean;
  /** leading: glows like a turn */
  lead?: boolean;
  out?: boolean;
  bubble: ChatBubble | null;
  tags: ReactNode;
  seatRef?: (el: HTMLElement | null) => void;
  onTap?: () => void;
}

export function ArcadeSeat({ player, goneName, color, mine, lead, out, bubble, tags, seatRef, onTap }: Props) {
  const style = { '--seat-ring': color, '--lu-col': color } as CSSProperties;
  const tagRow = <span className="lu-seat-tags">{tags}</span>;
  return (
    <div ref={seatRef} className={cx('ar-seat lu-seat seat-stand', lead && 'turn', mine && 'mine', out && 'ar-out')} style={style}>
      {player ? (
        <Seat player={player} turn={!!lead} passed={false} bubble={bubble} onClick={onTap} label={onTap ? `Throw an emoji at ${player.name}` : player.name} tag={tagRow} extra="lu-seat-inner" />
      ) : (
        <div className="seat lu-seat-inner gone">
          <span className="seat-name">{goneName ?? '?'}</span>
          {tagRow}
        </div>
      )}
    </div>
  );
}

/** players in seat order (the game's own keys first, then the room), with their party colour */
export function seatOrder(keys: string[], players: { id: string }[]): string[] {
  return keys.length ? keys : players.map((p) => p.id);
}
