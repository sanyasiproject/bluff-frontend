import { useState } from 'react';
import { errorText } from '../lib/api';
import { NAME_CHANGE_DAYS } from '../types';
import type { Auth } from '../useAuth';
import { ConfirmBox } from './ConfirmBox';

/** "21 Jan 2027" */
const day = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

/** Settings: change your display name; the first change any time, then once every NAME_CHANGE_DAYS (admins any time) */
export function NameCard({ auth, onSaved, title = '✏️ Your name' }: { auth: Auth; onSaved?: () => void; title?: string }) {
  const user = auth.user;
  const [name, setName] = useState(user?.displayName ?? '');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;

  const admin = user.role === 'admin';
  // older servers don't say: no lock shown
  const lockedUntil = user.nameChangeAt ?? null;
  const next = name.trim().replace(/\s+/g, ' ');
  const changed = next.length > 0 && next !== user.displayName;

  const save = async () => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await auth.changeName(next);
      setNote(`Your name is now ${next}`);
      onSaved?.();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel stack-tight name-card">
      <h3 className="section-title">{title}</h3>
      {lockedUntil ? (
        <p className="name-locked">
          🔒 <b>{user.displayName}</b> · you can change it again on <b>{day(lockedUntil)}</b>
        </p>
      ) : (
        <>
          <div className="join-row">
            <input
              className="input"
              maxLength={16}
              value={name}
              aria-label="Your name"
              onChange={(e) => {
                setName(e.target.value);
                setError('');
                setNote('');
              }}
            />
            <button className="btn primary" disabled={!changed || busy} onClick={() => setAsking(true)}>
              Save
            </button>
          </div>
          <p className="muted small">
            {admin ? 'Admins can change it any time.' : `Got it wrong? Change it now. After that, once every ${NAME_CHANGE_DAYS / 30} months.`}
          </p>
        </>
      )}
      {note && <p className="form-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      {asking && (
        <ConfirmBox
          title={`Change your name to ${next}?`}
          body={admin ? 'Everyone sees your new name from your next game.' : `You won't be able to change it again for ${NAME_CHANGE_DAYS / 30} months.`}
          action="Change name"
          danger={false}
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false);
            void save();
          }}
        />
      )}
    </section>
  );
}

const seenKey = (userId: string) => `bluff.nameCard.${userId}`;

/** Home, once per player on this phone: is your name right? Fix it here, or say it looks good. Never for admins */
export function HomeNameCard({ auth }: { auth: Auth }) {
  const user = auth.user;
  const [hidden, setHidden] = useState(() => {
    try {
      return !!user && localStorage.getItem(seenKey(user.id)) === '1';
    } catch {
      return false;
    }
  });
  // only while a change is open (older servers don't say: no card)
  if (!user || hidden || user.role === 'admin' || user.nameChangeAt !== null) return null;
  const done = () => {
    try {
      localStorage.setItem(seenKey(user.id), '1');
    } catch {
      // private mode: the card just comes back next time
    }
    setHidden(true);
  };
  return (
    <div className="home-name-card">
      <NameCard auth={auth} title={`✏️ Is “${user.displayName}” the right name?`} onSaved={() => window.setTimeout(done, 1500)} />
      <button className="link-btn" onClick={done}>
        Looks good ✓
      </button>
    </div>
  );
}
