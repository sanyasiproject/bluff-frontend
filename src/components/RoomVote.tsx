// Private rooms: the PIN prompt on joining, the host's PIN lock and the remove vote (button, banner)
import '../styles/land-private.css';
import { createContext, useContext, useEffect, useState } from 'react';
import { useNow } from '../lib/useNow';
import { serverNow } from '../lib/serverClock';
import { cx } from '../lib/cards';
import { REMOVE_VOTE, ROOM_PIN_PATTERN, type RoomView } from '../types';
import type { Actions, PinAsk } from '../useBluff';
import { Backdrop } from './Overlays';

/** the room I'm in, for sheets that only get a player (the tables' seat sheet) */
export const RoomCtx = createContext<{ view: RoomView | null; actions: Actions } | null>(null);

const nameIn = (view: RoomView, id: string) => [...view.players, ...view.watchers].find((p) => p.id === id)?.name ?? 'Someone';

/** a seated person may start a vote on another person, with 3+ people here and no vote running */
export function canVoteOut(view: RoomView | null, targetId: string): boolean {
  if (!view || view.vote || targetId === view.meId) return false;
  if (!view.players.some((p) => p.id === view.meId)) return false;
  const target = view.players.find((p) => p.id === targetId) ?? view.watchers.find((w) => w.id === targetId);
  if (!target || ('bot' in target && target.bot)) return false;
  const people = view.players.filter((p) => !p.bot).length + view.watchers.length;
  return people >= REMOVE_VOTE.minPeople;
}

/** "Vote to remove" in a player sheet, with a confirm step */
export function VoteRemoveButton({ targetId, onDone }: { targetId: string; onDone?: () => void }) {
  const room = useContext(RoomCtx);
  const [sure, setSure] = useState(false);
  if (!room || !canVoteOut(room.view, targetId)) return null;
  const name = nameIn(room.view!, targetId);
  if (!sure)
    return (
      <button className="btn block ghost danger-text vote-out-btn" onClick={() => setSure(true)}>
        🗳️ Vote to remove
      </button>
    );
  return (
    <div className="confirm-inline">
      <p>
        Start a vote to remove <b data-no-translate>{name}</b>? More than half of the others must say yes within 30 s.
      </p>
      <div className="confirm-actions">
        <button className="btn ghost" onClick={() => setSure(false)}>
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={() => {
            setSure(false);
            onDone?.();
            void room.actions.voteRemove(targetId);
          }}
        >
          Start vote
        </button>
      </div>
    </div>
  );
}

/** the vote running in my room: who, yes / needed, a 30 s countdown and Yes / No for those who may vote */
export function VoteBanner({ view, actions }: { view: RoomView | null; actions: Actions }) {
  const now = useNow(250);
  const v = view?.vote;
  if (!view || !v) return null;
  const left = Math.max(0, Math.ceil((v.endsAt - serverNow()) / 1000));
  const total = REMOVE_VOTE.ms / 1000;
  const target = nameIn(view, v.target);
  const isMe = v.target === view.meId;
  void now;
  return (
    <div className="vote-banner" role="status" aria-live="polite">
      <div className="vote-head">
        <span className="vote-emoji" aria-hidden>
          🗳️
        </span>
        <b className="grow">
          {isMe ? (
            'Vote to remove you'
          ) : (
            <>
              Remove <span data-no-translate>{target}</span>?
            </>
          )}
        </b>
        <span className="vote-time">{left}s</span>
      </div>
      <div className="vote-bar" aria-hidden>
        <i style={{ transform: `scaleX(${Math.min(1, left / total)})` }} />
      </div>
      <div className="vote-row">
        <span className="vote-count">
          ✅ {v.yes} / {v.needed} yes · ❌ {v.no}
        </span>
        {v.canVote && v.myVote === null ? (
          <span className="vote-actions">
            <button className="btn small primary" onClick={() => void actions.vote(true)}>
              Yes
            </button>
            <button className="btn small ghost" onClick={() => void actions.vote(false)}>
              No
            </button>
          </span>
        ) : (
          v.myVote !== null && <span className="muted small">You voted {v.myVote ? 'yes' : 'no'}</span>
        )}
      </div>
    </div>
  );
}

/** joining a locked room: asks for its 4-digit PIN */
export function PinPrompt({ ask, onJoin, onClose }: { ask: PinAsk | null; onJoin: (pin: string) => void; onClose: () => void }) {
  const [pin, setPin] = useState('');
  useEffect(() => setPin(''), [ask?.code, ask?.wrong]);
  if (!ask) return null;
  const ok = ROOM_PIN_PATTERN.test(pin);
  return (
    <Backdrop center onClose={onClose} panel="pin-ask">
      <h3>🔒 This room needs a PIN</h3>
      <p className="muted small">
        Room <b data-no-translate>{ask.code}</b>: ask the host for its 4-digit PIN.
      </p>
      <PinInput value={pin} onChange={setPin} onEnter={() => ok && onJoin(pin)} />
      {ask.wrong && <p className="pin-wrong small">Wrong PIN. Try again</p>}
      <div className="confirm-actions">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" disabled={!ok} onClick={() => onJoin(pin)}>
          Join
        </button>
      </div>
    </Backdrop>
  );
}

function PinInput({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <input
      className="pin-input"
      inputMode="numeric"
      autoComplete="off"
      pattern="[0-9]*"
      maxLength={4}
      placeholder="••••"
      aria-label="Room PIN"
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onKeyDown={(e) => e.key === 'Enter' && onEnter()}
    />
  );
}

/** lobby top bar: 🔒 chip; the host opens the PIN sheet from it (set, change, remove), others just see it's locked */
export function LockChip({ view, actions, isHost }: { view: RoomView; actions: Actions; isHost: boolean }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  if (!isHost && !view.locked) return null;
  const cur = view.pin ?? null;
  const save = async (next: string | null) => {
    if ((await actions.setPin(next)) !== null) setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        className={cx('room-chip lock-chip', view.locked && 'on')}
        disabled={!isHost}
        onClick={() => (setPin(cur ?? ''), setOpen(true))}
        aria-label={view.locked ? 'Locked with a PIN' : 'Lock with PIN'}
      >
        {view.locked ? (isHost && cur ? <>🔒 <span data-no-translate>{cur}</span></> : '🔒 Locked') : '🔒 Lock with PIN'}
      </button>
      {open && (
        <Backdrop center onClose={() => setOpen(false)} panel="pin-ask">
          <h3>{cur ? '🔒 Room PIN' : '🔒 Lock with PIN'}</h3>
          <p className="muted small">Only people with the PIN can join. Invites you share carry it. Only you see it.</p>
          <PinInput value={pin} onChange={setPin} onEnter={() => ROOM_PIN_PATTERN.test(pin) && void save(pin)} />
          <div className="confirm-actions">
            {cur && (
              <button className="btn ghost danger-text" onClick={() => void save(null)}>
                🔓 Remove PIN
              </button>
            )}
            <button className="btn primary" disabled={!ROOM_PIN_PATTERN.test(pin) || pin === cur} onClick={() => void save(pin)}>
              {cur ? 'Change PIN' : 'Lock room'}
            </button>
          </div>
        </Backdrop>
      )}
    </>
  );
}
