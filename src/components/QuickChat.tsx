import { useState } from 'react';
import { QUICK_MESSAGES, REACTIONS, type ChatKind } from '../types';
import { Backdrop } from './Overlays';

/** 💬 button opening reactions and quick messages; everyone in the room sees them */
export function QuickChat({ onSend }: { onSend: (kind: ChatKind, index: number) => void }) {
  const [open, setOpen] = useState(false);

  const send = (kind: ChatKind, index: number) => {
    onSend(kind, index);
    setOpen(false);
  };

  return (
    <>
      <button className="icon-btn" aria-label="Quick chat" onClick={() => setOpen(true)}>
        💬
      </button>
      {open && (
        <Backdrop onClose={() => setOpen(false)}>
          <h3>Say something</h3>
          <div className="reaction-row">
            {REACTIONS.map((emoji, i) => (
              <button key={emoji} className="reaction-btn" aria-label={`React ${emoji}`} onClick={() => send('reaction', i)}>
                {emoji}
              </button>
            ))}
          </div>
          <div className="message-grid">
            {QUICK_MESSAGES.map((text, i) => (
              <button key={text} className="message-btn" onClick={() => send('message', i)}>
                {text}
              </button>
            ))}
          </div>
          <button className="btn ghost block" onClick={() => setOpen(false)}>
            Close
          </button>
        </Backdrop>
      )}
    </>
  );
}
