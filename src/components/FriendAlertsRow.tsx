import { useState } from 'react';
import { friendAlertsOn, setFriendAlerts } from '../lib/friendAlerts';
import type { Auth } from '../useAuth';

/** Profile: "friend came online" alerts, on or off for this phone */
export function FriendAlertsRow({ auth }: { auth: Auth }) {
  const userId = auth.user?.id;
  const [on, setOn] = useState(() => (userId ? friendAlertsOn(userId) : true));
  if (!userId) return null;

  const set = (next: boolean) => {
    setFriendAlerts(userId, next);
    setOn(next);
  };

  return (
    <section className="panel notify-row">
      <div className="setting-row">
        <div className="grow">
          <b>👋 Friend alerts</b>
          <span>{on ? 'Show a card when a friend comes online' : 'No alerts when friends come online'}</span>
        </div>
        <div className="mini-seg" role="group" aria-label="Friend alerts">
          <button className={on ? 'on' : ''} aria-pressed={on} onClick={() => !on && set(true)}>
            On
          </button>
          <button className={!on ? 'on' : ''} aria-pressed={!on} onClick={() => on && set(false)}>
            Off
          </button>
        </div>
      </div>
    </section>
  );
}
