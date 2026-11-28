import { useEffect, useRef, useState } from 'react';
import { clearInvite, inviteCode, invitePin } from '../lib/invite';
import { loadName, loadSavedSession, loadTabSession } from '../lib/storage';
import type { Auth } from '../useAuth';
import type { Actions, ConnStatus, PendingWatch } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { AccountSheet } from './AccountSheet';
import { BaithakLogo, BaithakWordmark } from '../art/BaithakLogo';
import { APP_FULL_NAME } from '../art/appVariant';
import { HomeFeatured, featuredGame } from './HomeFeatured';
import { GameHub } from './GameHub';
import { lastGame } from '../games/lastPlayed';
import { prefetchFavourites, prefetchTable, whenIdle } from '../games/tableLoaders';
import { FriendsSheet } from './FriendsSheet';
import { HomeDock } from './HomeDock';
import { HomeNotice } from './HomeNotice';
import { OnlineList } from './OnlineFriends';
import { LangToggle } from './LangToggle';
import { Backdrop } from './Overlays';
import { PlayPanel } from './PlayPanel';
import { OfflineEntry } from '../offline/OfflineEntry';
import { SERVER_URL } from '../lib/socket';
import { LessonChooser } from './tutorial/LessonOffer';
import { TutorialPage } from './tutorial/TutorialPage';
import { markTutorialSeen } from '../lib/tutorial';
import type { GameKind } from '../types';

interface HomeProps {
  status: ConnStatus;
  connectionId: string | null;
  actions: Actions;
  auth: Auth;
  onOpenAdmin: () => void;
  /** asked to watch a game in progress; waiting for the host */
  pendingWatch: PendingWatch | null;
  /** opens offline pass-and-play */
  onOffline?: () => void;
}

export function Home({ status, connectionId, actions, auth, onOpenAdmin, pendingWatch, onOffline }: HomeProps) {
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
  /** the banner's game, picked once per visit */
  const [featured] = useState<GameKind>(featuredGame);
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

  // once home is idle, fetch the tables this phone plays most; a picked game's table as soon as it's picked
  useEffect(() => whenIdle(prefetchFavourites), []);
  useEffect(() => {
    if (play) prefetchTable(game);
  }, [play, game]);

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
      if (playName && !locked) await actions.join(invite, playName, invitePin());
    });
  }, [invite, online, connectionId, auth.checking]);

  // no connection at all: the offline entry says it, no "waking up" line
  const [netDown, setNetDown] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setNetDown(navigator.onLine === false);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  // a sleeping server answers slowly; no network fails at once (some phones still say onLine)
  useEffect(() => {
    if (online) return setNetDown(navigator.onLine === false);
    let live = true;
    const probe = () => {
      const t0 = Date.now();
      fetch(`${SERVER_URL}/health`, { cache: 'no-store', signal: AbortSignal.timeout?.(4000) }).then(
        () => live && setNetDown(false),
        (e: unknown) => live && setNetDown(navigator.onLine === false || (e instanceof TypeError && Date.now() - t0 < 1500)),
      );
    };
    probe();
    const t = window.setInterval(probe, 5000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [online]);

  const serverStatus = online || netDown ? null : (
    <p className="server-status">
      <span className="dot" />
      {slow ? 'Waking up the server… this can take up to a minute after a break.' : 'Connecting…'}
    </p>
  );

  return (
    <main className="screen home nt-night nt-home">
      <header className="home-top">
        <div className="nt-brand" aria-label={APP_FULL_NAME}>
          <BaithakLogo size={40} className="nt-brand-logo" />
          <BaithakWordmark size={26} className="nt-brand-word" showVariant />
        </div>
        <HomeNotice auth={auth} />
        <div className="home-corner">
          <LangToggle />
          {/* the green count beside my profile: how many friends are online */}
          <AccountCorner auth={auth} onOpenAdmin={onOpenAdmin} onJoin={joinFriend} showLevel />
        </div>
      </header>

      {/* the stage: the featured game on the left, every game's tile on the right */}
      <div className="home-stage hub-stage nt-stage">
        <HomeFeatured
          kind={featured}
          onPlay={() => openGame(featured)}
          onCode={() => setPlay(true)}
          chip={
            pendingWatch ? (
              <button className="home-sub home-chip" onClick={() => setPlay(true)}>
                <span className="dot" /> Room <b>{pendingWatch.code}</b>
              </button>
            ) : (
              // offline, the server line takes this place (the rejoin would be disabled anyway)
              saved &&
              !invite &&
              online && (
                <button className="home-sub home-chip" disabled={!online || busy} onClick={() => go(actions.rejoinSaved)}>
                  ↩ Rejoin <b>{saved.code}</b>
                </button>
              )
            )
          }
        />
        <div className="nt-side">
          <GameHub onPick={openGame} />
          {serverStatus && <div className="home-sub">{serverStatus}</div>}
          {/* pass-and-play on this phone; big when the server can't be reached */}
          {onOffline && <OfflineEntry big={(!online && slow) || netDown} onOpen={onOffline} />}
          {/* wide screens: who's online now */}
          <OnlineList auth={auth} onOpen={() => setFriends(true)} />
        </div>
      </div>

      {/* everything else: one floating dock */}
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
