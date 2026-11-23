import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { api, errorText } from '../lib/api';
import { useBack } from '../lib/back';
import { cx } from '../lib/cards';
import { socket } from '../lib/socket';
import {
  getVoiceGender,
  onVoicesChanged,
  setVoiceGender,
  speak,
  unlockSpeech,
  type VoiceGender,
} from '../lib/speech';
import { formatCoins, compactCoins, stakeLabel } from '../lib/coins';
import { markTutorialSeen, tutorialSeen } from '../lib/tutorial';
import {
  BOT_LEVEL_NAMES,
  BOT_LEVELS,
  BOT_STAKE_CAPS,
  botStakeCap,
  CRAZY7_MAX_PICKS,
  RANG_MAX_PICKS,
  RANK_DIVISIONS,
  rankName,
  SHIELD_MAX_CARDS,
  STAKES,
  type BotLevel,
  type FriendsResponse,
  type FriendView,
  type GameConfig,
  type GameKind,
  type PublicPlayer,
  type RoomView,
  TURN_SECONDS,
  TURN_TIMER,
  type TurnSeconds,
} from '../types';
import { StreakMark } from './TurnTimer';

/** what a bot level lets the table stake, in a few words */
const capText = (cap: number) => (cap === 0 ? 'Free only' : `Up to 🪙 ${compactCoins(cap)}`);

/** host: how well the bots play, three even choices that each show what can be staked against them */
function BotLevelPicker({ value, onPick }: { value: BotLevel; onPick: (level: BotLevel) => void }) {
  return (
    <div className="setting-row stacked">
      <div className="grow">
        <b>🤖 Bot level</b>
        <span>Stronger bots count every card and remember how you play</span>
      </div>
      <div className="level-seg" role="group" aria-label="Bot level">
        {BOT_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={cx('level-chip', level === value && 'on')}
            aria-pressed={level === value}
            onClick={() => level !== value && onPick(level)}
          >
            <b>{BOT_LEVEL_NAMES[level]}</b>
            <small>{capText(BOT_STAKE_CAPS[level])}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
import type { Auth } from '../useAuth';
import type { Actions } from '../useBluff';
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

/** the landscape lobby's settings tabs */
type LobbyTab = 'game' | 'stakes' | 'extras' | 'help';

const LAND_QUERY = '(orientation: landscape)';

/** true while the screen is wider than tall */
function useLandscape() {
  const [land, setLand] = useState(() => window.matchMedia?.(LAND_QUERY).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(LAND_QUERY);
    if (!mq) return;
    const sync = () => setLand(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return land;
}

/** a layout box in landscape; in portrait its children sit straight in the page, as before */
function Land({ on, className, children }: { on: boolean; className: string; children: ReactNode }) {
  return on ? <div className={className}>{children}</div> : <>{children}</>;
}

/** per-phone voice choice; Girl is the default */
function VoicePicker({ sample }: { sample: string }) {
  const [gender, setGender] = useState<VoiceGender>(getVoiceGender);
  const [, refresh] = useState(0);
  useEffect(() => onVoicesChanged(() => refresh((n) => n + 1)), []);

  const test = () => {
    unlockSpeech();
    speak(sample, true);
  };
  const choose = (next: VoiceGender) => {
    setVoiceGender(next);
    setGender(next);
    test();
  };

  return (
    <section className="panel voice-row">
      <span className="label">Voice</span>
      <div className="mini-seg" role="group" aria-label="Voice">
        <button className={cx(gender === 'female' && 'on')} aria-pressed={gender === 'female'} onClick={() => choose('female')}>
          Girl
        </button>
        <button className={cx(gender === 'male' && 'on')} aria-pressed={gender === 'male'} onClick={() => choose('male')}>
          Boy
        </button>
      </div>
      <button className="btn ghost small" onClick={test}>
        🔊 Test
      </button>
    </section>
  );
}

interface OptionProps {
  on: boolean;
  disabled: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}

/** a newer setting: title, a few words on what it does, and its switch on the right */
function SettingRow({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="grow">
        <b>{title}</b>
        <span>{desc}</span>
      </div>
      {children}
    </div>
  );
}

/** two or more small choices side by side */
function Choice<T>({ value, options, onPick }: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="mini-seg" role="group">
      {options.map(([v, label]) => (
        <button key={label} className={cx(v === value && 'on')} aria-pressed={v === value} onClick={() => v !== value && onPick(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

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

function Option({ on, disabled, title, desc, onClick }: OptionProps) {
  return (
    <button type="button" className={cx('option', on && 'on')} disabled={disabled} aria-pressed={on} onClick={onClick}>
      <b>{title}</b>
      <span>{desc}</span>
    </button>
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

/** host picks how many coins each player puts in; everyone sees what it means. Bots cap it by their level and put in nothing */
function StakePicker({ stake, players, config, bots, isHost, onPick }: { stake: number; players: number; config: GameConfig; bots: boolean; isHost: boolean; onPick: (n: number) => void }) {
  const pot = stake * Math.max(players, 2);
  const cap = botStakeCap(config);
  // Crazy 7 bots always play their best; Bluff's are named by their level
  const who = config.game === 'crazy7' || config.game === 'rang' ? 'Bots' : `${BOT_LEVEL_NAMES[config.botLevel ?? 'expert']} bots`;
  return (
    <>
      <p className="label">🪙 Coins at stake (per player)</p>
      {isHost && (
        <div className="stake-grid">
          {STAKES.map((s) => (
            <button
              key={s}
              type="button"
              className={cx('stake-chip', s === stake && 'on')}
              aria-pressed={s === stake}
              disabled={bots && s > cap}
              onClick={() => onPick(s)}
            >
              {stakeLabel(s)}
            </button>
          ))}
        </div>
      )}
      <div className={cx('stake-explain', stake > 0 && 'live')}>
        {stake === 0 ? (
          <>
            <b>Free game</b>
            <span>Just for fun · guests can play</span>
          </>
        ) : (
          <>
            <b>
              Everyone puts in 🪙 {formatCoins(stake)} · Winner takes 🪙 {formatCoins(pot)}
            </b>
            <span>
              {bots ? 'Bots put in nothing · coins lost to a bot are gone' : 'Paid only when the game finishes · log in needed'}
            </span>
          </>
        )}
        {/* what the bots allow, inside the box so it never crowds the chips */}
        {isHost && bots && <span className="stake-bots">🤖 {cap === 0 ? `${who} play only free games` : `${who} play for up to 🪙 ${compactCoins(cap)}`}</span>}
      </div>
    </>
  );
}

export function Lobby({ view, actions, auth }: { view: RoomView; actions: Actions; auth: Auth }) {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const friendsNow = useOnlineFriends(auth.user ? auth.token : null);
  const isHost = view.hostId === view.meId;
  // anyone can sit out and watch, or take a free seat again
  const meWatching = view.watchers.find((w) => w.id === view.meId);
  const seatsFull = view.players.length >= 5;
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
  const isBluff = !crazy7 && !rang;
  // 2v2 is for Bluff and Rang
  const teamGame = view.config.teams && !crazy7;
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
  // house twists preset: Classic (both off), Chaos (both on), or neither when mixed
  const twists = !view.config.kismat && !view.config.seedhi ? 'classic' : view.config.kismat && view.config.seedhi ? 'chaos' : null;
  const ranked = isBluff && view.config.ranked === true;
  // ranked needs everyone seated logged in, at any stake
  const mustLogIn = stake > 0 || ranked;
  const rankedGuests = ranked ? view.players.filter((p) => !p.registered && !p.bot) : [];
  const guests = stake > 0 ? view.players.filter((p) => !p.registered && !p.bot) : [];
  const short = stake > 0 ? view.players.filter((p) => p.registered && (p.coins ?? 0) < stake) : [];
  // people who haven't tapped I'm ready (the host, bots and older apps always count as ready)
  const notReady = view.players.filter((p) => !p.bot && p.id !== view.hostId && !p.ready);
  const startBlock =
    view.players.length < 2
      ? 'Need at least 2 players'
      : bots.length === view.players.length
        ? 'Someone has to play with the bots'
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

  // landscape: players on the left, settings in tabs on the right, the action bar docked at the bottom
  const land = useLandscape();
  const hasStakes = coinsOn || (isBluff && bots.length > 0);
  const tabs: [LobbyTab, string][] = isHost
    ? [['game', '🎲 Game'], ...(hasStakes ? [['stakes', coinsOn ? '🪙 Stakes' : '🤖 Bots'] as [LobbyTab, string]] : []), ['extras', '✨ Extras'], ['help', '📘 Help']]
    : [['game', '🎲 Game'], ['help', '📘 Help']];
  const [tabPick, setTabPick] = useState<LobbyTab>('game');
  const tab = tabs.some(([t]) => t === tabPick) ? tabPick : 'game';
  // portrait shows every section; landscape only the open tab's
  const show = (t: LobbyTab) => !land || tab === t;
  // the game's own settings panel has rows on every tab but Help
  const settingsOpen = !land || tab !== 'help';
  // 2v2 seats four
  const seatCap = teamGame ? 4 : 5;

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

  const invite = view.players.length + view.watchers.length < ROOM_LIMIT && (
    <InvitePanel
      code={view.code}
      onToast={actions.toast}
      onFriends={auth.user ? () => setFriendsOpen(true) : undefined}
      requests={auth.friendRequests}
      online={friendsNow ? friendsNow.filter((f) => f.online && f.inRoom !== 'here').length : 0}
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

  return (
    <main className={cx('screen lobby', land && 'lobby-land')}>
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
        {land && modeBanner}
        <QuickChat onSend={actions.chat} view={view} />
        <AccountCorner auth={auth} roomCode={view.code} onInvite={actions.invite} onJoin={joinFriend} showOnline={false} />
      </header>

      {/* everyone sees at a glance whether this table is ranked or just for fun (older servers: nothing) */}
      {!land && modeBanner}
      {!land && liveVoice}
      {!land && invite}
      {!land && modeRow}

      <Land on={land} className="lobby-body">
      <Land on={land} className="lobby-side">
      <section className="panel">
        <h2 className="section-title">
          Players{' '}
          <span key={view.players.length} className="muted bump">
            {view.players.length}/5
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
          {/* landscape: the free seats, so the room reads like a table waiting to fill */}
          {land &&
            Array.from({ length: Math.max(0, seatCap - view.players.length) }, (_, i) => (
              <li key={`open-${i}`} className="player-row open-seat" aria-hidden>
                <span className="open-ring">+</span>
                <span className="grow">Open seat</span>
              </li>
            ))}
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
                  ? 'All 5 seats are taken right now'
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
      {land && invite}
      {land && liveVoice}
      </Land>

      <Land on={land} className="lobby-main">
      {land && (
        <nav className="lobby-tabs" role="tablist" aria-label="Lobby sections">
          {tabs.map(([t, label]) => (
            <button key={t} type="button" role="tab" className={cx('lobby-tab', t === tab && 'on')} aria-selected={t === tab} onClick={() => setTabPick(t)}>
              {label}
            </button>
          ))}
        </nav>
      )}
      {/* a new tab starts at its top */}
      <Land key={land ? tab : 'all'} on={land} className="lobby-scroll">
      {!isHost && show('game') && (
        <section className="panel settings-summary">
          <h2 className="section-title">Game settings</h2>
          <div className="summary-chips">
            <span className="game-chip">{crazy7 ? '7️⃣ Crazy 7' : rang ? '🌈 Rang' : '🃏 Bluff'}</span>
            <span>{stake > 0 ? `🪙 ${formatCoins(stake)} each` : '🆓 Free game'}</span>
            {!rang && <span>🎴 {view.config.decks === 2 ? '2 decks' : '1 deck'}</span>}
            {rang ? (
              <>
                <span>
                  🂠 Up to {view.config.rangPicks ?? 1} pick{(view.config.rangPicks ?? 1) > 1 ? 's' : ''}
                </span>
                <span>{view.config.rangStack !== false ? '➕ +2/+4 stack' : '➕ No stacking'}</span>
                {view.config.rangChallenge !== false && <span>⚔️ Challenge +4</span>}
                {view.config.rangSwap && <span>🔄 7-0 swap</span>}
                {view.config.rangDoubles && <span>👯 Doubles</span>}
                {view.config.rangForce && <span>⚡ Force play</span>}
                {(view.config.rangTime ?? 0) > 0 && <span>⏱ {view.config.rangTime} min game</span>}
                {(view.config.rangHand ?? 7) !== 7 && <span>🃏 {view.config.rangHand} cards each</span>}
                {(view.config.rangMissed ?? 2) !== 2 && <span>📢 Miss last card: pick {view.config.rangMissed}</span>}
                {view.config.teams && <span>👥 2 vs 2</span>}
              </>
            ) : crazy7 ? (
              <>
                <span>🃏 {view.config.handSize} cards each</span>
                <span>
                  🂠 Up to {view.config.maxPicks} pick{view.config.maxPicks > 1 ? 's' : ''}
                </span>
                <span>{view.config.stack7 ? '7️⃣ 7s stack' : '7️⃣ No stacking'}</span>
                {view.config.c7Power && <span>⚡ Power cards</span>}
              </>
            ) : (
              <>
                {ranked && <span className="ranked-chip">🏅 Ranked</span>}
                <span>{view.config.bluffRule === 'one' ? '👆 Pick one card' : '🃏 Show all cards'}</span>
                {view.config.peeks > 0 && <span>🔍 {view.config.peeks} peek{view.config.peeks > 1 ? 's' : ''}</span>}
                {view.config.shields > 0 && <span>🔒 {view.config.shields} shield{view.config.shields > 1 ? 's' : ''}</span>}
                {view.config.bets && <span>🎲 Bets on calls</span>}
                {view.config.teams && <span>👥 2 vs 2</span>}
                {view.config.saza && <span>🤡 Saza for the loser</span>}
                {view.config.kismat && <span>🍀 Kismat card</span>}
                {view.config.seedhi && <span>🪜 Seedhi</span>}
                {view.config.secretLies && <span>🤐 Lies stay secret</span>}
                {bots.length > 0 && <span>🤖 {BOT_LEVEL_NAMES[view.config.botLevel ?? 'expert']} bots</span>}
              </>
            )}
            {view.config.voice === false && <span>🔇 No voice</span>}
            {view.config.turnTimer && <span>⏰ {view.config.turnSec ?? TURN_TIMER.turnSec}s turns</span>}
          </div>
          {stake > 0 && <p className="muted small">Winner takes 🪙 {formatCoins(pot)}</p>}
          {bots.length > 0 && <p className="muted small">🤖 Bots put in nothing · coins lost to a bot are gone</p>}
          {ranked && <p className="muted small">🏅 A finished game moves everyone's rank points</p>}
        </section>
      )}

      {isHost && show('game') && (
        <section className="panel">
          {!land && <h2 className="section-title">Game</h2>}
          <div className="seg game-seg">
            <Option
              on={isBluff}
              disabled={false}
              title="🃏 Bluff"
              desc="Lie about your cards, catch the liars"
              // ranked kept on from before can't come back while bots sit at the table
              onClick={() => set({ game: 'bluff', ...(bots.length > 0 && view.config.ranked ? { ranked: false } : {}) })}
            />
            <Option
              on={crazy7}
              disabled={false}
              title="7️⃣ Crazy 7"
              desc="Match suit or number; a 7 makes the next player pick 2"
              onClick={() => set({ game: 'crazy7' })}
            />
            <Option
              on={rang}
              disabled={false}
              title="🌈 Rang"
              desc="Match colour or number; Skip, Reverse, +2 and wilds"
              onClick={() => set({ game: 'rang' })}
            />
          </div>
          {/* Bluff only: casual or ranked, as big as the game choice */}
          {isBluff && coinsOn && rankedKnown && (
            <div className="seg mode-seg">
              <Option on={!ranked} disabled={false} title="🎮 Casual" desc="Just for fun · no rank points" onClick={() => ranked && set({ ranked: false })} />
              <Option
                on={ranked}
                disabled={bots.length > 0 && !ranked}
                title="🏅 Ranked"
                desc={bots.length > 0 && !ranked ? 'People only: remove the bots first' : 'Rank points move · logged-in players, no bots'}
                onClick={() => !ranked && set({ ranked: true })}
              />
            </div>
          )}
        </section>
      )}

      {isHost && crazy7 && settingsOpen && (
        <section className="panel">
          {!land && <h2 className="section-title">Game settings</h2>}
          {coinsOn && show('stakes') && <StakePicker stake={stake} players={view.players.length} config={view.config} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
          {show('game') && (
          <>
          <SettingRow title="🃏 Cards each" desc="Dealt to every player at the start">
            <Choice<5 | 7> value={view.config.handSize} options={[[5, '5'], [7, '7']]} onPick={(n) => set({ handSize: n })} />
          </SettingRow>
          <div className="setting-row stacked">
            <div className="grow">
              <b>🂠 Picks per turn</b>
              <span>When nothing matches, 1 card is picked for you. Above 1 you may pick more or Pass to stop early.</span>
            </div>
            <div className="mini-seg pick-seg" role="group" aria-label="Picks per turn">
              {Array.from({ length: CRAZY7_MAX_PICKS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={cx(view.config.maxPicks === n && 'on')}
                  aria-pressed={view.config.maxPicks === n}
                  onClick={() => view.config.maxPicks !== n && set({ maxPicks: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          </>
          )}
          {show('extras') && (
          <>
          <SettingRow title="7️⃣ Stack 7s" desc={view.config.c7Power ? 'Answer a 7 or a 2 with a 7 or a 2: the next player picks the total' : 'Answer a 7 with a 7: the next player picks 4, then 6…'}>
            <Choice value={view.config.stack7} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ stack7: on })} />
          </SettingRow>
          <SettingRow title="⚡ Power cards" desc="J changes the suit · 8 skips the next player · A reverses · 2 makes the next player pick 2">
            <Choice value={view.config.c7Power === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ c7Power: on })} />
          </SettingRow>
          </>
          )}
          {show('game') && (
          <>
          <p className="label">Cards</p>
          <div className="seg">
            <Option on={view.config.decks === 1} disabled={false} title="1 deck" desc="52 cards" onClick={() => set({ decks: 1 })} />
            <Option on={view.config.decks === 2} disabled={false} title="2 decks" desc="104 cards, more 7s" onClick={() => set({ decks: 2 })} />
          </div>
          </>
          )}
        </section>
      )}

      {isHost && rang && settingsOpen && (
        <section className="panel">
          {!land && <h2 className="section-title">Game settings</h2>}
          {coinsOn && show('stakes') && <StakePicker stake={stake} players={view.players.length} config={view.config} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
          {show('game') && (
          <div className="setting-row stacked">
            <div className="grow">
              <b>🂠 Picks per turn</b>
              <span>Nothing fits? Keep picking until a card fits, up to this many. At 1 you pick one card, then play it or pass.</span>
            </div>
            <div className="mini-seg pick-seg" role="group" aria-label="Picks per turn">
              {Array.from({ length: RANG_MAX_PICKS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={cx((view.config.rangPicks ?? 1) === n && 'on')}
                  aria-pressed={(view.config.rangPicks ?? 1) === n}
                  onClick={() => (view.config.rangPicks ?? 1) !== n && set({ rangPicks: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          )}
          {show('extras') && (
          <>
          <SettingRow title="➕ Stack +2 and +4" desc="Answer a +2 with a +2 or +4, a +4 with a +4: the next player picks the total">
            <Choice value={view.config.rangStack !== false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangStack: on })} />
          </SettingRow>
          <SettingRow title="⚔️ Challenge the +4" desc="Hit by a +4? Challenge it: if they held the colour, they take the +4 back and pick 4; if not, you pick 6">
            <Choice value={view.config.rangChallenge !== false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangChallenge: on })} />
          </SettingRow>
          <SettingRow title="🔄 7-0 swap" desc="A 7 swaps hands with a player you pick · a 0 passes every hand on">
            <Choice value={view.config.rangSwap === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangSwap: on })} />
          </SettingRow>
          <SettingRow title="👯 Doubles" desc="On a number, put down all your cards of that number at once (on a 4: every 4 you hold)">
            <Choice value={view.config.rangDoubles === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangDoubles: on })} />
          </SettingRow>
          <SettingRow title="⚡ Force play" desc="A card you pick that fits is played at once">
            <Choice value={view.config.rangForce === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangForce: on })} />
          </SettingRow>
          </>
          )}
          {show('game') && (
          <SettingRow title="🃏 Cards each" desc="Dealt to every player at the start">
            <Choice<5 | 7 | 10> value={view.config.rangHand ?? 7} options={[[5, '5'], [7, '7'], [10, '10']]} onPick={(n) => set({ rangHand: n })} />
          </SettingRow>
          )}
          {show('extras') && (
          <SettingRow title="📢 Forgot last card" desc="Cards picked by a player caught not saying last card">
            <Choice<1 | 2 | 4> value={view.config.rangMissed ?? 2} options={[[1, '1'], [2, '2'], [4, '4']]} onPick={(n) => set({ rangMissed: n })} />
          </SettingRow>
          )}
          {show('game') && (
          <>
          {/* stacked: three wide choices leave the text no room beside them */}
          <div className="setting-row stacked">
            <div className="grow">
              <b>⏱ Game time</b>
              <span>When time runs out, the fewest points left win; equal points share the place</span>
            </div>
            <div className="mini-seg" role="group" aria-label="Game time">
              {([[0, 'No limit'], [3, '3 min'], [5, '5 min']] as const).map(([n, label]) => (
                <button key={n} className={cx((view.config.rangTime ?? 0) === n && 'on')} aria-pressed={(view.config.rangTime ?? 0) === n} onClick={() => (view.config.rangTime ?? 0) !== n && set({ rangTime: n })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <SettingRow title="👥 Teams" desc="2 vs 2: partners sit opposite; when one goes out, both win">
            <Choice value={view.config.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
          </SettingRow>
          </>
          )}
        </section>
      )}

      {isHost && isBluff && settingsOpen && <section className="panel">
        {!land && <h2 className="section-title">Game settings</h2>}
        {/* the bots' level comes first: it sets how much can be staked */}
        {bots.length > 0 && show('stakes') && <BotLevelPicker value={view.config.botLevel ?? 'expert'} onPick={(level) => set({ botLevel: level })} />}
        {coinsOn && show('stakes') && <StakePicker stake={stake} players={view.players.length} config={view.config} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
        {show('game') && (
        <>
        <p className="label">Cards</p>
        <div className="seg">
          <Option on={view.config.decks === 1} disabled={!isHost} title="1 deck" desc="52 cards" onClick={() => set({ decks: 1 })} />
          <Option on={view.config.decks === 2} disabled={!isHost} title="2 decks" desc="104 cards" onClick={() => set({ decks: 2 })} />
        </div>
        <p className="label">When someone calls bluff</p>
        <div className="seg">
          <Option
            on={view.config.bluffRule === 'all'}
            disabled={!isHost}
            title="Show all"
            desc="Every card of that play is turned over"
            onClick={() => set({ bluffRule: 'all' })}
          />
          <Option
            on={view.config.bluffRule === 'one'}
            disabled={!isHost}
            title="Pick one"
            desc="Caller picks one card to turn over"
            onClick={() => set({ bluffRule: 'one' })}
          />
        </div>
        </>
        )}
        {show('extras') && (
        <>
        {!land && <p className="label">Extras</p>}
        <SettingRow title="🔍 Peek power" desc="Secretly see one played card before calling">
          <Choice value={view.config.peeks > 0} options={[[false, 'No'], [true, 'Yes']]} onPick={(on) => set({ peeks: on ? 1 : 0 })} />
        </SettingRow>
        {view.config.peeks > 0 && (
          <SettingRow title="Peeks per player" desc="How many each player gets per game">
            <Choice value={view.config.peeks} options={[[1, '1'], [2, '2'], [3, '3']]} onPick={(n) => set({ peeks: n })} />
          </SettingRow>
        )}
        <SettingRow title="🔒 Card Shield" desc={`Lock a play of up to ${SHIELD_MAX_CARDS} cards: nobody can call or peek it. Not on your last cards`}>
          <Choice value={view.config.shields ?? 0} options={[[0, 'Off'], [1, '1'], [2, '2'], [3, '3']]} onPick={(n) => set({ shields: n })} />
        </SettingRow>
        {coinsOn && stake > 0 && (
          <SettingRow title="🎲 Bet your call" desc="Bet coins on your Bluff calls">
            <Choice value={view.config.bets} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ bets: on })} />
          </SettingRow>
        )}
        <SettingRow title="👥 Teams" desc="Partners play together, both must finish">
          <Choice value={view.config.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
        </SettingRow>
        <SettingRow title="🤡 Saza for the loser" desc="The last player wears a silly badge until they win a game here">
          <Choice value={view.config.saza ?? false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ saza: on })} />
        </SettingRow>
        <SettingRow title="🤥 Lie reveal" desc="When the game ends, show the lies nobody caught">
          <Choice value={!(view.config.secretLies ?? false)} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ secretLies: !on })} />
        </SettingRow>
        {/* older servers have no house twists */}
        {view.config.kismat !== undefined && (
          <>
            <div className="setting-row stacked twist-presets">
              <div className="grow">
                <b>🎭 Twists</b>
                <span>Classic: no twists · Chaos: both on. Or set each one below</span>
              </div>
              <Choice<'classic' | 'chaos' | null>
                value={twists}
                options={[
                  ['classic', 'Classic'],
                  ['chaos', 'Chaos'],
                ]}
                onPick={(v) => set({ kismat: v === 'chaos', seedhi: v === 'chaos' })}
              />
            </div>
            <SettingRow title="🍀 Kismat card" desc="A random rank each game is wild: it backs up any claim">
              <Choice value={view.config.kismat} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ kismat: on })} />
            </SettingRow>
            <SettingRow title="🪜 Seedhi" desc="Each claim goes one rank down, stays, or goes one up. K and A wrap">
              <Choice value={view.config.seedhi ?? false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ seedhi: on })} />
            </SettingRow>
          </>
        )}
        </>
        )}
      </section>}

      {/* older servers have no turn timer */}
      {isHost && view.config.turnTimer !== undefined && show('extras') && (
        <section className="panel">
          <div className="setting-row stacked">
            <div className="grow">
              <b>⏰ Turn timer</b>
              <span>{`Seconds a turn. Time up: the bot brain plays for you. Miss ${TURN_TIMER.missesToAway} in a row and you're away (${TURN_TIMER.awaySec}s turns)`}</span>
            </div>
            {/* older servers have only on (30 s) or off */}
            {view.config.turnSec === undefined ? (
              <Choice value={view.config.turnTimer} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ turnTimer: on })} />
            ) : (
              <Choice<number>
                value={view.config.turnTimer ? view.config.turnSec : 0}
                options={[[0, 'Off'], ...TURN_SECONDS.map((n): [number, string] => [n, `${n}s`])]}
                onPick={(n) => set(n === 0 ? { turnTimer: false } : { turnTimer: true, turnSec: n as TurnSeconds })}
              />
            )}
          </div>
        </section>
      )}

      {/* older servers have no voice notes */}
      {isHost && view.config.voice !== undefined && show('extras') && (
        <section className="panel">
          <SettingRow title="🎧 Live voice" desc="Logged-in players in the game can talk and hear each other. Never recorded">
            <Choice value={view.config.voice} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ voice: on })} />
          </SettingRow>
        </section>
      )}

      {!rang && show('help') && (
        <button className="link-btn tut-link" onClick={() => setLesson(view.config.game)}>
          📘 How to play: 1-minute practice game
        </button>
      )}
      {show('help') && (
      <details className="panel rules" open={land || undefined}>
        <summary>How to play {crazy7 ? 'Crazy 7' : rang ? 'Rang' : 'Bluff'}</summary>
        {rang ? (
          <ul>
            <li>Play one card that matches the colour or the number/symbol on top (on a red 5: any red card or any 5).</li>
            <li>⊘ Skip: the next player misses a turn. ⇄ Reverse: play turns the other way. +2: the next player picks 2 and misses a turn.</li>
            <li>✦ Wild: name the next colour. +4 Wild: name the colour and the next player picks 4 and misses a turn.</li>
            <li>
              Nothing fits? One card is picked for you
              {(view.config.rangPicks ?? 1) > 1 ? `; keep picking (up to ${view.config.rangPicks} a turn), play a card that fits, or Pass.` : '; play it if it fits, or Pass.'}
            </li>
            {view.config.rangStack !== false && <li>➕ Hit by a +2 or +4? Answer with your own (+2 on +2, +4 on either) and the next player picks the total.</li>}
            {view.config.rangChallenge !== false && <li>⚔️ Hit by a +4? Challenge it: if they held the colour in play, they take the +4 back and pick 4; if not, you pick 6.</li>}
            {view.config.rangSwap && <li>🔄 A 7 swaps hands with a player you pick; a 0 passes every hand on in the direction of play.</li>}
            {view.config.rangDoubles && <li>👯 Doubles: when the top card is a number, put down all your cards of that number at once and pick which colour goes on top. On any other card, one card at a time.</li>}
            {view.config.rangForce && <li>⚡ Force play: a card you pick that fits is played at once.</li>}
            {view.config.teams && <li>👥 2 vs 2: partners sit opposite. When one of you goes out, your team wins.</li>}
            {(view.config.rangTime ?? 0) > 0 && <li>⏱ {view.config.rangTime} minute game: if nobody is out by then, the fewest points left win (equal points share the place).</li>}
            <li>With 2 cards on your turn, tap 📢 Last card, then play. Forget it and someone moves first: you pick {view.config.rangMissed ?? 2} and miss a turn.</li>
            <li>First to empty their hand wins. The rest are ranked by points left (numbers face value, Skip/Reverse/+2 20, wilds 50); the highest loses.</li>
          </ul>
        ) : crazy7 ? (
          <ul>
            <li>Play one card that matches the top card's suit or number (on 5♥: any ♥ or any 5).</li>
            <li>
              Nothing matches? One card is picked for you, then play it if it fits.
              {view.config.maxPicks > 1
                ? ` You may pick more (up to ${view.config.maxPicks} a turn) or Pass to stop early; at the limit you must play a card that fits.`
                : ' No passing: one pick a turn.'}
            </li>
            <li>
              A 7 makes the next player pick 2 and miss their turn
              {view.config.stack7 ? ', unless they answer with their own 7 (then 4, 6…). Hit by a 7? Tap Pick 2 (or play a 7)' : ''}.
            </li>
            {view.config.c7Power && <li>⚡ Power cards: J goes on anything and you name the next suit · 8 skips the next player · A reverses the direction · 2 makes the next player pick 2 (answer it with a 2 or a 7).</li>}
            <li>
              With 2 cards on your turn, tap 📢 Last card, then play. Forget it and someone moves before you say it: you pick 1 and miss your next
              turn.
            </li>
            <li>The first player to empty their hand wins. The rest are ranked by card value left (A 1 … K 13); the highest loses. Stuck with nothing to play or pick: fewest cards wins.</li>
          </ul>
        ) : (
          <ul>
            <li>On your turn put one or more cards face down and call a rank. You can lie.</li>
            <li>
              {view.config.seedhi
                ? 'Everyone after you calls one rank down, the same, or one up from the last call (K and A wrap), or passes.'
                : 'Everyone after you must call the same rank, or pass.'}
            </li>
            {view.config.kismat && <li>🍀 Kismat card: one random rank is wild all game. Its cards back up any call.</li>}
            <li>Anyone can shout Bluff on the last play. Liar picks up the whole pile; if it was true, the caller does.</li>
            <li>If everyone passes, the pile is cleared and the last player starts a new round.</li>
            <li>Empty your hand first to win. The last player holding cards loses.</li>
          </ul>
        )}
      </details>
      )}

      {show('help') && <VoicePicker sample={rang ? `${me?.name ?? 'Ravi'} played a red seven. Priya is skipped` : crazy7 ? `${me?.name ?? 'Ravi'} played seven of spades. Priya picks 2` : `${me?.name ?? 'Ravi'} played four Queens`} />}
      </Land>
      </Land>
      </Land>

      <div className="lobby-actions">
        {/* landscape: Play / Watch rides on the docked bar */}
        {land && modeRow}
        {isHost ? (
          <>
            {startBlock && <p className="start-block">{startBlock}</p>}
            <div className="sticky-row">
              <button className="btn ghost leave-btn" onClick={actions.leave}>
                Leave
              </button>
              <button className={cx('btn primary grow', startBlock === null ? 'shine' : 'blocked')} disabled={startBlock !== null} onClick={actions.start}>
                {startBlock === null
                  ? `Start · ${view.players.length} players${stake > 0 ? ` · 🪙 ${compactCoins(pot)}` : ''}`
                  : notReady.length > 0 && startBlock.startsWith('⏳')
                    ? `⏳ Waiting for ${notReady.length} ${notReady.length === 1 ? 'player' : 'players'}`
                    : '🔒 Start game'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="sticky-row">
              <button className="btn ghost leave-btn" onClick={actions.leave}>
                Leave
              </button>
              {seated ? (
                seated.ready ? (
                  // ready: tapping again asks everyone to wait a minute
                  <button className="btn ready-btn grow" onClick={() => void actions.setReady(false)}>
                    <span>✅ You're ready</span>
                    <small>Waiting for the host · tap to wait</small>
                  </button>
                ) : (
                  <button className="btn primary grow shine ready-go" onClick={() => void actions.setReady(true)}>
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
              )}
            </div>
          </>
        )}
      </div>

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
                      🎮 Move to playing{seatsFull ? ' · all 5 seats taken' : ''}
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
    </main>
  );
}
