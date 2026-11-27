import { useState } from 'react';
import type { Auth } from '../useAuth';
import { NameCard } from './NameCard';
import { useNotifyOffer } from './NotifyCard';
import { Backdrop } from './Overlays';

// same per-phone memory as the old Home name card
const nameSeenKey = (userId: string) => `bluff.nameCard.${userId}`;

function nameSeen(userId: string): boolean {
  try {
    return localStorage.getItem(nameSeenKey(userId)) === '1';
  } catch {
    return false;
  }
}

/** once per player on this phone: is your name right? Never for admins, only while a change is open */
function useNameCheck(auth: Auth) {
  const user = auth.user;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const show = !!user && user.role !== 'admin' && user.nameChangeAt === null && dismissed !== user.id && !nameSeen(user.id);
  const done = () => {
    if (!user) return;
    try {
      localStorage.setItem(nameSeenKey(user.id), '1');
    } catch {
      // private mode: the card just comes back next time
    }
    setDismissed(user.id);
  };
  return { show, done };
}

/** Home top bar: at most one small one-time notice (name check first, then phone invites) */
export function HomeNotice({ auth }: { auth: Auth }) {
  const name = useNameCheck(auth);
  const notify = useNotifyOffer(auth);
  const [editing, setEditing] = useState(false);
  const user = auth.user;

  if (user && (name.show || editing)) {
    return (
      <>
        <div className="home-notice" role="status">
          <span className="home-notice-icon" aria-hidden>
            ✏️
          </span>
          <p className="home-notice-text">
            Is “<b data-no-translate>{user.displayName}</b>” the right name?
          </p>
          <button className="btn small ghost" onClick={() => setEditing(true)}>
            Change
          </button>
          <button className="btn small primary" onClick={name.done}>
            Looks good ✓
          </button>
        </div>
        {editing && (
          <Backdrop center onClose={() => setEditing(false)} panel="hp-name">
            <NameCard
              auth={auth}
              title="✏️ Your name"
              onSaved={() =>
                window.setTimeout(() => {
                  name.done();
                  setEditing(false);
                }, 1500)
              }
            />
          </Backdrop>
        )}
      </>
    );
  }

  if (notify) {
    return (
      <div className="home-notice" role="status">
        <span className="home-notice-icon" aria-hidden>
          🔔
        </span>
        <p className="home-notice-text">
          Get friend invites even when Game Baithak is closed
          {notify.error && <span className="form-error">{notify.error}</span>}
        </p>
        <button className="btn small primary" disabled={notify.busy} onClick={() => void notify.turnOn()}>
          Turn on
        </button>
        <button className="icon-btn home-notice-x" aria-label="Not now" disabled={notify.busy} onClick={notify.close}>
          ✕
        </button>
      </div>
    );
  }
  return null;
}
