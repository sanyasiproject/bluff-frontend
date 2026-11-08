import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { BonusPopup, InvitePopup } from './components/Popups';
import { Reactions } from './components/Reactions';
import { Table } from './components/Table';
import { Toasts } from './components/Toasts';
import { clearInvite } from './lib/invite';
import { loadName } from './lib/storage';
import { useAuth } from './useAuth';
import { useBluff } from './useBluff';

export default function App() {
  const { status, connectionId, view, notes, reactions, invites, replaced, actions } = useBluff();
  const auth = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const inRoom = view !== null;
  const { refresh } = auth;
  const settled = view?.coinResults != null;

  // once inside a room the invite link has done its job
  useEffect(() => {
    if (inRoom) clearInvite();
  }, [inRoom]);

  // coins and stats change when a game is settled; show the new numbers
  useEffect(() => {
    if (settled) void refresh();
  }, [settled, refresh]);

  let screen;
  if (replaced) {
    screen = (
      <main className="screen center-screen">
        <h2>Opened somewhere else</h2>
        <p className="muted">This game is now open in another tab or phone.</p>
        <button className="btn primary" onClick={actions.reclaim}>
          Play here instead
        </button>
      </main>
    );
  } else if (!view && adminOpen && auth.user?.role === 'admin') {
    screen = <AdminPanel auth={auth} onBack={() => setAdminOpen(false)} />;
  } else if (!view) {
    screen = (
      <Home status={status} connectionId={connectionId} actions={actions} auth={auth} onOpenAdmin={() => setAdminOpen(true)} />
    );
  } else if (view.phase === 'lobby') {
    screen = <Lobby view={view} actions={actions} auth={auth} />;
  } else {
    screen = <Table view={view} actions={actions} />;
  }

  const invite = invites[invites.length - 1];
  const seatedInGame = view?.phase === 'playing' && view.players.some((p) => p.id === view.meId);

  return (
    <>
      {screen}
      {view && !replaced && status !== 'online' && <div className="conn-pill">Reconnecting…</div>}
      <Toasts notes={notes} />
      <Reactions items={reactions} />
      {invite && (
        <InvitePopup
          invite={invite}
          inGame={seatedInGame}
          onJoin={() => void actions.acceptInvite(invite, auth.user?.displayName ?? loadName())}
          onIgnore={() => actions.dismissInvite(invite.key)}
        />
      )}
      {auth.bonus > 0 && !invite && <BonusPopup amount={auth.bonus} onClose={auth.clearBonus} />}
    </>
  );
}
