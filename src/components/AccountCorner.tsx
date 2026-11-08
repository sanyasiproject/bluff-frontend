import { useState } from 'react';
import { avatarColor } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { FIRST_GAME_BONUS, LOGIN_BONUS } from '../types';
import type { Auth } from '../useAuth';
import { AccountSheet } from './AccountSheet';
import { FriendsSheet } from './FriendsSheet';
import { Backdrop } from './Overlays';
import { ProfileSheet } from './ProfileSheet';

type Sheet = 'menu' | 'login' | 'register' | 'profile' | 'friends';

interface Props {
  auth: Auth;
  /** shown on the home screen only */
  onOpenAdmin?: () => void;
  /** when in a room, friends can be invited to it */
  roomCode?: string;
  onInvite?: (userId: string) => Promise<boolean>;
}

/** top-right corner: coins + avatar menu when logged in, a Log in button for guests */
export function AccountCorner({ auth, onOpenAdmin, roomCode, onInvite }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const close = () => setSheet(null);
  if (!auth.accountsOn || auth.checking) return null;

  const user = auth.user;
  return (
    <>
      {user ? (
        <button className="account-btn" aria-label="Account menu" onClick={() => setSheet('menu')}>
          <span className="coin-mini">🪙 {compactCoins(user.coins)}</span>
          <span className="avatar sm" style={{ background: avatarColor(user.displayName) }}>
            {user.displayName[0]?.toUpperCase()}
          </span>
        </button>
      ) : (
        <button className="btn small primary login-pill" onClick={() => setSheet('login')}>
          Log in
        </button>
      )}

      {sheet === 'menu' && user && (
        <Backdrop onClose={close}>
          <div className="menu-head">
            <span className="avatar" style={{ background: avatarColor(user.displayName) }}>
              {user.displayName[0]?.toUpperCase()}
            </span>
            <div className="grow">
              <b>{user.displayName}</b> {user.role === 'admin' && <span className="tag">Admin</span>}
              <p className="muted small">@{user.username}</p>
            </div>
          </div>
          <div className="balance-card">
            <span className="muted small">Your coins</span>
            <b>🪙 {formatCoins(user.coins)}</b>
          </div>
          <ul className="reward-list">
            <li>🎁 +{LOGIN_BONUS} every day you open the app</li>
            <li>🃏 +{FIRST_GAME_BONUS} for your first finished game each day, win or lose</li>
          </ul>
          <div className="menu-buttons">
            <button className="btn block" onClick={() => setSheet('profile')}>
              📊 My stats
            </button>
            <button className="btn block" onClick={() => setSheet('friends')}>
              👥 Friends
            </button>
            {user.role === 'admin' && onOpenAdmin && (
              <button
                className="btn block"
                onClick={() => {
                  close();
                  onOpenAdmin();
                }}
              >
                🛠 Admin
              </button>
            )}
            <button
              className="btn ghost block"
              onClick={() => {
                close();
                void auth.logout();
              }}
            >
              Log out
            </button>
          </div>
        </Backdrop>
      )}
      {(sheet === 'login' || sheet === 'register') && <AccountSheet initial={sheet} auth={auth} onClose={close} />}
      {sheet === 'profile' && <ProfileSheet auth={auth} onClose={close} />}
      {sheet === 'friends' && <FriendsSheet auth={auth} roomCode={roomCode} onInvite={onInvite} onClose={close} />}
    </>
  );
}
