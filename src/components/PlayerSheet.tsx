import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { monthYear } from '../lib/dates';
import { achievementsOf, percent, titleOf } from '../lib/progress';
import type { PublicProfile } from '../types';
import type { Auth } from '../useAuth';
import { LevelBadge } from './LevelBadge';
import { Backdrop } from './Overlays';
import { GiftRow, ThrowRow } from './PlayerActions';
import { Avatar } from './Avatar';

const pct = (n: number | null) => (n === null ? '–' : `${n}%`);

interface Props {
  auth: Auth;
  name: string;
  /** null for guests, who have no profile */
  username: string | null;
  level?: number | null;
  /** their avatar as known already (room or friends list), until the profile loads */
  avatar?: string | null;
  /** host tools for this player (lobby only), shown under the card */
  children?: ReactNode;
  /** in a room: their member id, so gifts fly across the room */
  memberId?: string;
  /** in a room, someone else: throw an emoji at them */
  onThrow?: (index: number) => void;
  onClose: () => void;
}

/** someone's public card: name, level, record and badges, plus a friend button; nothing private */
export function PlayerSheet({ auth, name, username, level, avatar = null, children, memberId, onThrow, onClose }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canLoad = !!auth.user && !!username;

  const load = useCallback(async () => {
    if (!canLoad) return;
    try {
      setProfile((await api<{ profile: PublicProfile }>(`/players/${username}`, { token: auth.token })).profile);
    } catch (err) {
      setError(errorText(err));
    }
  }, [canLoad, username, auth.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const p = profile;
  const shownLevel = p?.level ?? level ?? null;
  const title = shownLevel ? titleOf(shownLevel) : null;
  const badges = p ? achievementsOf(p.stats, 0).filter((b) => !b.private && b.value >= b.goal) : [];

  let friend: ReactNode = null;
  if (p?.status === 'none') {
    friend = (
      <button
        className="btn primary block"
        disabled={busy}
        onClick={() => void act(() => api('/friends/request', { body: { username: p.username }, token: auth.token }))}
      >
        + Add friend
      </button>
    );
  } else if (p?.status === 'incoming') {
    friend = (
      <button
        className="btn primary block"
        disabled={busy}
        onClick={() => void act(() => api(`/friends/${p.id}/accept`, { method: 'POST', token: auth.token }))}
      >
        Accept friend request
      </button>
    );
  } else if (p?.status === 'sent') {
    friend = <p className="player-note">Friend request sent</p>;
  } else if (p?.status === 'friend') {
    friend = <p className="player-note">👥 You're friends</p>;
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="player-card">
        <Avatar name={p?.displayName ?? name} avatar={p ? p.avatar : avatar} size="lg">
          {p && p.online !== null && <i className={cx('presence', p.online && 'on')} />}
        </Avatar>
        <h3>
          {p?.displayName ?? name} <LevelBadge level={shownLevel} />
        </h3>
        {p && (
          <p className="muted small">
            @{p.username}
            {p.online !== null && (p.online ? ' · online' : ' · offline')} · joined {monthYear(p.joinedAt)}
          </p>
        )}
        {title && (
          <p className="level-title">
            {title.emoji} {title.title}
          </p>
        )}
        {!username && <p className="muted small">Guest player · no account, so no profile</p>}
        {username && !auth.user && <p className="muted small">Log in to see player profiles</p>}
      </div>

      {p && (
        <>
          <div className="record-numbers player-stats">
            <div>
              <b>{p.stats.gamesPlayed}</b>
              <span>games</span>
            </div>
            <div>
              <b>{p.stats.wins}</b>
              <span>wins</span>
            </div>
            <div>
              <b>{pct(percent(p.stats.wins, p.stats.gamesPlayed))}</b>
              <span>win rate</span>
            </div>
            <div>
              <b>{pct(percent(p.stats.goodCalls, p.stats.goodCalls + p.stats.wrongCalls))}</b>
              <span>right bluff calls</span>
            </div>
          </div>
          {badges.length > 0 && (
            <p className="player-badges" aria-label="Achievements">
              {badges.map((b) => (
                <span key={b.title} title={b.title}>
                  {b.emoji} {b.title}
                </span>
              ))}
            </p>
          )}
          {friend}
        </>
      )}
      {onThrow && (
        <ThrowRow
          onThrow={(i) => {
            onThrow(i);
            // close so the flight is visible
            onClose();
          }}
        />
      )}
      {p?.status === 'friend' && (
        <GiftRow auth={auth} name={p.displayName} target={memberId ? { memberId } : { userId: p.id }} />
      )}
      {error && <p className="form-error">{error}</p>}
      {children}
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
