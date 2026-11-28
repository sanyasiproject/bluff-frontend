// A Ludo player at their base corner: the shared seat (avatar, name, chat, voice, turn clock) plus Ludo counts
import type { CSSProperties } from 'react';
import { Seat } from '../../components/tableParts';
import { cx } from '../../lib/cards';
import { LUDO_COLOR_HEX, LUDO_TOKENS, type LudoSeat as SeatData, type LudoView, type PublicPlayer } from '../../types';
import type { ChatBubble } from '../../useBluff';
import { ColorMark, colorName, GOTI_HEX, MiniGoti } from '../turnkit/ColorMark';

interface Props {
  seat: SeatData;
  player: PublicPlayer | undefined;
  /** gone (left mid-game): only the name stays */
  goneName?: string;
  lv: LudoView;
  corner: string;
  turn: boolean;
  mine: boolean;
  team: 'a' | 'b' | null;
  partner: boolean;
  bubble: ChatBubble | null;
  turnEndsAt: number | null;
  turnSec?: number;
  onTap?: () => void;
  seatRef?: (el: HTMLElement | null) => void;
  /** this player's goti style, for the colour chip */
  gotiStyle?: string;
}

export function LudoSeatCorner({ seat, player, goneName, lv, corner, turn, mine, team, partner, bubble, turnEndsAt, turnSec, onTap, seatRef, gotiStyle = 'classic' }: Props) {
  const style = { '--seat-ring': LUDO_COLOR_HEX[seat.color], '--lu-col': LUDO_COLOR_HEX[seat.color] } as CSSProperties;
  const tags = (
    <span className="lu-seat-tags">
      <ColorMark color={GOTI_HEX[seat.color]} name={colorName(seat.color)} icon={<MiniGoti color={seat.color} style={gotiStyle} />} mine={mine} />
      <span className={cx('lu-tag', seat.home > 0 && 'good')} title="Gotis home">
        🏠 {seat.home}/{LUDO_TOKENS}
      </span>
      {lv.mode === 'timed' && (
        <span key={seat.score} className="lu-tag score bump" title="Points">
          ⭐ {seat.score}
        </span>
      )}
      {lv.mode === 'master' && !seat.unlocked && (
        <span className="lu-tag lock" title="No way home before the first kill">
          🔒
        </span>
      )}
      {seat.kills > 0 && (
        <span key={seat.kills} className="lu-tag kill bump" title="Kills">
          ⚔️ {seat.kills}
        </span>
      )}
    </span>
  );
  return (
    <div className={cx('lu-seat seat-stand', corner, turn && 'turn', mine && 'mine')} style={style}>
      {player ? (
        <Seat
          player={player}
          turn={turn}
          passed={false}
          team={team}
          partner={partner}
          bubble={bubble}
          onClick={onTap}
          label={onTap ? `Throw an emoji at ${player.name}` : player.name}
          tag={tags}
          extra="lu-seat-inner"
          turnEndsAt={turnEndsAt}
          turnSec={turnSec}
          seatRef={seatRef}
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
