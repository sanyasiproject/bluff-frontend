import { useEffect, useState } from 'react';
import { errorText } from '../lib/api';
import { enablePush, pushState, pushTurnedOff } from '../lib/push';
import { loadPref, savePref } from '../lib/storage';
import type { Auth } from '../useAuth';

/** shown once per player on this phone */
const seenPref = (userId: string) => `pushCard.${userId}`;

export interface NotifyOffer {
  busy: boolean;
  error: string;
  turnOn: () => Promise<void>;
  /** Not now: never asked again on this phone */
  close: () => void;
}

/** Home: the one-time "get invites when closed" offer, or null when it shouldn't show */
export function useNotifyOffer(auth: Auth): NotifyOffer | null {
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

  return { busy, error, turnOn, close };
}

/** a one-time card for logged-in players whose phone hasn't been asked yet */
export function NotifyCard({ auth }: { auth: Auth }) {
  const offer = useNotifyOffer(auth);
  if (!offer) return null;
  return (
    <section className="panel notify-card">
      <p className="notify-card-title">🔔 Get friend invites even when Game Baithak is closed</p>
      <p className="muted small">A friend taps Invite, your phone shows it, one tap and you're in their room.</p>
      {offer.error && <p className="form-error">{offer.error}</p>}
      <div className="confirm-actions">
        <button className="btn ghost" disabled={offer.busy} onClick={offer.close}>
          Not now
        </button>
        <button className="btn primary" disabled={offer.busy} onClick={() => void offer.turnOn()}>
          Turn on
        </button>
      </div>
    </section>
  );
}
