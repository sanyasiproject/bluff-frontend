import { useState } from 'react';
import { compactCoins } from '../lib/coins';
import { levelOf } from '../types';
import type { Auth } from '../useAuth';
import type { InviteAck } from '../useBluff';
import { useOnlineFriends } from '../lib/onlineFriends';
import { useDmUnread } from '../lib/dm';
import { AccountSheet } from './AccountSheet';
import { FriendsSheet } from './FriendsSheet';
import { ProfilePage } from './ProfilePage';
import { Avatar } from './Avatar';

type Sheet = 'login' | 'register' | 'profile' | 'friends';

interface Props {
  auth: Auth;
  /** shown on the home screen only */
  onOpenAdmin?: () => void;
  /** when in a room, friends can be invited to it */
  roomCode?: string;
  onInvite?: (userId: string) => Promise<InviteAck | null>;
  onJoin?: (userId: string, watch: boolean) => Promise<boolean>;
  /** the green online-friends count; off where the screen has its own Friends button (lobby) */
  showOnline?: boolean;
}

/** top-right corner: coins + avatar that opens the profile page, or a Log in button for guests */
export function AccountCorner({ auth, onOpenAdmin, roomCode, onInvite, onJoin, showOnline = true }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const friends = useOnlineFriends(auth.user && showOnline ? auth.token : null);
  const unread = useDmUnread(auth.user ? auth.token : null);
  const close = () => setSheet(null);
  if (!auth.accountsOn || auth.checking) return null;

  const user = auth.user;
  const onlineCount = friends ? friends.filter((f) => f.online).length : 0;
  return (
    <>
      {/* how many friends are online; one tap opens Friends */}
      {user && showOnline && onlineCount > 0 && (
        <button className="online-pill" aria-label={`${onlineCount} friends online`} onClick={() => setSheet('friends')}>
          <i className="live-dot on" aria-hidden />
          {onlineCount}
        </button>
      )}
      {/* unread private messages; one tap opens Friends, where each friend's 💬 shows theirs */}
      {user && unread.total > 0 && (
        <button className="online-pill dm-pill" aria-label={`${unread.total} unread messages`} onClick={() => setSheet('friends')}>
          💬 {unread.total}
        </button>
      )}
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
      {sheet === 'friends' && user && <FriendsSheet auth={auth} roomCode={roomCode} onInvite={onInvite} onJoin={onJoin} onClose={close} />}
      {sheet === 'profile' && user && (
        <ProfilePage auth={auth} onClose={close} onOpenAdmin={onOpenAdmin} roomCode={roomCode} onInvite={onInvite} onJoin={onJoin} />
      )}
    </>
  );
}
