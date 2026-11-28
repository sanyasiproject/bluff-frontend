// A Saanp Seedhi player beside the board: the shared seat (avatar, name, chat, voice, turn clock) plus their square and counts
import type { CSSProperties } from 'react';
import { Seat } from '../../components/tableParts';
import { cx } from '../../lib/cards';
import { LUDO_COLOR_HEX, type LudoColor, type PublicPlayer, type SnakesSeat as SeatData } from '../../types';
import type { ChatBubble } from '../../useBluff';
import { ColorMark, colorName, GOTI_HEX, MiniGoti } from '../turnkit/ColorMark';

interface Props {
  seat: SeatData;
  player: PublicPlayer | undefined;
  goneName?: string;
  corner: string;
  turn: boolean;
  mine: boolean;
  needSix: boolean;
  bubble: ChatBubble | null;
  turnEndsAt: number | null;
  turnSec?: number;
  onTap?: () => void;
  /** this player's goti style, for the colour chip */
  gotiStyle?: string;
}

export function SnakesSeatCorner({ seat, player, goneName, corner, turn, mine, needSix, bubble, turnEndsAt, turnSec, onTap, gotiStyle = 'classic' }: Props) {
  const col = LUDO_COLOR_HEX[seat.color as LudoColor];
  const style = { '--seat-ring': col, '--lu-col': col } as CSSProperties;
  const tags = (
    <span className="lu-seat-tags">
      <ColorMark color={GOTI_HEX[seat.color as LudoColor]} name={colorName(seat.color)} icon={<MiniGoti color={seat.color as LudoColor} style={gotiStyle} />} mine={mine} />
      <b key={seat.pos} className={cx('sn-big bump', seat.place && 'good', seat.pos === 0 && !seat.place && 'small')} title="Square">
        {seat.place ? '🏁 100' : seat.pos === 0 ? (needSix ? '🎲 needs 6' : 'Start') : seat.pos}
      </b>
      {seat.ladders > 0 && (
        <span key={`l${seat.ladders}`} className="lu-tag good bump" title="Ladders climbed">
          🪜 {seat.ladders}
        </span>
      )}
      {seat.snakes > 0 && (
        <span key={`s${seat.snakes}`} className="lu-tag kill bump" title="Snakes">
          🐍 {seat.snakes}
        </span>
      )}
    </span>
  );
  return (
    <div className={cx('lu-seat seat-stand sn-seat', corner, turn && 'turn', mine && 'mine')} style={style}>
      {turn && mine && <span className="sn-yourturn">Your turn!</span>}
      {player ? (
        <Seat
          player={player}
          turn={turn}
          passed={false}
          bubble={bubble}
          onClick={onTap}
          label={onTap ? `Throw an emoji at ${player.name}` : player.name}
          tag={tags}
          extra="lu-seat-inner"
          turnEndsAt={turnEndsAt}
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
