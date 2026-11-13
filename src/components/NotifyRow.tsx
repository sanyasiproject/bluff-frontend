import { useEffect, useState } from 'react';
import { errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { disablePush, enablePush, pushState, rememberPushOff, syncPush, type PushState } from '../lib/push';
import type { Auth } from '../useAuth';

const HELP: Partial<Record<PushState, string>> = {
  on: 'Friends can invite you even when Bluff is closed',
  off: 'Get a notification when a friend invites you and Bluff is closed',
  install: 'On iPhone: add Bluff to your Home Screen, open it from there, then turn this on',
  denied: "Notifications are blocked for Bluff in your phone's settings",
};

/** Profile: friend invites as phone notifications, on or off for this phone */
export function NotifyRow({ auth }: { auth: Auth }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    void pushState().then((s) => {
      if (!live) return;
      setState(s);
      // this phone may have belonged to another account before
      if (s === 'on' && auth.pushInvites) void syncPush(auth.token);
    });
    return () => {
      live = false;
    };
  }, [auth.token, auth.pushInvites]);

  // nothing to show where notifications can't work, or the server has none set up
  if (!state || state === 'unsupported' || state === 'unavailable' || auth.pushInvites === null) return null;

  // straight from the tap: the permission prompt only shows then
  const set = async (on: boolean) => {
    setBusy(true);
    setError('');
    try {
      if (on) await enablePush(auth.token);
      else await disablePush(auth.token);
      // a player's own Off stays off on this phone; nothing turns it back on by itself
      if (auth.user) rememberPushOff(auth.user.id, !on);
    } catch (err) {
      setError(errorText(err));
    }
    setState(await pushState());
    setBusy(false);
  };

  const adminOff = !auth.pushInvites;
  return (
    <section className={cx('panel notify-row', adminOff && 'off')}>
      <div className="setting-row">
        <div className="grow">
          <b>🔔 Invite notifications</b>
          <span>{adminOff ? 'Turned off by the admin for now' : HELP[state]}</span>
        </div>
        {!adminOff && (state === 'on' || state === 'off') && (
          <div className="mini-seg" role="group" aria-label="Invite notifications">
            <button className={cx(state === 'on' && 'on')} aria-pressed={state === 'on'} disabled={busy} onClick={() => state !== 'on' && void set(true)}>
              On
            </button>
            <button className={cx(state === 'off' && 'on')} aria-pressed={state === 'off'} disabled={busy} onClick={() => state !== 'off' && void set(false)}>
              Off
            </button>
          </div>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
