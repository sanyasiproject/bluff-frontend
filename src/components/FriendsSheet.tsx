import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorText } from '../lib/api';
import { avatarColor, cx } from '../lib/cards';
import type { FriendsResponse, FriendView } from '../types';
import type { Auth } from '../useAuth';
import { Backdrop } from './Overlays';

interface Props {
  auth: Auth;
  roomCode?: string;
  onInvite?: (userId: string) => Promise<boolean>;
  onClose: () => void;
}

/** add friends by username, accept requests, and invite online friends into your room */
export function FriendsSheet({ auth, roomCode, onInvite, onClose }: Props) {
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setData(await api<FriendsResponse>('/friends', { token: auth.token }));
    } catch (err) {
      setError(errorText(err));
    }
  }, [auth.token]);

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
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const name = username.trim().toLowerCase();
    if (!name) return;
    void act(async () => {
      const res = await api<{ result: 'sent' | 'accepted' }>('/friends/request', { body: { username: name }, token: auth.token });
      setUsername('');
      setNote(res.result === 'accepted' ? `You and @${name} are now friends 🎉` : `Request sent to @${name}`);
    });
  };

  const invite = async (f: FriendView) => {
    if (!onInvite) return;
    if (await onInvite(f.id)) {
      setInvited((prev) => new Set(prev).add(f.id));
      setNote(`Invite sent to ${f.displayName}. They'll see a Join button.`);
    }
  };

  const person = (f: FriendView, actions: React.ReactNode, showOnline = true) => (
    <li key={f.id} className="friend-row">
      <span className="avatar sm" style={{ background: avatarColor(f.displayName) }}>
        {f.displayName[0]?.toUpperCase()}
        {showOnline && <i className={cx('presence', f.online && 'on')} />}
      </span>
      <div className="grow">
        <b>{f.displayName}</b>
        <p className="muted small">
          @{f.username}
          {showOnline && (f.online ? ' · online' : ' · offline')}
        </p>
      </div>
      {actions}
    </li>
  );

  return (
    <Backdrop onClose={onClose}>
      <h3>Friends</h3>
      <form className="add-friend" onSubmit={add}>
        <input
          className="input"
          placeholder="Friend's username"
          aria-label="Friend's username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button className="btn primary" disabled={busy || !username.trim()}>
          Add
        </button>
      </form>
      {note && <p className="form-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      {data && data.incoming.length > 0 && (
        <>
          <p className="label">Friend requests</p>
          <ul className="friend-list">
            {data.incoming.map((f) =>
              person(
                f,
                <div className="row-actions">
                  <button className="btn small primary" disabled={busy} onClick={() => void act(() => api(`/friends/${f.id}/accept`, { method: 'POST', token: auth.token }), `You and ${f.displayName} are now friends 🎉`)}>
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

      <p className="label">Your friends {data ? `(${data.friends.length})` : ''}</p>
      {roomCode && <p className="muted small">Online friends get a popup with a Join button for room {roomCode}.</p>}
      {data === null && <p className="muted small">Loading…</p>}
      {data?.friends.length === 0 && <p className="muted small">No friends yet. Add someone by their username above.</p>}
      {data && data.friends.length > 0 && (
        <ul className="friend-list">
          {data.friends.map((f) =>
            person(
              f,
              <div className="row-actions">
                {roomCode && onInvite && (
                  <button className="btn small primary" disabled={!f.online || invited.has(f.id)} onClick={() => void invite(f)}>
                    {invited.has(f.id) ? 'Invited ✓' : 'Invite'}
                  </button>
                )}
                <button
                  className="link-btn danger-link"
                  disabled={busy}
                  onClick={() => window.confirm(`Remove ${f.displayName} from your friends?`) && void act(() => api(`/friends/${f.id}/remove`, { method: 'POST', token: auth.token }))}
                >
                  Remove
                </button>
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
    </Backdrop>
  );
}
