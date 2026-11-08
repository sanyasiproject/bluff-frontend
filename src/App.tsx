import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Reactions } from './components/Reactions';
import { Table } from './components/Table';
import { Toasts } from './components/Toasts';
import { clearInvite } from './lib/invite';
import { useAuth } from './useAuth';
import { useBluff } from './useBluff';

export default function App() {
  const { status, connectionId, view, notes, reactions, replaced, actions } = useBluff();
  const auth = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);
  const inRoom = view !== null;
  const { refresh } = auth;

  // once inside a room the invite link has done its job
  useEffect(() => {
    if (inRoom) clearInvite();
  }, [inRoom]);

  // the server saves the game in the background; then show the new stats
  useEffect(() => {
    if (view?.phase !== 'over') return;
    const t = setTimeout(() => void refresh(), 1500);
    return () => clearTimeout(t);
  }, [view?.phase, refresh]);

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
    screen = <Lobby view={view} actions={actions} />;
  } else {
    screen = <Table view={view} actions={actions} />;
  }

  return (
    <>
      {screen}
      {view && !replaced && status !== 'online' && <div className="conn-pill">Reconnecting…</div>}
      <Toasts notes={notes} />
      <Reactions items={reactions} />
    </>
  );
}
