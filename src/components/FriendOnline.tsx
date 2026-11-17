import { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cards';
import { friendAlertsOn } from '../lib/friendAlerts';
import { socket } from '../lib/socket';
import { sfx } from '../lib/sounds';
import type { FriendOnlineEvent } from '../types';
import type { Auth } from '../useAuth';
import type { InviteAck } from '../useBluff';
import { Avatar } from './Avatar';

const SHOW_MS = 6000;
const INVITE_MS = 4000;
const CHIME_GAP_MS = 1500;
const MAX_ROWS = 3;

function title(names: string[]): string {
  if (names.length === 1) return `👋 ${names[0]} came online`;
  if (names.length === 2) return `👋 ${names[0]} and ${names[1]} came online`;
  const others = names.length - 2;
  return `👋 ${names[0]}, ${names[1]} and ${others} other${others === 1 ? '' : 's'} came online`;
}

interface Props {
  auth: Auth;
  inLobby: boolean;
  /** the ack, or null when it failed (the error toast is already shown) */
  onInvite: (friendId: string) => Promise<InviteAck | null>;
}

/** a card in the top-right corner when a friend comes online; several arrivals share one card */
export function FriendOnline({ auth, inLobby, onInvite }: Props) {
  const [friends, setFriends] = useState<FriendOnlineEvent[]>([]);
  const [invited, setInvited] = useState<string[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const timer = useRef<number | undefined>(undefined);
  /** when the card goes away */
  const until = useRef(0);
  const lastChime = useRef(0);
  const userId = auth.user?.id ?? null;

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setFriends([]);
    setInvited([]);
  }, []);

  // longer only: an Invite tap never cuts the card's time short
  const hideAfter = useCallback(
    (ms: number, longerOnly = false) => {
      const at = Date.now() + ms;
      if (longerOnly && at <= until.current) return;
      until.current = at;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(close, ms);
    },
    [close],
  );

  useEffect(() => {
    // logged out or another account: nothing carries over
    close();
    if (!userId) return;
    const onOnline = (e: FriendOnlineEvent) => {
      if (!e || e.id === userId || !friendAlertsOn(userId)) return;
      setFriends((list) => (list.some((f) => f.id === e.id) ? list : [...list, e]));
      hideAfter(SHOW_MS);
      const now = Date.now();
      if (now - lastChime.current > CHIME_GAP_MS) sfx.friendOnline();
      lastChime.current = now;
    };
    socket.on('friend:online', onOnline);
    return () => {
      socket.off('friend:online', onOnline);
      window.clearTimeout(timer.current);
    };
  }, [userId, close, hideAfter]);

  const invite = async (id: string) => {
    setBusy((b) => [...b, id]);
    const ack = await onInvite(id);
    setBusy((b) => b.filter((x) => x !== id));
    if (ack) setInvited((l) => [...l, id]);
    hideAfter(INVITE_MS, true);
  };

  if (friends.length === 0) return null;
  const rows = friends.slice(0, MAX_ROWS);
  const more = friends.length - rows.length;

  return (
    <div className="friend-online" role="status" aria-live="polite">
      <div className="friend-online-head">
        <b>{title(friends.map((f) => f.name))}</b>
        <button className="friend-online-x" aria-label="Close friend alert" onClick={close}>
          ✕
        </button>
      </div>
      {rows.map((f) => {
        const sent = invited.includes(f.id);
        return (
          <div className="friend-online-row" key={f.id}>
            <Avatar name={f.name} avatar={f.avatar} size="sm" />
            <span className="friend-online-name">{f.name}</span>
            {inLobby && (
              <button
                className={cx('btn', sent ? 'sent' : 'primary')}
                disabled={sent || busy.includes(f.id)}
                aria-label={sent ? `${f.name} invited` : `Invite ${f.name}`}
                onClick={() => void invite(f.id)}
              >
                {sent ? 'Invited ✓' : 'Invite'}
              </button>
            )}
          </div>
        );
      })}
      {more > 0 && <span className="friend-online-more">+{more} more</span>}
    </div>
  );
}
