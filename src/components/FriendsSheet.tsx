import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { presenceText } from '../lib/dates';
import type { FriendsResponse, FriendView, PlayerSearchResult } from '../types';
import type { Auth } from '../useAuth';
import type { InviteAck } from '../useBluff';
import { useDmUnread } from '../lib/dm';
import { ConfirmBox } from './ConfirmBox';
import { DmPage } from './DmPage';
import { LevelBadge } from './LevelBadge';
import { Backdrop } from './Overlays';
import { PlayerSheet } from './PlayerSheet';
import { Avatar } from './Avatar';

interface Props {
  auth: Auth;
  roomCode?: string;
  onInvite?: (userId: string) => Promise<InviteAck | null>;
  /** join or watch a friend's room; true once in, or once the host has the request */
  onJoin?: (userId: string, watch: boolean) => Promise<boolean>;
  onClose: () => void;
}

/** a friend, request or search result; only friends know whether they're in a room */
type Person = Omit<FriendView, 'inRoom' | 'online' | 'roomPhase'> & Partial<Pick<FriendView, 'inRoom' | 'roomPhase'>> & { online: boolean | null };

const where = (p: Person) =>
  p.inRoom === 'here' ? ' · in this room' : p.inRoom === 'other' ? (p.roomPhase === 'playing' ? ' · in a game' : ' · in a lobby') : '';

/** after asking to watch, the server wants a short wait before asking again */
const ASK_AGAIN_MS = 10_000;

/** find players by name and add them, accept requests, and invite online friends into your room */
export function FriendsSheet({ auth, roomCode, onInvite, onJoin, onClose }: Props) {
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [query, setQuery] = useState('');
  /** the friend whose ⋯ menu is open */
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // Escape closes the ⋯ menu
  useEffect(() => {
    if (!menuFor) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenuFor(null);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuFor]);
  /** null while there is nothing to search or a search is running */
  const [found, setFound] = useState<PlayerSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  /** friends whose game I just asked to watch */
  const [asked, setAsked] = useState<Set<string>>(new Set());
  /** a profile opened from this list */
  const [viewing, setViewing] = useState<Person | null>(null);
  /** a friend about to be removed, waiting for a yes */
  const [unfriend, setUnfriend] = useState<FriendView | null>(null);
  /** a friend whose private chat is open */
  const [chatWith, setChatWith] = useState<FriendView | null>(null);
  const unread = useDmUnread(auth.token);

  const load = useCallback(async () => {
    try {
      const res = await api<FriendsResponse>('/friends', { token: auth.token });
      setData(res);
      auth.setFriendRequests(res.incoming.length);
    } catch (err) {
      setError(errorText(err));
    }
  }, [auth.token]);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setFound(null);
        return;
      }
      setSearching(true);
      try {
        const res = await api<{ players: PlayerSearchResult[] }>(`/friends/search?q=${encodeURIComponent(q.trim())}`, {
          token: auth.token,
        });
        setFound(res.players);
      } catch (err) {
        setError(errorText(err));
      } finally {
        setSearching(false);
      }
    },
    [auth.token],
  );

  // search as they type, after a short pause
  useEffect(() => {
    const t = setTimeout(() => void search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  // keep online dots fresh while the sheet is open
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10_000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await fn();
      if (done) setNote(done);
      await Promise.all([load(), search(query)]);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const add = (p: PlayerSearchResult) =>
    void act(async () => {
      const res = await api<{ result: 'sent' | 'accepted' }>('/friends/request', { body: { username: p.username }, token: auth.token });
      setNote(res.result === 'accepted' ? `You and ${p.displayName} are now friends 🎉` : `Request sent to ${p.displayName}`);
    });

  const accept = (f: Person) =>
    void act(() => api(`/friends/${f.id}/accept`, { method: 'POST', token: auth.token }), `You and ${f.displayName} are now friends 🎉`);

  /** what you can do with a player found by search */
  const foundAction = (p: PlayerSearchResult) => {
    if (p.status === 'friend') return <span className="tag dim">👥 Friend</span>;
    if (p.status === 'sent') return <span className="tag dim">Requested</span>;
    if (p.status === 'incoming') {
      return (
        <button className="btn small primary" disabled={busy} onClick={() => accept(p)}>
          Accept
        </button>
      );
    }
    return (
      <button className="btn small primary" disabled={busy} onClick={() => add(p)}>
        + Add
      </button>
    );
  };

  const invite = async (f: FriendView) => {
    if (!onInvite) return;
    const res = await onInvite(f.id);
    if (!res) return;
    setInvited((prev) => new Set(prev).add(f.id));
    setNote(res.pushed ? `${f.displayName} is offline, so we sent a notification to their phone` : `Invite sent to ${f.displayName}. They'll see a Join button.`);
  };

  const join = async (f: FriendView, watch: boolean) => {
    if (!onJoin) return;
    setError('');
    setNote('');
    if (!(await onJoin(f.id, watch))) return;
    // never straight in: they get a card and say yes or no
    setNote(`Asked ${f.displayName} to let you ${watch ? 'watch' : 'join'}. You'll get in when they say yes.`);
    setAsked((prev) => new Set(prev).add(f.id));
    setTimeout(() => setAsked((prev) => new Set([...prev].filter((id) => id !== f.id))), ASK_AGAIN_MS);
  };

  /** they're online in another room we may ask to get into */
  const canAsk = (f: FriendView) => !!onJoin && f.online && f.inRoom === 'other';

  /** the one thing to do with a friend right now: ask to join (or watch, once their game is on), invite, or where they are */
  const mainAction = (f: FriendView) => {
    if (canAsk(f)) {
      const watch = f.roomPhase === 'playing';
      return (
        <button className={cx('btn small', !watch && 'primary')} disabled={asked.has(f.id)} onClick={() => void join(f, watch)}>
          {asked.has(f.id) ? 'Asked ✓' : watch ? '👀 Watch' : 'Join'}
        </button>
      );
    }
    if (roomCode && onInvite && f.inRoom === 'here') return <span className="tag dim">Here</span>;
    if (roomCode && onInvite && f.inRoom === 'other') return <span className="tag dim">In a room</span>;
    if (roomCode && onInvite && !f.inRoom) {
      // offline friends can still be invited when invite notifications are on
      return (
        <button className="btn small primary" disabled={(!f.online && auth.pushInvites !== true) || invited.has(f.id)} onClick={() => void invite(f)}>
          {invited.has(f.id) ? 'Invited ✓' : f.online ? 'Invite' : '🔔 Invite'}
        </button>
      );
    }
    return null;
  };

  /** the rest, behind ⋯: watch instead of join, the profile, and removing them */
  const moreMenu = (f: FriendView) => (
    <>
      <button
        type="button"
        className="icon-btn friend-more"
        aria-label={`More for ${f.displayName}`}
        aria-haspopup="menu"
        aria-expanded={menuFor === f.id}
        onClick={() => setMenuFor(menuFor === f.id ? null : f.id)}
      >
        ⋯
      </button>
      {menuFor === f.id && (
        <>
          {/* a tap anywhere else closes it */}
          <div className="friend-menu-catch" onClick={() => setMenuFor(null)} />
          <div className="friend-menu" role="menu">
            {canAsk(f) && f.roomPhase !== 'playing' && !asked.has(f.id) && (
              <button
                role="menuitem"
                onClick={() => {
                  setMenuFor(null);
                  void join(f, true);
                }}
              >
                👀 Ask to watch
              </button>
            )}
            <button
              role="menuitem"
              onClick={() => {
                setMenuFor(null);
                setViewing(f);
              }}
            >
              👤 View profile
            </button>
            <button
              role="menuitem"
              className="danger"
              disabled={busy}
              onClick={() => {
                setMenuFor(null);
                setUnfriend(f);
              }}
            >
              Remove friend
            </button>
          </div>
        </>
      )}
    </>
  );

  const person = (f: Person, actions: React.ReactNode, showOnline = true) => (
    <li key={f.id} className="friend-row">
      <button type="button" className="row-open" aria-label={`${f.displayName}'s profile`} onClick={() => setViewing(f)}>
        <Avatar name={f.displayName} avatar={f.avatar} size="sm">
          {showOnline && f.online !== null && <i className={cx('presence', f.online && 'on')} />}
        </Avatar>
        <div className="grow">
          {/* name and level on one line; a long name ends in … */}
          <span className="friend-name">
            <b data-no-translate>{f.displayName}</b> <LevelBadge level={f.level} />
          </span>
          <p className="muted small">@{f.username}</p>
          {/* its own line, so it never breaks mid-phrase beside the Invite button */}
          {showOnline && (f.online !== null || where(f)) && (
            <p className={cx('muted small friend-seen', f.online && 'on')}>
              {f.online !== null ? presenceText(f.online, f.lastSeen, true) : ''}
              {f.online !== null ? where(f) : where(f).replace(/^ · /, '')}
            </p>
          )}
        </div>
      </button>
      {actions}
    </li>
  );

  // online friends at the top; otherwise the server's order (stable sort)
  const friendsOnlineFirst = data ? [...data.friends].sort((a, b) => Number(b.online) - Number(a.online)) : [];
  const onlineCount = friendsOnlineFirst.filter((f) => f.online).length;

  return (
    <Backdrop onClose={onClose}>
      <h3>Friends</h3>
      <input
        className="input"
        type="search"
        placeholder="🔍 Search by username or name"
        aria-label="Search players"
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        maxLength={20}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim().length === 1 && <p className="muted small">Type at least 2 letters</p>}
      {query.trim().length >= 2 && found === null && searching && <p className="muted small">Searching…</p>}
      {query.trim().length >= 2 && found?.length === 0 && (
        <p className="search-empty">No player found for “{query.trim()}”. Check the username and try again.</p>
      )}
      {found && found.length > 0 && (
        <ul className="friend-list search-results">{found.map((p) => person(p, foundAction(p)))}</ul>
      )}
      {note && <p className="form-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      {data && data.incoming.length > 0 && (
        <>
          <p className="label">
            Friend requests <span className="req-pill">{data.incoming.length}</span>
          </p>
          <ul className="friend-list">
            {data.incoming.map((f) =>
              person(
                f,
                <div className="row-actions">
                  <button className="btn small primary" disabled={busy} onClick={() => accept(f)}>
                    Accept
                  </button>
                  <button className="btn small ghost" disabled={busy} onClick={() => void act(() => api(`/friends/${f.id}/remove`, { method: 'POST', token: auth.token }))}>
                    Decline
                  </button>
                </div>,
                false,
              ),
            )}
          </ul>
        </>
      )}

      <p className="label">
        Your friends {data ? `(${data.friends.length})` : ''}
        {onlineCount > 0 && <span className="online-note"> · 🟢 {onlineCount} online</span>}
      </p>
      {roomCode && (
        <p className="muted small">
          Friends who aren't in a room get a popup to join room {roomCode}
          {auth.pushInvites ? ', or a phone notification if they are offline and turned them on.' : '.'}
        </p>
      )}
      {data === null && <p className="muted small">Loading…</p>}
      {data?.friends.length === 0 && <p className="muted small">No friends yet. Search for someone above and tap + Add.</p>}
      {data && data.friends.length > 0 && (
        <ul className="friend-list">
          {friendsOnlineFirst.map((f) =>
            person(
              f,
              // one line: 💬, the one main action, and ⋯ for the rest
              <div className="row-actions friend-acts">
                <button className="btn small dm-btn" aria-label={`Message ${f.displayName}`} onClick={() => setChatWith(f)}>
                  💬
                  {(unread.byFriend[f.id] ?? 0) > 0 && <span className="req-dot">{unread.byFriend[f.id]}</span>}
                </button>
                {mainAction(f)}
                {moreMenu(f)}
              </div>,
            ),
          )}
        </ul>
      )}

      {data && data.outgoing.length > 0 && (
        <>
          <p className="label">Requests you sent</p>
          <ul className="friend-list">
            {data.outgoing.map((f) =>
              person(
                f,
                <button className="link-btn" disabled={busy} onClick={() => void act(() => api(`/friends/${f.id}/remove`, { method: 'POST', token: auth.token }))}>
                  Cancel
                </button>,
                false,
              ),
            )}
          </ul>
        </>
      )}

      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>

      {unfriend && (
        <ConfirmBox
          title={`Remove ${unfriend.displayName} from your friends?`}
          body="You can add each other again later."
          action="Remove"
          onCancel={() => setUnfriend(null)}
          onConfirm={() => {
            const f = unfriend;
            setUnfriend(null);
            void act(() => api(`/friends/${f.id}/remove`, { method: 'POST', token: auth.token }));
          }}
        />
      )}
      {chatWith && <DmPage auth={auth} friend={chatWith} onClose={() => setChatWith(null)} />}
      {viewing && (
        <PlayerSheet
          auth={auth}
          name={viewing.displayName}
          username={viewing.username}
          level={viewing.level}
          avatar={viewing.avatar}
          onClose={() => {
            setViewing(null);
            // they may have added or accepted from the profile
            void Promise.all([load(), search(query)]);
          }}
        />
      )}
    </Backdrop>
  );
}
