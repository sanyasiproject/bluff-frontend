import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { TURN_TIMER, WIN_STREAK_SHOWN, type PublicPlayer, type RoomView } from '../types';

/** when this turn's clock runs out, on this phone's clock; null when the turn timer is off */
export function useTurnEndsAt(view: RoomView): number | null {
  // each view carries the time left when the server sent it
  return useMemo(() => (typeof view.turnMsLeft === 'number' ? Date.now() + view.turnMsLeft : null), [view]);
}

/** seconds left on the turn, counting down; red for the last 5 */
export function TurnCountdown({ endsAt, away, sec, className }: { endsAt: number; away?: boolean; sec?: number; className?: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  const total = (away ? TURN_TIMER.awaySec : (sec ?? TURN_TIMER.turnSec)) * 1000;
  const ms = Math.max(0, endsAt - now);
  const left = Math.ceil(ms / 1000);
  return (
    <span
      className={cx('turn-clock', left <= 5 && 'low', className)}
      style={{ '--p': Math.min(1, ms / total) } as CSSProperties}
      role="timer"
      aria-label={`${left} seconds left`}
    >
      ⏰ {left}
    </span>
  );
}

/** wins in a row, from WIN_STREAK_SHOWN on; pulses so everyone notices */
export function StreakMark({ player, className }: { player: Pick<PublicPlayer, 'streak'> | undefined; className?: string }) {
  const n = player?.streak ?? 0;
  if (n < WIN_STREAK_SHOWN) return null;
  return (
    <span className={cx('streak-mark', className)} title={`${n} wins in a row`} aria-label={`${n} wins in a row`}>
      🔥<b>{n}</b>
    </span>
  );
}
