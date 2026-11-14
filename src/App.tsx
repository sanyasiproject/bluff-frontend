import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Crazy7Table } from './components/Crazy7Table';
import { Flyers } from './components/Flyers';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { BonusPopup, InvitePopup } from './components/Popups';
import { Reactions } from './components/Reactions';
import { Splash } from './components/Splash';
import { Table } from './components/Table';
import { Toasts } from './components/Toasts';
import { clearInvite } from './lib/invite';
import { useLook } from './lib/look';
import { autoPush } from './lib/push';
import { loadName } from './lib/storage';
import { useAuth } from './useAuth';
import { useBluff } from './useBluff';

export default function App() {
  const { status, connectionId, view, notes, reactions, bubbles, flyers, invites, replaced, pendingWatch, actions } = useBluff();
  const auth = useAuth();
  // the table theme and card back this player picked
  useLook(auth);
  const [adminOpen, setAdminOpen] = useState(false);
  // the intro stays until the server first answers and a saved login is checked, and at least a moment
  const [booted, setBooted] = useState(false);
  const [introShown, setIntroShown] = useState(false);
  const inRoom = view !== null;
  const { refresh } = auth;
  const settled = view?.coinResults != null;

  useEffect(() => {
    const t = setTimeout(() => setIntroShown(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status === 'online' && !auth.checking && introShown) setBooted(true);
  }, [status, auth.checking, introShown]);

  // once inside a room the invite link has done its job
  useEffect(() => {
    if (inRoom) clearInvite();
  }, [inRoom]);

  // invite notifications are on by default: a phone that already allows them is signed up without asking
  const userId = auth.user?.id ?? null;
  useEffect(() => {
    if (userId && auth.pushInvites === true) void autoPush(auth.token, userId);
  }, [userId, auth.pushInvites, auth.token]);

  // coins and stats change when a game is settled; show the new numbers
  useEffect(() => {
    if (settled) void refresh();
  }, [settled, refresh]);

  let screen;
  if (!booted && !replaced) {
    screen = <Splash status={status} />;
  } else if (replaced) {
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
      <Home
        status={status}
        connectionId={connectionId}
        actions={actions}
        auth={auth}
        onOpenAdmin={() => setAdminOpen(true)}
        pendingWatch={pendingWatch}
      />
    );
  } else if (view.phase === 'lobby') {
    screen = <Lobby view={view} actions={actions} auth={auth} />;
  } else if (view.config.game === 'crazy7') {
    screen = <Crazy7Table view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  } else {
    screen = <Table view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  }

  const invite = invites[invites.length - 1];
  const seatedInGame = view?.phase === 'playing' && view.players.some((p) => p.id === view.meId);

  return (
    <>
      {screen}
      {view && !replaced && status !== 'online' && <div className="conn-pill">Reconnecting…</div>}
      <Toasts notes={notes} />
      <Reactions items={reactions} />
      <Flyers items={flyers} onDone={actions.dropFlyer} />
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
