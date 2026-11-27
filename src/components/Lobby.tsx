import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { api, errorText } from '../lib/api';
import { useBack } from '../lib/back';
import { cx } from '../lib/cards';
import { socket } from '../lib/socket';
import { formatCoins, compactCoins } from '../lib/coins';
import { markTutorialSeen, tutorialSeen } from '../lib/tutorial';
import { useLandscape } from '../lib/useLandscape';
import {
  gameInfo,
  isPlugged,
  RANK_DIVISIONS,
  rankName,
  type FriendsResponse,
  type FriendView,
  type GameConfig,
  type GameKind,
  type PublicPlayer,
  type RoomView,
} from '../types';
import { StreakMark } from './TurnTimer';
import { LobbyRoom } from './LobbyRoom';
import { lobbyTabs, SettingsBody, type LobbyTab } from './LobbySettings';

import type { Auth } from '../useAuth';
import type { Actions, Nudged } from '../useBluff';
import { BuzzButton, NudgeBanner } from './LobbyNudge';
import { AccountCorner } from './AccountCorner';
import { ConfirmBox } from './ConfirmBox';
import { SuitDrift } from './Ambient';
import { FriendsSheet } from './FriendsSheet';
import { InvitePanel } from './InvitePanel';
import { LevelBadge } from './LevelBadge';
import { SazaTag } from './Saza';
import { Backdrop } from './Overlays';
import { PlayerSheet } from './PlayerSheet';
import { QuickChat } from './QuickChat';
import { LessonOffer } from './tutorial/LessonOffer';
import { TutorialPage } from './tutorial/TutorialPage';
import { Avatar } from './Avatar';
import { LiveMark, LiveVoiceButtons, LiveVoiceNotice } from './LiveVoice';
import { useOnlineFriends } from '../lib/onlineFriends';
import { MuteMark } from './MuteButton';

/** a player's division and tier, small, for lobby rows at a ranked table */
function RankMini({ rank }: { rank: NonNullable<PublicPlayer['rank']> }) {
  const d = RANK_DIVISIONS.find((x) => x.id === rank.division) ?? RANK_DIVISIONS[0];
  return (
    <span className={cx('rank-mini', `rank-${d.id}`)}>
      {d.emoji} {rankName(rank.points, d.id)}
    </span>
  );
}

/** the gold strip at the top of a ranked lobby: what it is, and where you stand */
function RankedBanner({ view }: { view: RoomView }) {
  const me = view.players.find((p) => p.id === view.meId);
  const d = me?.rank ? (RANK_DIVISIONS.find((x) => x.id === me.rank!.division) ?? RANK_DIVISIONS[0]) : null;
  return (
    <section className={cx('mode-banner ranked', d && `rank-${d.id}`)}>
      <b>🏅 RANKED GAME</b>
      <span>
        {me?.rank && d ? `You: ${d.emoji} ${rankName(me.rank.points, d.id)} · win to climb` : me ? 'Log in to play ranked' : 'Watching a ranked game'}
      </span>
    </section>
  );
}

const TEAM_SLOTS: { team: 'a' | 'b'; label: string; slots: [number, number] }[] = [
  { team: 'a', label: '🔵 Team blue', slots: [0, 2] },
  { team: 'b', label: '🟠 Team orange', slots: [1, 3] },
];

/** 2v2: two teams of two slots; take an empty slot, or ask someone to swap with you */
function TeamSlots({ view, actions, isHost }: { view: RoomView; actions: Actions; isHost: boolean }) {
  const slots = view.slots ?? [null, null, null, null];
  const iPlay = view.players.some((p) => p.id === view.meId);
  const name = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  const asked = (id: string) => view.swapAsks.some((a) => a.fromId === view.meId && a.toId === id);

  const slot = (s: number) => {
    const id = slots[s];
    if (!id) {
      return (
        <li key={s} className="team-slot empty">
          {iPlay ? (
            <button className="link-btn" onClick={() => void actions.moveToSlot(s)}>
              + Take this slot
            </button>
          ) : (
            <span className="muted small">Empty</span>
          )}
        </li>
      );
    }
    const me = id === view.meId;
    return (
      <li key={s} className={cx('team-slot', me && 'mine')}>
        <span className="grow">
          {name(id)}
          {me && <span className="muted"> (you)</span>}
        </span>
        {!me && iPlay && (
          <button className="btn small ghost" disabled={asked(id)} onClick={() => void actions.askSwap(id)}>
            {asked(id) ? 'Asked…' : '🔄 Swap'}
          </button>
        )}
      </li>
    );
  };

  return (
    <section className="panel">
      <h2 className="section-title">
        Teams <span className="muted">2 vs 2</span>
      </h2>
      <div className="team-columns">
        {TEAM_SLOTS.map((t) => (
          <div key={t.team} className={cx('team-col', `team-${t.team}`)}>
            <p className="team-col-title">{t.label}</p>
            <ul className="team-slot-list">{t.slots.map(slot)}</ul>
          </div>
        ))}
      </div>
      <p className="muted small">Tap an empty slot to join that team, or 🔄 Swap to ask someone to trade places.</p>
      {isHost && slots.every(Boolean) && (
        <button className="btn small ghost" onClick={() => void actions.shuffleTeams()}>
          🔀 Shuffle teams
        </button>
      )}
    </section>
  );
}

/** someone asked to swap places with me: accept or say no */
function SwapPopup({ view, actions }: { view: RoomView; actions: Actions }) {
  const ask = view.swapAsks.find((a) => a.toId === view.meId);
  if (!ask || !view.slots) return null;
  const name = (id: string | null) => view.players.find((p) => p.id === id)?.name ?? '?';
  const theirSlot = view.slots.indexOf(ask.fromId);
  // after the swap I sit in their slot; my partner is whoever holds the slot opposite it
  const partner = view.slots[(theirSlot + 2) % 4];
  const team = theirSlot % 2 === 0 ? '🔵 blue' : '🟠 orange';
  return (
    <Backdrop center onClose={() => void actions.answerSwap(ask.fromId, false)}>
      <div className="confirm-box">
        <h3>🔄 {name(ask.fromId)} wants to swap places</h3>
        <p className="muted">
          You'd join team {team}
          {partner && partner !== view.meId ? ` with ${name(partner)}` : ''}.
        </p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={() => void actions.answerSwap(ask.fromId, false)}>
            No thanks
          </button>
          <button className="btn primary" onClick={() => void actions.answerSwap(ask.fromId, true)}>
            Swap
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

/** 5 players + 7 watchers, same limit as the server */
const ROOM_LIMIT = 12;

const names = (players: PublicPlayer[]) => players.map((p) => p.name).join(', ');

export function Lobby({ view, actions, auth, nudged = null }: { view: RoomView; actions: Actions; auth: Auth; nudged?: Nudged | null }) {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const friendsNow = useOnlineFriends(auth.user ? auth.token : null);
  const isHost = view.hostId === view.meId;
  // anyone can sit out and watch, or take a free seat again
  const meWatching = view.watchers.find((w) => w.id === view.meId);
  // the game's own seat limit (Ludo 4), never above the room's 5
  const maxSeats = Math.min(5, gameInfo(view.config.game).maxPlayers);
  const seatsFull = view.players.length >= maxSeats;
  // back from the lobby leaves the room, like the Leave button
  useBack(() => void actions.leave());
  const me = [...view.players, ...view.watchers].find((p) => p.id === view.meId);
  // taps the server hasn't echoed yet, so quick taps in a row don't undo each other
  const pending = useRef<{ patch: Partial<GameConfig>; at: number }>({ patch: {}, at: 0 });
  const set = (patch: Partial<GameConfig>) => {
    const now = Date.now();
    const kept = now - pending.current.at < 3000 ? pending.current.patch : {};
    pending.current = { patch: { ...kept, ...patch }, at: now };
    actions.setConfig({ ...view.config, ...pending.current.patch });
  };
  const coinsOn = auth.accountsOn === true;
  const crazy7 = view.config.game === 'crazy7';
  const rang = view.config.game === 'rang';
  // Bluff's own settings (ranked, teams, twists…) only show for Bluff
  const plugged = isPlugged(view.config.game);
  const isBluff = !crazy7 && !rang && !plugged;
  // 2v2 is for Bluff, Rang and catalog games with teams
  const teamGame = view.config.teams && !crazy7 && gameInfo(view.config.game).teams;
  // practice lessons: offered once the first time someone plays a game, open any time from How to play
  const [lesson, setLesson] = useState<GameKind | null>(null);
  const [, setSeenTick] = useState(0);
  // Rang has no practice lesson yet
  const offerLesson = !auth.checking && !lesson && view.config.game !== 'rang' && !tutorialSeen(auth, view.config.game);
  const lessonSeen = (game: GameKind) => {
    markTutorialSeen(auth, game);
    setSeenTick((n) => n + 1);
  };

  const stake = view.config.stake;
  const pot = stake * view.players.length;
  const bots = view.players.filter((p) => p.bot);
  // a rated Bluff table (Crazy 7 keeps the setting but ignores it); older servers don't have it
  const rankedKnown = typeof view.config.ranked === 'boolean';
  const ranked = isBluff && view.config.ranked === true;
  // ranked needs everyone seated logged in, at any stake
  const mustLogIn = stake > 0 || ranked;
  const rankedGuests = ranked ? view.players.filter((p) => !p.registered && !p.bot) : [];
  const guests = stake > 0 ? view.players.filter((p) => !p.registered && !p.bot) : [];
  const short = stake > 0 ? view.players.filter((p) => p.registered && (p.coins ?? 0) < stake) : [];
  // people who haven't tapped I'm ready (the host, bots and older apps always count as ready)
  const notReady = view.players.filter((p) => !p.bot && p.id !== view.hostId && !p.ready);
  const startBlock =
    view.players.length < 2 && gameInfo(view.config.game).minPlayers <= 2
      ? 'Need at least 2 players'
      : view.players.length < gameInfo(view.config.game).minPlayers
        ? `${gameInfo(view.config.game).name} needs exactly ${gameInfo(view.config.game).minPlayers} players: add bots to fill the seats`
      : bots.length === view.players.length
        ? 'Someone has to play with the bots'
      : view.players.length > maxSeats
        ? `${gameInfo(view.config.game).name} is for up to ${maxSeats} players: move someone to watching`
      : teamGame && view.players.length !== 4
        ? 'Teams need exactly 4 players'
        : rankedGuests.length > 0
        ? `Ranked games need everyone logged in: ${names(rankedGuests)}`
        : guests.length > 0
        ? `${names(guests)} must log in to play for coins`
        : short.length > 0
          ? `${names(short)} ${short.length > 1 ? "don't" : "doesn't"} have 🪙 ${formatCoins(stake)}`
          : notReady.length > 0
            ? `⏳ Waiting for ${names(notReady)} to tap I'm ready`
            : null;
  const seated = view.players.find((p) => p.id === view.meId);
  // host's Start waits only on people not ready: offer the buzz
  const readyBlocked = isHost && notReady.length > 0 && !!startBlock?.startsWith('⏳');
  // the buzz banner shows until I'm ready (or close it); gone when I leave the lobby
  const showNudge = !!nudged && !isHost && !!seated && !seated.ready;
  useEffect(() => {
    if (nudged && !showNudge) actions.clearNudge();
  }, [nudged?.key, showNudge]);
  useEffect(() => () => actions.clearNudge(), []);

  // friend status of everyone here, so logged-in players can add each other from the lobby
  const [links, setLinks] = useState<FriendsResponse | null>(null);
  const loadLinks = useCallback(async () => {
    if (!auth.user) {
      setLinks(null);
      return;
    }
    try {
      setLinks(await api<FriendsResponse>('/friends', { token: auth.token }));
    } catch {
      // the buttons just stay hidden
    }
  }, [auth.token, auth.user?.id]);
  const people = view.players.length + view.watchers.length;
  // read again when someone comes or goes
  useEffect(() => {
    void loadLinks();
  }, [loadLinks, people]);
  // the server says when a request is sent, accepted or removed, so there's no need to keep asking; after a reconnect, read once more
  useEffect(() => {
    const reload = () => void loadLinks();
    socket.on('friends:changed', reload);
    socket.on('connect', reload);
    return () => {
      socket.off('friends:changed', reload);
      socket.off('connect', reload);
    };
  }, [loadLinks]);

  const befriend = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      actions.toast(done);
    } catch (err) {
      actions.toast(errorText(err));
    }
    await loadLinks();
  };

  const friendButton = (memberId: string, username: string | null) => {
    if (!links || !username || memberId === view.meId) return null;
    const find = (list: FriendView[]) => list.find((f) => f.username === username);
    if (find(links.friends)) return <span className="tag dim">👥 Friend</span>;
    if (find(links.outgoing)) return <span className="tag dim">Requested</span>;
    const asked = find(links.incoming);
    if (asked) {
      return (
        <button
          className="btn small primary friend-btn"
          onClick={() =>
            void befriend(
              () => api(`/friends/${asked.id}/accept`, { method: 'POST', token: auth.token }),
              `You and ${asked.displayName} are now friends 🎉`,
            )
          }
        >
          Accept
        </button>
      );
    }
    return (
      <button
        className="btn small ghost friend-btn"
        aria-label={`Add @${username} as a friend`}
        onClick={() =>
          void befriend(() => api('/friends/request', { body: { username }, token: auth.token }), `Friend request sent to @${username}`)
        }
      >
        + Add
      </button>
    );
  };

  // tapping someone opens their profile; the host also gets Make host and Remove there
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirmHost, setConfirmHost] = useState(false);
  const viewing = viewingId ? [...view.players, ...view.watchers].find((p) => p.id === viewingId) : undefined;
  const openPlayer = (id: string) => {
    setConfirmHost(false);
    setViewingId(id);
  };

  // joining a friend's room gives up this one
  const joinFriend = (userId: string, watch: boolean) => actions.joinFriend(userId, watch, me?.name ?? '');

  // removing someone asks first, in the app
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const remove = (id: string, name: string) => setRemoving({ id, name });

  const removeButton = (id: string, name: string) =>
    isHost && id !== view.meId ? (
      <button className="remove-btn" aria-label={`Remove ${name}`} onClick={() => remove(id, name)}>
        ✕
      </button>
    ) : null;

  // landscape: the room is the 3D table (LobbyRoom); settings sit in a side drawer with tabs
  const land = useLandscape();
  const hasStakes = coinsOn || ((isBluff || plugged) && bots.length > 0);
  const tabs = lobbyTabs(isHost, coinsOn, hasStakes);
  const [tabPick, setTabPick] = useState<LobbyTab>('game');
  const tab = tabs.some(([t]) => t === tabPick) ? tabPick : 'game';
  // 2v2 seats four
  const seatCap = teamGame ? 4 : maxSeats;
  const canInvite = people < ROOM_LIMIT;
  const friendsOnline = friendsNow ? friendsNow.filter((f) => f.online && f.inRoom !== 'here').length : 0;

  const modeBanner =
    rankedKnown && isBluff && (ranked ? <RankedBanner view={view} /> : <p className="mode-banner casual">🎮 Casual game · no rank points</p>);

  const liveVoice = (
    <>
      {/* live voice for seated players; a row of its own, since the header is full */}
      {view.config.voice && view.players.some((p) => p.id === view.meId && p.registered) && (
        <section className="live-voice-row">
          <span className="grow">
            🎧 Live voice
            <small>{view.players.filter((p) => p.live).length > 0 ? ` · ${view.players.filter((p) => p.live).length} in` : ' · players only'}</small>
          </span>
          <LiveVoiceButtons view={view} onToast={actions.toast} wide />
        </section>
      )}
      <LiveVoiceNotice />
    </>
  );

  const invite = canInvite && (
    <InvitePanel
      code={view.code}
      onToast={actions.toast}
      onFriends={auth.user ? () => setFriendsOpen(true) : undefined}
      requests={auth.friendRequests}
      online={friendsOnline}
    />
  );

  const modeRow = (
    <section className="mode-row">
      <span className="grow">{meWatching ? "You're watching" : "You're playing"}</span>
      <div className="mini-seg" role="group" aria-label="Play or watch">
        <button
          className={cx(!meWatching && 'on')}
          aria-pressed={!meWatching}
          disabled={!!meWatching && seatsFull}
          onClick={() => meWatching && void actions.setWatching(false)}
        >
          🎮 Play
        </button>
        <button className={cx(meWatching && 'on')} aria-pressed={!!meWatching} onClick={() => !meWatching && void actions.setWatching(true)}>
          👀 Watch
        </button>
      </div>
    </section>
  );

  const leaveButton = (
    <button className="btn ghost leave-btn" onClick={actions.leave}>
      Leave
    </button>
  );

  // host: Start; seated players: I'm ready; watchers: waiting for the host
  const mainButton = isHost ? (
    <>
      {readyBlocked && <BuzzButton actions={actions} waiting={notReady.length} />}
      <button className={cx('btn primary grow', startBlock === null ? 'shine' : 'blocked')} disabled={startBlock !== null} onClick={actions.start}>
        {startBlock === null
          ? `Start · ${view.players.length} players${stake > 0 ? ` · 🪙 ${compactCoins(pot)}` : ''}`
          : readyBlocked
            ? `⏳ ${notReady.length} not ready`
            : '🔒 Start game'}
      </button>
    </>
  ) : seated ? (
    seated.ready ? (
      // ready: tapping again asks everyone to wait a minute
      <button className="btn ready-btn grow" onClick={() => void actions.setReady(false)}>
        <span>✅ You're ready</span>
        <small>Waiting for the host · tap to wait</small>
      </button>
    ) : (
      <button className={cx('btn primary grow shine ready-go', showNudge && 'nudge-glow')} onClick={() => void actions.setReady(true)}>
        <span>👍 I'm ready</span>
        <small>Host starts when all are ready</small>
      </button>
    )
  ) : (
    <p className="waiting grow">
      ⏳ Waiting for the host to start
      <span className="dots" aria-hidden>
        <i>.</i>
        <i>.</i>
        <i>.</i>
      </span>
    </p>
  );

  const settingsBody = (t: LobbyTab | null) => (
    <SettingsBody view={view} isHost={isHost} coinsOn={coinsOn} tab={t} set={set} onLesson={setLesson} />
  );

  // sheets and popups both layouts share
  const overlays = (
    <>
      {showNudge && nudged && <NudgeBanner key={nudged.key} nudged={nudged} onClose={actions.clearNudge} />}
      {viewing && (
        <PlayerSheet
          auth={auth}
          name={viewing.name}
          username={viewing.username}
          level={viewing.level}
          avatar={viewing.avatar}
          memberId={viewing.id}
          onThrow={viewing.id !== view.meId ? (i) => void actions.throwAt(viewing.id, i) : undefined}
          onClose={() => setViewingId(null)}
        >
          {isHost && viewing.id !== view.meId && (
            <div className="host-tools">
              <p className="label">Host tools</p>
              {confirmHost ? (
                <div className="confirm-inline">
                  <p>Make {viewing.name} the host? You'll lose the host controls.</p>
                  <div className="confirm-actions">
                    <button className="btn ghost" onClick={() => setConfirmHost(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => {
                        setViewingId(null);
                        void actions.makeHost(viewing.id);
                      }}
                    >
                      Make host
                    </button>
                  </div>
                </div>
              ) : (
                <div className="menu-buttons">
                  <button className="btn block" disabled={!viewing.connected} onClick={() => setConfirmHost(true)}>
                    👑 Make {viewing.name} the host
                  </button>
                  {!viewing.connected && <p className="muted small">They're offline, so they can't be the host right now.</p>}
                  {view.watchers.some((w) => w.id === viewing.id) ? (
                    <button className="btn block" disabled={seatsFull} onClick={() => void actions.setWatching(false, viewing.id)}>
                      🎮 Move to playing{seatsFull ? ` · all ${maxSeats} seats taken` : ''}
                    </button>
                  ) : (
                    <button className="btn block" onClick={() => void actions.setWatching(true, viewing.id)}>
                      👀 Move to watching
                    </button>
                  )}
                  <button
                    className="btn block ghost danger-text"
                    onClick={() => {
                      setViewingId(null);
                      remove(viewing.id, viewing.name);
                    }}
                  >
                    Remove from room
                  </button>
                </div>
              )}
            </div>
          )}
        </PlayerSheet>
      )}
      <SwapPopup view={view} actions={actions} />
      {removing && (
        <ConfirmBox
          title={`Remove ${removing.name} from the room?`}
          body="They can join again with the room code."
          action="Remove"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const id = removing.id;
            setRemoving(null);
            void actions.kick(id);
          }}
        />
      )}
      {friendsOpen && (
        <FriendsSheet auth={auth} roomCode={view.code} onInvite={actions.invite} onJoin={joinFriend} onClose={() => setFriendsOpen(false)} />
      )}
      {offerLesson && <LessonOffer game={view.config.game} onPractice={() => setLesson(view.config.game)} onSkip={() => lessonSeen(view.config.game)} />}
      {lesson && (
        // finishing, skipping or backing out all count as seen; a game starting closes it without counting
        <TutorialPage
          game={lesson}
          onDone={() => {
            lessonSeen(lesson);
            setLesson(null);
          }}
          onClose={() => {
            lessonSeen(lesson);
            setLesson(null);
          }}
        />
      )}
    </>
  );

  if (land) {
    return (
      <LobbyRoom
        friendsOpen={friendsOpen}
        view={view}
        actions={actions}
        auth={auth}
        isHost={isHost}
        tabs={tabs}
        tab={tab}
        onTab={setTabPick}
        banner={modeBanner || null}
        settings={settingsBody(tab)}
        seatCap={seatCap}
        teamGame={teamGame}
        ranked={ranked}
        mustLogIn={mustLogIn}
        coinsOn={coinsOn}
        watching={!!meWatching}
        watchNote={
          meWatching ? (!meWatching.byChoice ? 'Seats are full · you get the next free one' : seatsFull ? `All ${maxSeats} seats are taken right now` : null) : null
        }
        seatsFull={seatsFull}
        canAddBot={isHost && !seatsFull && people < ROOM_LIMIT}
        startBlock={startBlock}
        leaveButton={leaveButton}
        modeRow={modeRow}
        mainButton={mainButton}
        invite={invite || null}
        onPlayer={openPlayer}
        onRemove={remove}
        onJoinFriend={joinFriend}
      >
        {overlays}
      </LobbyRoom>
    );
  }

  return (
    <main className="screen lobby">
      <SuitDrift />
      <header className="lobby-head">
        <div className="grow">
          <p className="label">Room code</p>
          <p className="room-code" aria-label={view.code}>
            {[...view.code].map((ch, i) => (
              <span key={i} aria-hidden style={{ '--i': i } as CSSProperties}>
                {ch}
              </span>
            ))}
          </p>
        </div>
        <QuickChat onSend={actions.chat} view={view} />
        <AccountCorner auth={auth} roomCode={view.code} onInvite={actions.invite} onJoin={joinFriend} showOnline={false} />
      </header>

      {/* everyone sees at a glance whether this table is ranked or just for fun (older servers: nothing) */}
      {modeBanner}
      {liveVoice}
      {invite}
      {modeRow}

      <section className="panel">
        <h2 className="section-title">
          Players{' '}
          <span key={view.players.length} className="muted bump">
            {view.players.length}/{maxSeats}
          </span>
        </h2>
        <ul className="player-list">
          {view.players.map((p) =>
            p.bot ? (
              <li key={p.id} className="player-row bot-row">
                <span className="row-open">
                  <Avatar name={p.name} bot size="sm" member={p.id} />
                  <span className="grow">
                    <span data-no-translate>{p.name}</span> <SazaTag badge={p.saza} />
                  </span>
                </span>
                <span className="tag dim">Bot</span>
                {removeButton(p.id, p.name)}
              </li>
            ) : (
            <li key={p.id} className={cx('player-row', !p.connected && 'offline')}>
              <button type="button" className="row-open" aria-label={`${p.name}'s profile`} onClick={() => openPlayer(p.id)}>
                <Avatar name={p.name} avatar={p.avatar} size="sm" member={p.id}>
                  <LiveMark player={p} />
                </Avatar>
                <span className="grow">
                  <span data-no-translate>{p.name}</span>
                  {p.id === view.meId && <span className="muted"> (you)</span>} <LevelBadge level={p.level} /> <SazaTag badge={p.saza} /> <StreakMark player={p} /> <MuteMark player={p} />
                  {ranked && p.rank && <RankMini rank={p.rank} />}
                  {coinsOn && (
                    <span className={cx('player-coins', ((!p.registered && mustLogIn) || (stake > 0 && (p.coins ?? 0) < stake)) && 'warn')}>
                      {p.registered ? `🪙 ${compactCoins(p.coins ?? 0)}` : 'guest'}
                      {mustLogIn && !p.registered && ' · must log in'}
                      {stake > 0 && p.registered && (p.coins ?? 0) < stake && ' · not enough'}
                    </span>
                  )}
                  {/* everyone but the host says when they're ready to start */}
                  {p.id !== view.hostId && (
                    <span className={cx('player-ready', p.ready ? 'yes' : 'no')}>{p.ready ? '✅ Ready' : '⏳ Not ready'}</span>
                  )}
                </span>
              </button>
              {p.id === view.hostId && <span className="tag">Host</span>}
              {!p.connected && <span className="tag dim">offline</span>}
              {friendButton(p.id, p.username)}
              {removeButton(p.id, p.name)}
            </li>
            ),
          )}
        </ul>
        {isHost && !seatsFull && people < ROOM_LIMIT && (
          <>
            <button className="btn block add-bot" disabled={ranked} onClick={() => void actions.addBot()}>
              🤖 Add a bot
            </button>
            {ranked && <p className="muted small add-bot-note">🏅 Ranked tables are for people only</p>}
          </>
        )}
        {isHost && view.players.length + view.watchers.length > 1 && (
          <p className="muted small tap-hint">Tap a player to see their profile or make them the host</p>
        )}
      </section>

      {teamGame && <TeamSlots view={view} actions={actions} isHost={isHost} />}

      {view.watchers.length > 0 && (
        <section className="panel">
          <h2 className="section-title">
            Watching <span className="muted">{view.watchers.length}</span>
          </h2>
          {view.watchers.some((w) => w.id === view.meId) && (
            <p className="muted small watch-note">
              {!meWatching?.byChoice
                ? 'Seats are full · you get the next free one'
                : seatsFull
                  ? `All ${maxSeats} seats are taken right now`
                  : 'Switch to Play to take a seat'}
            </p>
          )}
          <ul className="player-list">
            {view.watchers.map((w) => (
              <li key={w.id} className={cx('player-row', !w.connected && 'offline')}>
                <button type="button" className="row-open" aria-label={`${w.name}'s profile`} onClick={() => openPlayer(w.id)}>
                  <Avatar name={w.name} avatar={w.avatar} size="sm" member={w.id} />
                  <span className="grow">
                    {w.name}
                    {w.id === view.meId && <span className="muted"> (you)</span>} <LevelBadge level={w.level} />
                  </span>
                </button>
                <span className="tag dim">👀</span>
                {friendButton(w.id, w.username)}
                {removeButton(w.id, w.name)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {settingsBody(null)}

      <div className="lobby-actions">
        {isHost && startBlock && <p className="start-block">{startBlock}</p>}
        <div className="sticky-row">
          {leaveButton}
          {mainButton}
        </div>
      </div>

      {overlays}
    </main>
  );
}
