import { useEffect, useRef, useState } from 'react';
import { clearInvite, inviteCode } from '../lib/invite';
import { loadName, loadSavedSession, loadTabSession } from '../lib/storage';
import type { Auth } from '../useAuth';
import type { Actions, ConnStatus, PendingWatch } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { AccountSheet } from './AccountSheet';
import { ShineTitle, SuitDrift } from './Ambient';
import { GameHub } from './GameHub';
import { lastGame } from '../games/lastPlayed';
import { FriendsSheet } from './FriendsSheet';
import { HomeDock } from './HomeDock';
import { HomeNotice } from './HomeNotice';
import { OnlineList } from './OnlineFriends';
import { LangToggle } from './LangToggle';
import { Backdrop } from './Overlays';
import { PlayPanel } from './PlayPanel';
import { LessonChooser } from './tutorial/LessonOffer';
import { TutorialPage } from './tutorial/TutorialPage';
import { markTutorialSeen } from '../lib/tutorial';
import { APP_NAME, type GameKind } from '../types';

interface HomeProps {
  status: ConnStatus;
  connectionId: string | null;
  actions: Actions;
  auth: Auth;
  onOpenAdmin: () => void;
  /** asked to watch a game in progress; waiting for the host */
  pendingWatch: PendingWatch | null;
}

export function Home({ status, connectionId, actions, auth, onOpenAdmin, pendingWatch }: HomeProps) {
  const [name, setName] = useState(loadName);
  const [invite, setInvite] = useState(inviteCode);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  /** the Play panel; an invite link opens it straight away */
  const [play, setPlay] = useState(() => inviteCode() !== null);
  /** the game a new room starts in: the tapped tile, else the one played last */
  const [game, setGame] = useState<GameKind>(() => lastGame() ?? 'bluff');
  const openGame = (kind: GameKind) => {
    setGame(kind);
    setPlay(true);
  };
  const [friends, setFriends] = useState(false);
  const [accountSheet, setAccountSheet] = useState<'login' | 'register' | null>(null);
  /** How to play: choosing a lesson, then the lesson itself */
  const [chooser, setChooser] = useState(false);
  const [lesson, setLesson] = useState<GameKind | null>(null);
  const autoJoin = useRef<{ connectionId: string | null; tries: number }>({ connectionId: null, tries: 0 });
  const saved = loadSavedSession();
  const online = status === 'online';
  // logged-in players always play under their account name
  const playName = auth.user?.displayName ?? name.trim();
  // an admin turned guest play off: guests must log in before they can create or join a room
  const locked = !auth.user && auth.accountsOn === true && !auth.guestsAllowed && !auth.checking;
  const joinFriend = (userId: string, watch: boolean) => actions.joinFriend(userId, watch, auth.user?.displayName ?? name);

  // a sleeping free server needs up to a minute to wake up
  useEffect(() => {
    if (online) return;
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [online]);

  // waiting to watch: show the waiting card without a tap
  useEffect(() => {
    if (pendingWatch) setPlay(true);
  }, [pendingWatch !== null]);

  const go = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  // invite link: take back this phone's seat if it has one, otherwise join with the saved name.
  // One try per fresh connection (max 2), so a drop right after connecting gets a second go.
  useEffect(() => {
    const auto = autoJoin.current;
    if (!invite || !online || !connectionId || auth.checking || auto.connectionId === connectionId || auto.tries >= 2) return;
    auto.connectionId = connectionId;
    auto.tries++;
    if (loadTabSession()?.code === invite) return; // useBluff already rejoins this tab's seat
    void go(async () => {
      if (saved?.code === invite && (await actions.rejoinSaved()) !== null) return;
      // guests can't join while guest play is off; the home screen asks them to log in
      if (playName && !locked) await actions.join(invite, playName);
    });
  }, [invite, online, connectionId, auth.checking]);

  const serverStatus = online ? null : (
    <p className="server-status">
      <span className="dot" />
      {slow ? 'Waking up the server… this can take up to a minute after a break.' : 'Connecting…'}
    </p>
  );

  return (
    <main className="screen home">
      <SuitDrift />
      <header className="home-top">
        <LangToggle />
        <HomeNotice auth={auth} />
        <div className="home-corner">
          {/* the green count beside my profile: how many friends are online */}
          <AccountCorner auth={auth} onOpenAdmin={onOpenAdmin} onJoin={joinFriend} />
        </div>
      </header>

      {/* left of the stage: who's online now */}
      <OnlineList auth={auth} onOpen={() => setFriends(true)} />

      {/* centre stage: the title, Play, and a tile for every game */}
      <div className="home-stage hub-stage">
        <div className="hub-head">
          <div className="hero">
            <ShineTitle text={APP_NAME} />
            <p className="muted hero-tag">Your games, your friends, one baithak.</p>
          </div>
          <button className="btn primary shine home-play-btn" onClick={() => setPlay(true)}>
            <span aria-hidden>▶</span> Play
          </button>
          {pendingWatch ? (
            <button className="home-sub home-chip" onClick={() => setPlay(true)}>
              <span className="dot" /> Room <b>{pendingWatch.code}</b>
            </button>
          ) : (
            // offline, the server line takes this place (the rejoin would be disabled anyway)
            saved &&
            !invite &&
            online && (
              <button className="home-sub home-chip" disabled={!online || busy} onClick={() => go(actions.rejoinSaved)}>
                ↩ Rejoin room <b>{saved.code}</b>
              </button>
            )
          )}
        </div>
        <GameHub onPick={openGame} />
        {serverStatus && <div className="home-sub">{serverStatus}</div>}
      </div>

      {/* everything else: one row of round buttons */}
      <div className="home-bottom">
        <HomeDock auth={auth} online={online} onHowTo={() => setChooser(true)} onFriends={() => setFriends(true)} onLogin={() => setAccountSheet('login')} />
      </div>

      {play && (
        <Backdrop center onClose={() => setPlay(false)} panel="hp">
          <PlayPanel
            auth={auth}
            actions={actions}
            online={online}
            busy={busy}
            go={go}
            name={name}
            setName={setName}
            playName={playName}
            locked={locked}
            invite={invite}
            onDropInvite={() => {
              clearInvite();
              setInvite(null);
            }}
            pendingWatch={pendingWatch}
            serverStatus={serverStatus}
            onAccount={setAccountSheet}
            onHowTo={() => setChooser(true)}
            onClose={() => setPlay(false)}
            game={game}
          />
        </Backdrop>
      )}
      {friends && auth.user && <FriendsSheet auth={auth} onJoin={joinFriend} onClose={() => setFriends(false)} />}
      {accountSheet && <AccountSheet initial={accountSheet} auth={auth} onClose={() => setAccountSheet(null)} />}
      {chooser && (
        <LessonChooser
          onPick={(game) => {
            setChooser(false);
            setLesson(game);
          }}
          onClose={() => setChooser(false)}
        />
      )}
      {lesson && (
        // a lesson done from Home counts too, so the lobby won't offer it again
        <TutorialPage
          game={lesson}
          onDone={() => {
            markTutorialSeen(auth, lesson);
            setLesson(null);
          }}
          onClose={() => {
            markTutorialSeen(auth, lesson);
            setLesson(null);
          }}
        />
      )}
    </main>
  );
}
