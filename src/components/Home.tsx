import { useEffect, useRef, useState } from 'react';
import { clearInvite, inviteCode } from '../lib/invite';
import { loadName, loadSavedSession, loadTabSession } from '../lib/storage';
import type { Auth } from '../useAuth';
import type { Actions, ConnStatus, PendingWatch } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { AccountSheet } from './AccountSheet';
import { HeroFan, ShineTitle, SuitDrift } from './Ambient';
import { InstallCard } from './InstallCard';

interface HomeProps {
  status: ConnStatus;
  connectionId: string | null;
  actions: Actions;
  auth: Auth;
  onOpenAdmin: () => void;
  /** asked to watch a game in progress; waiting for the host */
  pendingWatch: PendingWatch | null;
}

export function Home({ status, connectionId, actions, auth, onOpenAdmin, pendingWatch }: HomeProps) {
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState(inviteCode);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [accountSheet, setAccountSheet] = useState<'login' | 'register' | null>(null);
  const autoJoin = useRef<{ connectionId: string | null; tries: number }>({ connectionId: null, tries: 0 });
  const saved = loadSavedSession();
  const online = status === 'online';
  // logged-in players always play under their account name
  const playName = auth.user?.displayName ?? name.trim();

  // a sleeping free server needs up to a minute to wake up
  useEffect(() => {
    if (online) return;
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [online]);

  const go = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  // invite link: take back this phone's seat if it has one, otherwise join with the saved name.
  // One try per fresh connection (max 2), so a drop right after connecting gets a second go.
  useEffect(() => {
    const auto = autoJoin.current;
    if (!invite || !online || !connectionId || auth.checking || auto.connectionId === connectionId || auto.tries >= 2) return;
    auto.connectionId = connectionId;
    auto.tries++;
    if (loadTabSession()?.code === invite) return; // useBluff already rejoins this tab's seat
    void go(async () => {
      if (saved?.code === invite && (await actions.rejoinSaved()) !== null) return;
      // guests can't join while guest play is off; the home screen asks them to log in
      if (playName && !locked) await actions.join(invite, playName);
    });
  }, [invite, online, connectionId, auth.checking]);

  const nameField = auth.user ? (
    <p className="playing-as">
      Playing as <b>{auth.user.displayName}</b>
    </p>
  ) : (
    <>
      <label className="label" htmlFor="name">
        Your name
      </label>
      <input
        id="name"
        className="input"
        maxLength={16}
        value={name}
        placeholder="e.g. Ravi"
        autoComplete="nickname"
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value)}
      />
    </>
  );

  // an admin turned guest play off: guests must log in before they can create or join a room
  const locked = !auth.user && auth.accountsOn === true && !auth.guestsAllowed && !auth.checking;

  const guestHint =
    !auth.user && auth.accountsOn && !auth.checking && !locked ? (
      <p className="guest-hint">
        Playing as a <b>guest</b> · log in to earn coins and save wins
      </p>
    ) : null;

  return (
    <main className="screen home">
      <SuitDrift />
      <header className="home-top">
        <AccountCorner auth={auth} onOpenAdmin={onOpenAdmin} />
      </header>
      <div className="hero">
        <HeroFan />
        <ShineTitle text="Bluff" />
        <p className="muted">Lie with a straight face. Catch your friends.</p>
      </div>

      {!online && (
        <p className="server-status">
          <span className="dot" />
          {slow ? 'Waking up the server… this can take up to a minute after a break.' : 'Connecting…'}
        </p>
      )}

      {guestHint}

      {pendingWatch ? (
        <section className="panel stack invite-card">
          <p className="label">Game in progress</p>
          <p className="invite-room">
            Room <b>{pendingWatch.code}</b>
          </p>
          <p className="waiting-host">
            <span className="dot" />
            Waiting for the host to let you watch…
          </p>
          <p className="muted small">You'll go straight in when they say yes.</p>
          <button className="btn ghost block" onClick={actions.cancelWatch}>
            Cancel
          </button>
        </section>
      ) : locked ? (
        <>
          {saved && (
            <button className="panel rejoin" disabled={!online || busy} onClick={() => go(actions.rejoinSaved)}>
              <span>
                Rejoin room <b>{saved.code}</b> as {saved.name}
              </span>
              <span aria-hidden>→</span>
            </button>
          )}
          <section className="panel stack guest-locked">
            <p className="lock-title">🔒 Log in to play</p>
            <p className="muted small">
              Guest play is off right now. Log in or make a free account to {invite ? `join room ${invite}` : 'create or join a room'}.
            </p>
            <button className="btn primary block shine" onClick={() => setAccountSheet('login')}>
              Log in
            </button>
            <button className="btn ghost block" onClick={() => setAccountSheet('register')}>
              Sign up
            </button>
          </section>
        </>
      ) : invite ? (
        <section className="panel stack invite-card">
          <p className="label">You're invited</p>
          <p className="invite-room">
            Room <b>{invite}</b>
          </p>
          {nameField}
          <button
            className="btn primary block shine"
            disabled={!playName || !online || busy}
            onClick={() => go(() => actions.join(invite, playName))}
          >
            {busy ? `Joining room ${invite}…` : `Join room ${invite}`}
          </button>
          <button
            className="link-btn"
            onClick={() => {
              clearInvite();
              setInvite(null);
            }}
          >
            Create my own room instead
          </button>
        </section>
      ) : (
        <>
          {saved && (
            <button className="panel rejoin" disabled={!online || busy} onClick={() => go(actions.rejoinSaved)}>
              <span>
                Rejoin room <b>{saved.code}</b> as {saved.name}
              </span>
              <span aria-hidden>→</span>
            </button>
          )}

          <section className="panel stack">
            {nameField}
            <button
              className="btn primary block shine"
              disabled={!playName || !online || busy}
              onClick={() => go(() => actions.create(playName))}
            >
              Create a room
            </button>

            <div className="divider">
              <span>or join friends</span>
            </div>

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
              <button
                className="btn"
                disabled={!playName || code.length !== 4 || !online || busy}
                onClick={() => go(() => actions.join(code, playName))}
              >
                Join
              </button>
            </div>
          </section>
        </>
      )}

      <InstallCard />
      {accountSheet && <AccountSheet initial={accountSheet} auth={auth} onClose={() => setAccountSheet(null)} />}

    </main>
  );
}
