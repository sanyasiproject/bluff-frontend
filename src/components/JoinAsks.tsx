import { useState } from 'react';
import type { RoomView } from '../types';
import { Avatar } from './Avatar';

/** at most this many asks show at once; the rest wait their turn */
const MAX_SHOWN = 3;

/**
 * top right, on any screen in the room: people asking me to let them in (through me as their friend, or as the host mid-game).
 * Nobody gets in until I say yes
 */
export function JoinAsks({ view, onAnswer }: { view: RoomView | null; onAnswer: (requestId: string, accept: boolean) => Promise<unknown> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const asks = view?.watchRequests ?? [];
  if (asks.length === 0) return null;
  const answer = async (id: string, accept: boolean) => {
    setBusy(id);
    await onAnswer(id, accept);
    setBusy(null);
  };
  return (
    <div className="join-asks" role="status" aria-live="polite">
      {asks.slice(0, MAX_SHOWN).map((r) => (
        <div key={r.id} className="join-ask">
          <Avatar name={r.name} avatar={null} size="sm" />
          <p className="grow">
            👋 <b>{r.name}</b> wants to {r.watch === false ? 'join' : 'watch'}
          </p>
          <div className="join-ask-btns">
            <button className="btn small primary" disabled={busy !== null} onClick={() => void answer(r.id, true)}>
              Let in
            </button>
            <button className="btn small ghost" disabled={busy !== null} onClick={() => void answer(r.id, false)}>
              No
            </button>
          </div>
        </div>
      ))}
      {asks.length > MAX_SHOWN && <p className="muted small">+{asks.length - MAX_SHOWN} more waiting</p>}
    </div>
  );
}
