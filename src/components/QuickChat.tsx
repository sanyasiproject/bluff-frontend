import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useBack } from '../lib/back';
import { chatSetOf, type ChatKind, type RoomView } from '../types';
import { RoomChatInput, RoomChatList, useRoomChat } from './RoomChat';

/** 💬 opens a small tray: the room's chat list and a typing box (with a view), one row of emoji, then short message pills; tap outside to close */
export function QuickChat({ onSend, view }: { onSend: (kind: ChatKind, index: number) => void; view?: RoomView }) {
  const [open, setOpen] = useState(false);
  useBack(open ? () => setOpen(false) : undefined);
  const { list, unread } = useRoomChat(view, open);
  // the table's own emoji and lines: each game has its own set
  const set = chatSetOf(view?.config.game);

  const send = (kind: ChatKind, index: number) => {
    onSend(kind, index);
    setOpen(false);
  };

  return (
    <>
      <button className="icon-btn chat-btn" aria-label={unread > 0 ? `Chat, ${unread} new` : 'Chat'} aria-expanded={open} onClick={() => setOpen(true)}>
        💬
        {unread > 0 && <span className="req-dot">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {/* drawn at the page's top level: inside a top bar with its own layer (the lobby's) seats and buttons would cover it */}
      {open &&
        createPortal(
          <div className="tray-backdrop" onClick={() => setOpen(false)}>
            <div className={view ? 'chat-tray with-list' : 'chat-tray'} role="dialog" aria-label="Chat" onClick={(e) => e.stopPropagation()}>
              <div className="tray-handle" />
              {view && <RoomChatList list={list} meId={view.meId} />}
              {view && <RoomChatInput />}
              <div className="reaction-row">
                {set.reactions.map((emoji, i) => (
                  <button key={emoji} className="reaction-btn" aria-label={`React ${emoji}`} onClick={() => send('reaction', i)}>
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="message-pills" data-no-translate>
                {set.messages.map((text, i) => (
                  <button key={text} className="message-pill" onClick={() => send('message', i)}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
