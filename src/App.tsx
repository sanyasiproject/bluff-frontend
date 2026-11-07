import { useEffect } from 'react';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { Table } from './components/Table';
import { Toasts } from './components/Toasts';
import { clearInvite } from './lib/invite';
import { useBluff } from './useBluff';

export default function App() {
  const { status, view, notes, replaced, actions } = useBluff();
  const inRoom = view !== null;

  // once inside a room the invite link has done its job
  useEffect(() => {
    if (inRoom) clearInvite();
  }, [inRoom]);

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
  } else if (!view) {
    screen = <Home status={status} actions={actions} />;
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
    </>
  );
}
