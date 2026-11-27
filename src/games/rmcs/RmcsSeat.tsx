// A Raja Mantri player at the table: the shared seat (avatar, name, chat, voice) plus their total and any role shown to all
import { Seat } from '../../components/Table';
import { cx } from '../../lib/cards';
import { RMCS_EMOJI, RMCS_NAMES, type PublicPlayer, type RmcsRole } from '../../types';
import type { ChatBubble } from '../../useBluff';

interface Props {
  spot: string;
  player: PublicPlayer | undefined;
  goneName?: string;
  score: number;
  /** a role everyone can see */
  role: RmcsRole | null;
  /** the Mantri while guessing: in the spotlight */
  mantri: boolean;
  mine: boolean;
  bubble: ChatBubble | null;
  scoreRef: (el: HTMLElement | null) => void;
  onTap?: () => void;
}

export function RmcsSeat({ spot, player, goneName, score, role, mantri, mine, bubble, scoreRef, onTap }: Props) {
  const tags = (
    <span className="lu-seat-tags">
      <span ref={scoreRef} key={score} className="lu-tag score bump" title="Score">
        ⭐ {score}
      </span>
      {role && (
        <span className={cx('lu-tag rm-role-tag', `r-${role}`)} title={RMCS_NAMES[role]}>
          {RMCS_EMOJI[role]} {RMCS_NAMES[role]}
        </span>
      )}
    </span>
  );
  return (
    <div className={cx('rm-seat lu-seat seat-stand', `at-${spot}`, mantri && 'turn rm-mantri', mine && 'mine')}>
      {player ? (
        <Seat player={player} turn={mantri} passed={false} bubble={bubble} onClick={onTap} label={onTap ? `Tap ${player.name}` : player.name} tag={tags} extra="lu-seat-inner" />
      ) : (
        <div className="seat lu-seat-inner gone">
          <span className="seat-name">{goneName ?? '?'}</span>
          {tags}
        </div>
      )}
    </div>
  );
}
