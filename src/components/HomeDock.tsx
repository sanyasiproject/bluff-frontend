import type { Auth } from '../useAuth';
import { SpinButton } from './DailyCard';
import { GetAppButton } from './InstallCard';
import { LeagueButton } from './LeaguePage';
import { MissionsButton } from './MissionsPage';
import { FriendsDockButton } from './OnlineFriends';
import { ShopButton } from './ShopPage';

interface Props {
  auth: Auth;
  online: boolean;
  onHowTo: () => void;
  onFriends: () => void;
  /** guests: the account items open Log in */
  onLogin: () => void;
}

/** a dock item for guests: looks the same, opens Log in */
function GuestItem({ icon, label, onLogin }: { icon: string; label: string; onLogin: () => void }) {
  return (
    <button type="button" className="dock-item guest" aria-label={`${label}: log in first`} onClick={onLogin}>
      <span className="dock-icon" aria-hidden>
        {icon}
      </span>
      <span className="dock-label">{label}</span>
      <b className="dock-badge lock" aria-hidden>
        🔒
      </b>
    </button>
  );
}

/** Home: one row of round buttons for everything that isn't Play */
export function HomeDock({ auth, online, onHowTo, onFriends, onLogin }: Props) {
  const user = auth.user;
  const guestItems = !user && auth.accountsOn === true && !auth.checking;
  return (
    <nav className="home-dock" aria-label="More">
      {user ? (
        <>
          <MissionsButton auth={auth} online={online} />
          <LeagueButton auth={auth} online={online} />
          <ShopButton auth={auth} online={online} />
          <SpinButton auth={auth} />
          <FriendsDockButton auth={auth} onOpen={onFriends} />
        </>
      ) : (
        guestItems && (
          <>
            <GuestItem icon="🎯" label="Missions" onLogin={onLogin} />
            <GuestItem icon="🏆" label="Friends league" onLogin={onLogin} />
            <GuestItem icon="🛍️" label="Coin shop" onLogin={onLogin} />
            <GuestItem icon="👥" label="Friends" onLogin={onLogin} />
          </>
        )
      )}
      <button type="button" className="dock-item" onClick={onHowTo}>
        <span className="dock-icon" aria-hidden>
          📘
        </span>
        <span className="dock-label">How to play</span>
      </button>
      <GetAppButton />
    </nav>
  );
}
