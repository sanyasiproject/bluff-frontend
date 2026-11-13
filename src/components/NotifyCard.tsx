import { useEffect, useState } from 'react';
import { errorText } from '../lib/api';
import { enablePush, pushState, pushTurnedOff } from '../lib/push';
import { loadPref, savePref } from '../lib/storage';
import type { Auth } from '../useAuth';

/** shown once per player on this phone */
const seenPref = (userId: string) => `pushCard.${userId}`;

/** Home: a one-time card for logged-in players whose phone hasn't been asked yet */
export function NotifyCard({ auth }: { auth: Auth }) {
  const userId = auth.user?.id ?? null;
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setShow(false);
    if (!userId || auth.pushInvites !== true || pushTurnedOff(userId) || loadPref(seenPref(userId)) === '1') return;
    // only when the phone hasn't answered yet: an earlier yes turns on by itself, a no can't be asked again
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    void pushState().then((s) => live && setShow(s === 'off'));
    return () => {
      live = false;
    };
  }, [userId, auth.pushInvites]);

  if (!show || !userId) return null;

  const close = () => {
    savePref(seenPref(userId), '1');
    setShow(false);
  };

  // straight from the tap, so the phone shows its prompt
  const turnOn = async () => {
    setBusy(true);
    setError('');
    try {
      await enablePush(auth.token);
      close();
    } catch (err) {
      setError(errorText(err));
      if (Notification.permission === 'denied') close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel notify-card">
      <p className="notify-card-title">🔔 Get friend invites even when Bluff is closed</p>
      <p className="muted small">A friend taps Invite, your phone shows it, one tap and you're in their room.</p>
      {error && <p className="form-error">{error}</p>}
      <div className="confirm-actions">
        <button className="btn ghost" disabled={busy} onClick={close}>
          Not now
        </button>
        <button className="btn primary" disabled={busy} onClick={() => void turnOn()}>
          Turn on
        </button>
      </div>
    </section>
  );
}
