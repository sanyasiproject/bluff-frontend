import { useState } from 'react';
import { cx } from '../lib/cards';
import { presenceText } from '../lib/dates';
import { lastSeenFriend, onlineFirst, useOnlineFriends } from '../lib/onlineFriends';
import type { FriendView } from '../types';
import type { Auth } from '../useAuth';
import { Avatar } from './Avatar';
import { FriendsSheet } from './FriendsSheet';
import { Icon } from '../art/icons';

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

/** Home dock: 👥 Friends with the online count; opens the Friends sheet */
export function FriendsDockButton({ auth, onOpen }: { auth: Auth; onOpen: () => void }) {
  const all = useOnlineFriends(auth.user ? auth.token : null);
  const count = all ? all.filter((f) => f.online).length : 0;
  return (
    <button type="button" className="dock-item dock-friends" aria-label={count > 0 ? `Friends, ${count} online` : 'Friends'} onClick={onOpen}>
      <span className="dock-icon" aria-hidden>
        <Icon name="friends" size={26} />
      </span>
      <span className="dock-label">Friends</span>
      {count > 0 && <b className="dock-badge online">{count}</b>}
    </button>
  );
}

/** Home, beside the dock: up to 3 online friends' faces; one tap opens Friends */
export function OnlineAvatars({ auth, onOpen }: { auth: Auth; onOpen: () => void }) {
  const all = useOnlineFriends(auth.user ? auth.token : null);
  if (!auth.user || !all) return null;
  const online = onlineFirst(all);
  if (online.length === 0) return null;
  return (
    <button type="button" className="home-online" aria-label={`${online.length} friends online`} onClick={onOpen}>
      <span className="home-online-faces">
        {online.slice(0, 3).map((f) => (
          <Avatar key={f.id} name={f.displayName} avatar={f.avatar} size="sm">
            <i className="presence on" />
          </Avatar>
        ))}
      </span>
      <span className="home-online-text">
        <i className="live-dot on" aria-hidden /> {online.length} online
      </span>
    </button>
  );
}

/** Home, beside Play: who's online right now (up to 4, face, name and where they are); a tap opens Friends */
export function OnlineList({ auth, onOpen }: { auth: Auth; onOpen: () => void }) {
  const all = useOnlineFriends(auth.user ? auth.token : null);
  if (!auth.user || !all) return null;
  const online = onlineFirst(all);
  return (
    <aside className="home-online-list" aria-label="Friends online now">
      <h3>
        <i className="live-dot on" aria-hidden /> Online now <b>{online.length}</b>
      </h3>
      {online.length === 0 && <p className="muted">No friends online</p>}
      {online.slice(0, 4).map((f) => (
        <button key={f.id} type="button" className="home-online-row" onClick={onOpen}>
          <Avatar name={f.displayName} avatar={f.avatar} size="sm">
            <i className="presence on" />
          </Avatar>
          <span className="grow">
            <b data-no-translate>{f.displayName}</b>
            <small className={cx('online-where', f.inRoom === null && 'free')}>{status(f)}</small>
          </span>
        </button>
      ))}
      {online.length > 4 && (
        <button type="button" className="home-online-more" onClick={onOpen}>
          +{online.length - 4} more
        </button>
      )}
    </aside>
  );
}
