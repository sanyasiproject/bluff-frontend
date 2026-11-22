import { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cards';
import { isMuted, useMuteVersion } from '../lib/mute';
import { markSeen, sayInRoom, unreadOf, useRoomChatSync, useRoomMessages } from '../lib/roomChat';
import { ROOM_CHAT_LENGTH, type RoomMessage, type RoomView } from '../types';

const timeOf = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** the room's chat lines I see (not people I muted) and how many are new; keeps the list in step with the room */
export function useRoomChat(view: RoomView | undefined, open: boolean): { list: RoomMessage[]; unread: number } {
  useRoomChatSync(view?.code ?? null);
  useMuteVersion();
  const all = useRoomMessages();
  const list = view ? all.filter((m) => m.from === view.meId || !isMuted({ id: m.from, username: m.username })) : [];
  // reading the tray counts as seen, also for lines that come in while it's open
  useEffect(() => {
    if (open) markSeen();
  }, [open, list.length]);
  return { list, unread: view ? unreadOf(list, view.meId) : 0 };
}

/** everything said in this room, oldest first; stays scrolled to the newest line */
export function RoomChatList({ list, meId }: { list: RoomMessage[]; meId: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [list.length]);
  return (
    <div ref={box} className="room-chat-list" aria-live="polite">
      {list.length === 0 ? (
        <p className="muted small room-chat-empty">No messages yet. Say hi 👋</p>
      ) : (
        list.map((m) => (
          <div key={m.id} className={cx('room-chat-line', m.from === meId && 'mine', m.quick && 'quick')}>
            {m.from !== meId && (
              <b className="room-chat-name" data-no-translate>
                {m.name}
              </b>
            )}
            <span className="room-chat-text" data-no-translate>
              {m.text}
            </span>
            <small className="room-chat-time">{timeOf(m.at)}</small>
          </div>
        ))
      )}
    </div>
  );
}

/** type a line for everyone in the room */
export function RoomChatInput() {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const left = ROOM_CHAT_LENGTH - [...text].length;

  const submit = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const err = await sayInRoom(text);
    setBusy(false);
    setError(err);
    if (!err) setText('');
  };

  return (
    <form
      className="room-chat-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        className="input"
        value={text}
        maxLength={ROOM_CHAT_LENGTH}
        placeholder="Message everyone in the room"
        aria-label="Message everyone in the room"
        enterKeyHint="send"
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn primary" disabled={!text.trim() || busy}>
        Send
      </button>
      {(error || left <= 20) && <p className={cx('room-chat-note', error && 'form-error')}>{error ?? `${left} left`}</p>}
    </form>
  );
}
