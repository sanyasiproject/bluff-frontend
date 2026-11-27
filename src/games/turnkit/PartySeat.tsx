// A party-game player beside the board: the shared seat (avatar, name, chat, voice, turn clock) in their colour, plus tags
import type { CSSProperties, ReactNode } from 'react';
import { Seat } from '../../components/Table';
import { cx } from '../../lib/cards';
import type { PublicPlayer } from '../../types';
import type { ChatBubble } from '../../useBluff';

interface Props {
  player: PublicPlayer | undefined;
  goneName?: string;
  corner: string;
  color: string;
  turn: boolean;
  mine: boolean;
  out?: boolean;
  bubble: ChatBubble | null;
  turnEndsAt?: number | null;
  turnSec?: number;
  tags: ReactNode;
  onTap?: () => void;
}

export function PartySeat({ player, goneName, corner, color, turn, mine, out, bubble, turnEndsAt, turnSec, tags, onTap }: Props) {
  const style = { '--seat-ring': color, '--lu-col': color } as CSSProperties;
  const tagRow = <span className="lu-seat-tags">{tags}</span>;
  return (
    <div className={cx('lu-seat seat-stand pt-seat', corner, turn && 'turn', mine && 'mine', out && 'pt-out')} style={style}>
      {player ? (
        <Seat
          player={player}
          turn={turn}
          passed={false}
          bubble={bubble}
          onClick={onTap}
          label={onTap ? `Throw an emoji at ${player.name}` : player.name}
          tag={tagRow}
          extra="lu-seat-inner"
          turnEndsAt={turn ? (turnEndsAt ?? null) : null}
          turnSec={turnSec}
        />
      ) : (
        <div className="seat lu-seat-inner gone">
          <span className="seat-name">{goneName ?? '?'}</span>
          <span className="lu-tag">left</span>
        </div>
      )}
    </div>
  );
}
