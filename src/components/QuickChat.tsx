import { useState } from 'react';
import { QUICK_MESSAGES, REACTIONS, type ChatKind } from '../types';

/** 💬 opens a small tray: one row of emoji, then short message pills; tap outside to close */
export function QuickChat({ onSend }: { onSend: (kind: ChatKind, index: number) => void }) {
  const [open, setOpen] = useState(false);

  const send = (kind: ChatKind, index: number) => {
    onSend(kind, index);
    setOpen(false);
  };

  return (
    <>
      <button className="icon-btn" aria-label="Quick chat" aria-expanded={open} onClick={() => setOpen(true)}>
        💬
      </button>
      {open && (
        <div className="tray-backdrop" onClick={() => setOpen(false)}>
          <div className="chat-tray" role="dialog" aria-label="Quick chat" onClick={(e) => e.stopPropagation()}>
            <div className="tray-handle" />
            <div className="reaction-row">
              {REACTIONS.map((emoji, i) => (
                <button key={emoji} className="reaction-btn" aria-label={`React ${emoji}`} onClick={() => send('reaction', i)}>
                  {emoji}
                </button>
              ))}
            </div>
            <div className="message-pills">
              {QUICK_MESSAGES.map((text, i) => (
                <button key={text} className="message-pill" onClick={() => send('message', i)}>
                  {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
