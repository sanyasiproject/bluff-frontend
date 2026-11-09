import { useState } from 'react';
import { avatarColor } from '../lib/cards';
import { compactCoins } from '../lib/coins';
import { levelOf } from '../types';
import type { Auth } from '../useAuth';
import { AccountSheet } from './AccountSheet';
import { ProfilePage } from './ProfilePage';

type Sheet = 'login' | 'register' | 'profile';

interface Props {
  auth: Auth;
  /** shown on the home screen only */
  onOpenAdmin?: () => void;
  /** when in a room, friends can be invited to it */
  roomCode?: string;
  onInvite?: (userId: string) => Promise<boolean>;
}

/** top-right corner: coins + avatar that opens the profile page, or a Log in button for guests */
export function AccountCorner({ auth, onOpenAdmin, roomCode, onInvite }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const close = () => setSheet(null);
  if (!auth.accountsOn || auth.checking) return null;

  const user = auth.user;
  return (
    <>
      {user ? (
        <button className="account-btn" aria-label="My profile" onClick={() => setSheet('profile')}>
          <span className="coin-mini">🪙 {compactCoins(user.coins)}</span>
          <span className="avatar sm" style={{ background: avatarColor(user.displayName) }}>
            {user.displayName[0]?.toUpperCase()}
            <span className="seat-lv">{levelOf(user.stats)}</span>
          </span>
          {auth.friendRequests > 0 && (
            <span className="req-dot" aria-label={`${auth.friendRequests} friend requests`}>
              {auth.friendRequests}
            </span>
          )}
        </button>
      ) : (
        <button className="btn small primary login-pill" onClick={() => setSheet('login')}>
          Log in
        </button>
      )}

      {(sheet === 'login' || sheet === 'register') && <AccountSheet initial={sheet} auth={auth} onClose={close} />}
      {sheet === 'profile' && user && (
        <ProfilePage auth={auth} onClose={close} onOpenAdmin={onOpenAdmin} roomCode={roomCode} onInvite={onInvite} />
      )}
    </>
  );
}
