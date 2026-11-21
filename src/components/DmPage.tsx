import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { refreshUnread } from '../lib/dm';
import { socket } from '../lib/socket';
import { DM_MAX_LENGTH, type DirectMessage, type DmHistoryResponse, type DmReadEvent } from '../types';
import type { Auth } from '../useAuth';
import { FullPage } from './FullPage';

interface Props {
  auth: Auth;
  friend: { id: string; displayName: string };
  onClose: () => void;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayOf = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

/** adds messages by id, oldest first */
const merge = (list: DirectMessage[], more: DirectMessage[]) => {
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of more) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
};

/** a private 1:1 chat with a friend: bubbles, live updates, load older */
export function DmPage({ auth, friend, onClose }: Props) {
  const me = auth.user?.id ?? '';
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  /** keeps the view still while older messages load above it */
  const keepFrom = useRef<number | null>(null);
  const stick = useRef(true);

  const scroller = () => endRef.current?.closest('.page') as HTMLElement | null;
  const markRead = useCallback(() => {
    void api(`/friends/${friend.id}/messages/read`, { method: 'POST', token: auth.token })
      .then(() => refreshUnread())
      .catch(() => undefined);
  }, [friend.id, auth.token]);

  // newest page, then mark the thread read
  useEffect(() => {
    let live = true;
    api<DmHistoryResponse>(`/friends/${friend.id}/messages`, { token: auth.token })
      .then((res) => {
        if (!live) return;
        setMessages((prev) => merge(prev, res.messages));
        setMore(res.more);
        markRead();
      })
      .catch((err) => live && setError(errorText(err)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [friend.id, auth.token, markRead]);

  // live: new messages in this thread, and when they read mine
  useEffect(() => {
    const onDm = (m: DirectMessage) => {
      const mine = m.from === me && m.to === friend.id;
      if (!mine && !(m.from === friend.id && m.to === me)) return;
      const el = scroller();
      stick.current = mine || !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setMessages((prev) => merge(prev, [m]));
      if (!mine && document.visibilityState === 'visible') markRead();
    };
    const onRead = (e: DmReadEvent) => {
      if (e.reader === friend.id && e.other === me) setMessages((prev) => prev.map((m) => (m.from === me ? { ...m, read: true } : m)));
    };
    socket.on('dm', onDm);
    socket.on('dm:read', onRead);
    return () => {
      socket.off('dm', onDm);
      socket.off('dm:read', onRead);
    };
  }, [friend.id, me, markRead]);

  // to the newest message, or hold still after loading older ones
  useLayoutEffect(() => {
    const el = scroller();
    if (keepFrom.current !== null && el) {
      el.scrollTop += el.scrollHeight - keepFrom.current;
      keepFrom.current = null;
    } else if (stick.current) {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const loadOlder = async () => {
    const first = messages[0];
    if (!first) return;
    try {
      const res = await api<DmHistoryResponse>(`/friends/${friend.id}/messages?before=${encodeURIComponent(first.at)}`, { token: auth.token });
      keepFrom.current = scroller()?.scrollHeight ?? null;
      stick.current = false;
      setMessages((prev) => merge(prev, res.messages));
      setMore(res.more);
    } catch (err) {
      setError(errorText(err));
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await api<{ message: DirectMessage }>(`/friends/${friend.id}/messages`, { body: { text: body }, token: auth.token });
      stick.current = true;
      setMessages((prev) => merge(prev, [res.message]));
      setText('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSending(false);
    }
  };

  const lastMine = [...messages].reverse().find((m) => m.from === me);
  const left = DM_MAX_LENGTH - [...text.trim()].length;

  return (
    <FullPage title={`💬 ${friend.displayName}`} onBack={onClose}>
      <div className="dm-thread">
        {more && (
          <button className="link-btn dm-older" onClick={() => void loadOlder()}>
            Load older messages
          </button>
        )}
        {loading && <p className="muted small dm-empty">Loading…</p>}
        {!loading && messages.length === 0 && !error && <p className="muted small dm-empty">No messages yet. Say hi 👋</p>}
        {messages.map((m, i) => {
          const newDay = i === 0 || dayOf(messages[i - 1].at) !== dayOf(m.at);
          const mine = m.from === me;
          return (
            <div key={m.id} className="dm-item">
              {newDay && <p className="dm-day">{dayOf(m.at)}</p>}
              <div className={cx('dm-bubble', mine ? 'mine' : 'theirs')}>
                <span className="dm-text" data-no-translate>{m.text}</span>
                <span className="dm-time">{timeOf(m.at)}</span>
              </div>
              {mine && m === lastMine && m.read && <p className="dm-seen">Seen</p>}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form
        className="dm-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {error && <p className="form-error">{error}</p>}
        <div className="dm-compose-row">
          <textarea
            className="input dm-input"
            rows={1}
            placeholder="Message"
            aria-label={`Message ${friend.displayName}`}
            maxLength={DM_MAX_LENGTH + 20}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a computer; Shift+Enter is a new line
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button className="btn primary" type="submit" disabled={sending || !text.trim() || left < 0}>
            Send
          </button>
        </div>
        {left < 40 && <p className={cx('muted small dm-left', left < 0 && 'over')}>{left} left</p>}
      </form>
    </FullPage>
  );
}
