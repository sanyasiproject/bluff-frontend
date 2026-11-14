import { useState } from 'react';
import { compactCoins } from '../lib/coins';
import { levelOf } from '../types';
import type { Auth } from '../useAuth';
import type { InviteAck } from '../useBluff';
import { AccountSheet } from './AccountSheet';
import { ProfilePage } from './ProfilePage';
import { Avatar } from './Avatar';

type Sheet = 'login' | 'register' | 'profile';

interface Props {
  auth: Auth;
  /** shown on the home screen only */
  onOpenAdmin?: () => void;
  /** when in a room, friends can be invited to it */
  roomCode?: string;
  onInvite?: (userId: string) => Promise<InviteAck | null>;
  onJoin?: (userId: string, watch: boolean) => Promise<boolean>;
}

/** top-right corner: coins + avatar that opens the profile page, or a Log in button for guests */
export function AccountCorner({ auth, onOpenAdmin, roomCode, onInvite, onJoin }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const close = () => setSheet(null);
  if (!auth.accountsOn || auth.checking) return null;

  const user = auth.user;
  return (
    <>
      {user ? (
        <button className="account-btn" aria-label="My profile" onClick={() => setSheet('profile')}>
          <span className="coin-mini">🪙 {compactCoins(user.coins)}</span>
          <Avatar name={user.displayName} avatar={user.avatar} size="sm">
            <span className="seat-lv">{levelOf(user.stats)}</span>
          </Avatar>
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
        <ProfilePage auth={auth} onClose={close} onOpenAdmin={onOpenAdmin} roomCode={roomCode} onInvite={onInvite} onJoin={onJoin} />
      )}
    </>
  );
}
