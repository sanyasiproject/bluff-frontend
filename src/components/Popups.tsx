import { FIRST_GAME_BONUS } from '../types';
import type { Invite } from '../useBluff';
import { Backdrop } from './Overlays';

/** 🎁 shown once when the daily login bonus lands */
export function BonusPopup({ amount, onClose }: { amount: number; onClose: () => void }) {
  return (
    <Backdrop center onClose={onClose}>
      <div className="reveal popup">
        <span className="popup-emoji">🎁</span>
        <h3 className="reveal-title">+{amount} coins</h3>
        <p>Daily login bonus. Come back tomorrow for more!</p>
        <p className="muted small">Finish your first game today for another +{FIRST_GAME_BONUS}, win or lose.</p>
        <button className="btn primary block" onClick={onClose}>
          Nice!
        </button>
      </div>
    </Backdrop>
  );
}

/** a friend invited you; Join leaves your current lobby and goes to theirs */
export function InvitePopup({ invite, inGame, onJoin, onIgnore }: { invite: Invite; inGame: boolean; onJoin: () => void; onIgnore: () => void }) {
  return (
    <Backdrop center onClose={onIgnore}>
      <div className="reveal popup">
        <span className="popup-emoji">🃏</span>
        <h3 className="reveal-title">{invite.fromName} invited you</h3>
        <p>
          Join room <b className="gold-text">{invite.code}</b> and play together.
        </p>
        {inGame && <p className="muted small">You're in a game right now. Finish it first, then join.</p>}
        <button className="btn primary block" disabled={inGame} onClick={onJoin}>
          Join room {invite.code}
        </button>
        <button className="btn ghost block" onClick={onIgnore}>
          Not now
        </button>
      </div>
    </Backdrop>
  );
}
