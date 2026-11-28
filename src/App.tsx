import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Crazy7Table } from './components/Crazy7Table';
import { RangTable } from './components/RangTable';
import { Flyers } from './components/Flyers';
import { FriendOnline } from './components/FriendOnline';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { BonusPopup, InvitePopup } from './components/Popups';
import { Reactions } from './components/Reactions';
import { ShopFx } from './components/ShopFx';
import { RotateGate } from './components/RotateGate';
import { LiveVoiceSync } from './components/LiveVoice';
import { JoinAsks } from './components/JoinAsks';
import { Splash } from './components/Splash';
import { Table } from './components/Table';
import { Toasts } from './components/Toasts';
import { clearInvite } from './lib/invite';
import { useLook } from './lib/look';
import { autoPush } from './lib/push';
import { loadName } from './lib/storage';
import { useAuth } from './useAuth';
import { useBluff } from './useBluff';
import { useLandscape } from './lib/useLandscape';
import { PluggedTable } from './games/registry';
import { countPlayed, markPlayed } from './games/lastPlayed';
import { useSendLudoLook } from './games/ludo/looks';
import { isPlugged, levelOf } from './types';

/** moves the table already shows; in a landscape game they go to the info panel's log, not a pop-up */
const QUIET_IN_GAME = ['play', 'pass', 'round', 'room', 'chat', 'bluff'];

export default function App() {
  const { status, connectionId, roomKey, view, notes, reactions, bubbles, flyers, invites, replaced, pendingWatch, nudged, actions } = useBluff();
  const auth = useAuth();
  const land = useLandscape();
  // the table theme and card back this player picked
  useLook(auth);
  // my Ludo gotis, dice and board go to the room so everyone sees them
  useSendLudoLook(view ? roomKey : null, auth.user ? levelOf(auth.user.stats) : 1, actions.ludoLook);
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

  // the home grid marks the game this phone played last
  const playingGame = view?.phase === 'playing' ? view.config.game : null;
  useEffect(() => {
    if (!playingGame) return;
    markPlayed(playingGame);
    countPlayed(playingGame);
  }, [playingGame]);

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
    screen = <Lobby view={view} actions={actions} auth={auth} nudged={nudged} />;
  } else if (isPlugged(view.config.game)) {
    // registry games (Ludo, ...): one route for all of them
    screen = <PluggedTable kind={view.config.game} view={view} actions={actions} bubbles={bubbles} auth={auth} notes={notes} />;
  } else if (view.config.game === 'rang') {
    screen = <RangTable view={view} actions={actions} bubbles={bubbles} auth={auth} notes={notes} />;
  } else if (view.config.game === 'crazy7') {
    screen = <Crazy7Table view={view} actions={actions} bubbles={bubbles} auth={auth} notes={notes} />;
  } else {
    screen = <Table view={view} actions={actions} bubbles={bubbles} auth={auth} notes={notes} />;
  }

  const invite = invites[invites.length - 1];
  const seatedInGame = view?.phase === 'playing' && view.players.some((p) => p.id === view.meId);

  return (
    <>
      {screen}
      {/* shop win bursts and entry flashes, for both games and the lobby */}
      <ShopFx view={replaced ? null : view} />
      {view && !replaced && status !== 'online' && <div className="conn-pill">Reconnecting…</div>}
      {/* sideways at a table: only errors and big moments pop up; every move is in the table info panel */}
      <Toasts notes={land && view?.phase === 'playing' ? notes.filter((n) => QUIET_IN_GAME.indexOf(n.kind) === -1) : notes} />
      <Reactions items={reactions} />
      <LiveVoiceSync view={replaced ? null : view} />
      {/* people asking me to let them in, top right on any screen */}
      <JoinAsks view={replaced ? null : view} onAnswer={actions.admit} />
      <Flyers items={flyers} onDone={actions.dropFlyer} />
      <FriendOnline auth={auth} inLobby={view?.phase === 'lobby'} onInvite={actions.invite} />
      {invite && (
        <InvitePopup
          invite={invite}
          inGame={seatedInGame}
          onJoin={() => void actions.acceptInvite(invite, auth.user?.displayName ?? loadName())}
          onIgnore={() => actions.dismissInvite(invite.key)}
        />
      )}
      {auth.bonus > 0 && !invite && <BonusPopup amount={auth.bonus} streak={auth.user?.loginStreak} onClose={auth.clearBonus} />}
      {/* phones held upright: turn sideways (shown by CSS only in portrait on touch screens) */}
      <RotateGate />
    </>
  );
}
