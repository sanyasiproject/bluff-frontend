import { useState, type ReactNode } from 'react';
import type { Auth } from '../useAuth';
import type { Actions, PendingWatch } from '../useBluff';

interface Props {
  auth: Auth;
  actions: Actions;
  online: boolean;
  busy: boolean;
  go: (fn: () => Promise<unknown>) => Promise<void>;
  /** the guest name field */
  name: string;
  setName: (name: string) => void;
  /** the account name, or the guest name */
  playName: string;
  /** guest play is off and this is a guest */
  locked: boolean;
  invite: string | null;
  onDropInvite: () => void;
  pendingWatch: PendingWatch | null;
  serverStatus: ReactNode;
  onAccount: (sheet: 'login' | 'register') => void;
  onHowTo: () => void;
  onClose: () => void;
}

/** Home's Play panel: create a room or join one with a code (or the invite / waiting / locked states) */
export function PlayPanel(p: Props) {
  const { auth, actions, online, busy, go, playName, invite, pendingWatch } = p;
  const [code, setCode] = useState('');

  const nameField = auth.user ? (
    <p className="playing-as">
      Playing as <b data-no-translate>{auth.user.displayName}</b>
    </p>
  ) : (
    <div className="hp-name">
      <label className="label" htmlFor="name">
        Your name
      </label>
      <input
        id="name"
        className="input"
        maxLength={16}
        value={p.name}
        placeholder="e.g. Ravi"
        autoComplete="nickname"
        enterKeyHint="done"
        onChange={(e) => p.setName(e.target.value)}
      />
    </div>
  );

  const guestHint =
    !auth.user && auth.accountsOn && !auth.checking && !p.locked ? (
      <p className="guest-hint">
        Playing as a <b>guest</b> · log in to earn coins and save wins
      </p>
    ) : null;

  const howTo = (
    <button
      className="link-btn hp-how"
      onClick={() => {
        p.onClose();
        p.onHowTo();
      }}
    >
      📘 How to play
    </button>
  );

  let body: ReactNode;
  if (pendingWatch) {
    body = (
      <section className="stack invite-card hp-card">
        <p className="label">{pendingWatch.askedOf ? 'Asked to join' : 'Game in progress'}</p>
        <p className="invite-room">
          Room <b>{pendingWatch.code}</b>
        </p>
        <p className="waiting-host">
          <span className="dot" />
          {pendingWatch.askedOf ? `Waiting for ${pendingWatch.askedOf} to let you in…` : 'Waiting for the host to let you watch…'}
        </p>
        <p className="muted small">You'll go straight in when they say yes.</p>
        <button className="btn ghost block" onClick={actions.cancelWatch}>
          Cancel
        </button>
      </section>
    );
  } else if (p.locked) {
    body = (
      <section className="stack guest-locked hp-card">
        <p className="lock-title">🔒 Log in to play</p>
        <p className="muted small">
          Guest play is off right now. Log in or make a free account to {invite ? `join room ${invite}` : 'create or join a room'}.
        </p>
        <div className="hp-two">
          <button className="btn primary block shine" onClick={() => p.onAccount('login')}>
            Log in
          </button>
          <button className="btn ghost block" onClick={() => p.onAccount('register')}>
            Sign up
          </button>
        </div>
      </section>
    );
  } else if (invite) {
    body = (
      <section className="stack invite-card hp-card">
        <p className="label">You're invited</p>
        <p className="invite-room">
          Room <b>{invite}</b>
        </p>
        {nameField}
        <button className="btn primary block shine" disabled={!playName || !online || busy} onClick={() => go(() => actions.join(invite, playName))}>
          {busy ? `Joining room ${invite}…` : `Join room ${invite}`}
        </button>
        <button className="link-btn" onClick={p.onDropInvite}>
          Create my own room instead
        </button>
      </section>
    );
  } else {
    body = (
      <section className="stack hp-card">
        {nameField}
        <div className="hp-ways">
          <div className="hp-way">
            <p className="hp-way-title">New game</p>
            <button className="btn primary block shine" disabled={!playName || !online || busy} onClick={() => go(() => actions.create(playName))}>
              Create a room
            </button>
          </div>
          <div className="divider hp-or">
            <span>or</span>
          </div>
          <div className="hp-way">
            <p className="hp-way-title">Join with a code</p>
            <div className="join-row">
              <input
                className="input code-input"
                value={code}
                placeholder="CODE"
                aria-label="Room code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              />
              <button className="btn" disabled={!playName || code.length !== 4 || !online || busy} onClick={() => go(() => actions.join(code, playName))}>
                Join
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="hp-panel">
      <header className="hp-head">
        <h2 className="hp-title">Play</h2>
        <button className="icon-btn hp-close" aria-label="Close" onClick={p.onClose}>
          ✕
        </button>
      </header>
      {p.serverStatus}
      {guestHint}
      {body}
      {howTo}
    </div>
  );
}
