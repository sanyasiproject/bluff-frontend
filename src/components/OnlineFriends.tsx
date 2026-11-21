import { useState } from 'react';
import { cx } from '../lib/cards';
import { presenceText } from '../lib/dates';
import { lastSeenFriend, onlineFirst, useOnlineFriends } from '../lib/onlineFriends';
import type { FriendView } from '../types';
import type { Auth } from '../useAuth';
import { Avatar } from './Avatar';
import { FriendsSheet } from './FriendsSheet';

interface Props {
  auth: Auth;
  /** join or watch a friend's room; true once in, or once the host has the request */
  onJoin: (userId: string, watch: boolean) => Promise<boolean>;
}

/** what a friend is doing, in two words */
const status = (f: FriendView) => (f.inRoom === null ? 'free' : f.roomPhase === 'playing' ? 'in a game' : 'in a lobby');

/** Home: who of my friends is online right now; tap one to open Friends, ask to join a lobby in one tap (they say yes or no) */
export function OnlineFriends({ auth, onJoin }: Props) {
  const all = useOnlineFriends(auth.user ? auth.token : null);
  const [open, setOpen] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // guests, before the first read, and players with no friends yet see nothing
  if (!auth.user || !all || all.length === 0) return null;
  const online = onlineFirst(all);
  const seen = online.length === 0 ? lastSeenFriend(all) : null;

  const join = async (f: FriendView) => {
    setJoining(f.id);
    await onJoin(f.id, false);
    setJoining(null);
  };

  return (
    <section className="panel online-friends">
      <button type="button" className="online-head" onClick={() => setOpen(true)}>
        <span className="label">
          <i className={cx('live-dot', online.length > 0 && 'on')} aria-hidden /> Online now
          {online.length > 0 && <b className="online-count">{online.length}</b>}
        </span>
        <span className="muted small">All friends ›</span>
      </button>

      {online.length === 0 ? (
        <p className="muted small online-empty">
          No friends online{seen ? ` · ${seen.displayName} ${presenceText(false, seen.lastSeen, true)}` : ''}
        </p>
      ) : (
        <ul className="online-strip">
          {online.map((f) => (
            <li key={f.id}>
              <button type="button" className="online-chip" aria-label={`${f.displayName}, ${status(f)}`} onClick={() => setOpen(true)}>
                <Avatar name={f.displayName} avatar={f.avatar} size="sm">
                  <i className="presence on" />
                </Avatar>
                <b data-no-translate>{f.displayName}</b>
                <span className={cx('online-where', f.inRoom === null && 'free')}>{status(f)}</span>
              </button>
              {/* a friend in a lobby: ask to join in one tap; a game in progress goes through Friends */}
              {f.inRoom === 'other' && f.roomPhase !== 'playing' && (
                <button className="btn small primary online-join" disabled={joining !== null} onClick={() => void join(f)}>
                  {joining === f.id ? '…' : 'Ask'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && <FriendsSheet auth={auth} onJoin={onJoin} onClose={() => setOpen(false)} />}
    </section>
  );
}
