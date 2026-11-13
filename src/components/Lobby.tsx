import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { api, errorText } from '../lib/api';
import { useBack } from '../lib/back';
import { avatarColor, cx } from '../lib/cards';
import {
  getVoiceGender,
  onVoicesChanged,
  setVoiceGender,
  speak,
  unlockSpeech,
  type VoiceGender,
} from '../lib/speech';
import { formatCoins, compactCoins, stakeLabel } from '../lib/coins';
import { BOT_MAX_STAKE, CRAZY7_MAX_PICKS, STAKES, type FriendsResponse, type FriendView, type GameConfig, type PublicPlayer, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { ConfirmBox } from './ConfirmBox';
import { SuitDrift } from './Ambient';
import { FriendsSheet } from './FriendsSheet';
import { InvitePanel } from './InvitePanel';
import { LevelBadge } from './LevelBadge';
import { Backdrop } from './Overlays';
import { PlayerSheet } from './PlayerSheet';
import { QuickChat } from './QuickChat';

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

/** host picks how many coins each player puts in; everyone sees what it means. Bots cap it and put in nothing */
function StakePicker({ stake, players, bots, isHost, onPick }: { stake: number; players: number; bots: boolean; isHost: boolean; onPick: (n: number) => void }) {
  const pot = stake * Math.max(players, 2);
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
              disabled={bots && s > BOT_MAX_STAKE}
              onClick={() => onPick(s)}
            >
              {stakeLabel(s)}
            </button>
          ))}
        </div>
      )}
      {isHost && bots && <p className="muted small">🤖 With bots the stake goes up to 🪙 {BOT_MAX_STAKE}</p>}
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
      </div>
    </>
  );
}

export function Lobby({ view, actions, auth }: { view: RoomView; actions: Actions; auth: Auth }) {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const isHost = view.hostId === view.meId;
  // anyone can sit out and watch, or take a free seat again
  const meWatching = view.watchers.find((w) => w.id === view.meId);
  const seatsFull = view.players.length >= 5;
  // back from the lobby leaves the room, like the Leave button
  useBack(() => void actions.leave());
  const me = [...view.players, ...view.watchers].find((p) => p.id === view.meId);
  const set = (patch: Partial<GameConfig>) => actions.setConfig({ ...view.config, ...patch });
  const coinsOn = auth.accountsOn === true;
  const crazy7 = view.config.game === 'crazy7';

  const stake = view.config.stake;
  const pot = stake * view.players.length;
  const bots = view.players.filter((p) => p.bot);
  const guests = stake > 0 ? view.players.filter((p) => !p.registered && !p.bot) : [];
  const short = stake > 0 ? view.players.filter((p) => p.registered && (p.coins ?? 0) < stake) : [];
  const startBlock =
    view.players.length < 2
      ? 'Need at least 2 players'
      : bots.length === view.players.length
        ? 'Someone has to play with the bots'
      : !crazy7 && view.config.teams && view.players.length !== 4
        ? 'Teams need exactly 4 players'
        : guests.length > 0
        ? `${names(guests)} must log in to play for coins`
        : short.length > 0
          ? `${names(short)} ${short.length > 1 ? "don't" : "doesn't"} have 🪙 ${formatCoins(stake)}`
          : null;

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
  // a request someone sends while we wait in the lobby shows up within a few seconds
  useEffect(() => {
    void loadLinks();
    const t = setInterval(() => void loadLinks(), 10_000);
    return () => clearInterval(t);
  }, [loadLinks, people]);

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
        <QuickChat onSend={actions.chat} />
        <AccountCorner auth={auth} roomCode={view.code} onInvite={actions.invite} onJoin={joinFriend} />
      </header>

      {view.players.length + view.watchers.length < ROOM_LIMIT && (
        <InvitePanel
          code={view.code}
          onToast={actions.toast}
          onFriends={auth.user ? () => setFriendsOpen(true) : undefined}
          requests={auth.friendRequests}
        />
      )}

      <section className="mode-row">
        <span className="grow">{meWatching ? "You're watching" : "You're playing"}</span>
        <div className="mini-seg" role="group" aria-label="Play or watch">
          <button
            className={cx(!meWatching && 'on')}
            aria-pressed={!meWatching}
            disabled={!!meWatching && seatsFull}
            onClick={() => meWatching && void actions.setWatching(false)}
          >
            🎮 Playing
          </button>
          <button className={cx(meWatching && 'on')} aria-pressed={!!meWatching} onClick={() => !meWatching && void actions.setWatching(true)}>
            👀 Watching
          </button>
        </div>
      </section>

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
                  <span className="avatar sm bot-avatar" data-member={p.id} aria-hidden>
                    🤖
                  </span>
                  <span className="grow">{p.name}</span>
                </span>
                <span className="tag dim">Bot</span>
                {removeButton(p.id, p.name)}
              </li>
            ) : (
            <li key={p.id} className={cx('player-row', !p.connected && 'offline')}>
              <button type="button" className="row-open" aria-label={`${p.name}'s profile`} onClick={() => openPlayer(p.id)}>
                <span className="avatar sm" data-member={p.id} style={{ background: avatarColor(p.name) }}>
                  {p.name[0]?.toUpperCase()}
                </span>
                <span className="grow">
                  {p.name}
                  {p.id === view.meId && <span className="muted"> (you)</span>} <LevelBadge level={p.level} />
                  {coinsOn && (
                    <span className={cx('player-coins', (!p.registered || (p.coins ?? 0) < stake) && stake > 0 && 'warn')}>
                      {p.registered ? `🪙 ${compactCoins(p.coins ?? 0)}` : 'guest'}
                      {stake > 0 && !p.registered && ' · must log in'}
                      {stake > 0 && p.registered && (p.coins ?? 0) < stake && ' · not enough'}
                    </span>
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
          <button className="btn block add-bot" onClick={() => void actions.addBot()}>
            🤖 Add a bot
          </button>
        )}
        {isHost && view.players.length + view.watchers.length > 1 && (
          <p className="muted small tap-hint">Tap a player to see their profile or make them the host</p>
        )}
      </section>

      {!crazy7 && view.config.teams && <TeamSlots view={view} actions={actions} isHost={isHost} />}

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
                  : 'Switch to Playing to take a seat'}
            </p>
          )}
          <ul className="player-list">
            {view.watchers.map((w) => (
              <li key={w.id} className={cx('player-row', !w.connected && 'offline')}>
                <button type="button" className="row-open" aria-label={`${w.name}'s profile`} onClick={() => openPlayer(w.id)}>
                  <span className="avatar sm" data-member={w.id} style={{ background: avatarColor(w.name) }}>
                    {w.name[0]?.toUpperCase()}
                  </span>
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

      {!isHost && (
        <section className="panel settings-summary">
          <h2 className="section-title">Game settings</h2>
          <div className="summary-chips">
            <span className="game-chip">{crazy7 ? '7️⃣ Crazy 7' : '🃏 Bluff'}</span>
            <span>{stake > 0 ? `🪙 ${formatCoins(stake)} each` : '🆓 Free game'}</span>
            <span>🎴 {view.config.decks === 2 ? '2 decks' : '1 deck'}</span>
            {crazy7 ? (
              <>
                <span>🃏 {view.config.handSize} cards each</span>
                <span>
                  🂠 Up to {view.config.maxPicks} pick{view.config.maxPicks > 1 ? 's' : ''}
                </span>
                <span>{view.config.stack7 ? '7️⃣ 7s stack' : '7️⃣ No stacking'}</span>
              </>
            ) : (
              <>
                <span>{view.config.bluffRule === 'one' ? '👆 Pick one card' : '🃏 Show all cards'}</span>
                {view.config.peeks > 0 && <span>🔍 {view.config.peeks} peek{view.config.peeks > 1 ? 's' : ''}</span>}
                {view.config.bets && <span>🎲 Bets on calls</span>}
                {view.config.teams && <span>👥 2 vs 2</span>}
              </>
            )}
          </div>
          {stake > 0 && <p className="muted small">Winner takes 🪙 {formatCoins(pot)}</p>}
          {bots.length > 0 && <p className="muted small">🤖 Bots put in nothing · coins lost to a bot are gone</p>}
        </section>
      )}

      {isHost && (
        <section className="panel">
          <h2 className="section-title">Game</h2>
          <div className="seg game-seg">
            <Option
              on={!crazy7}
              disabled={false}
              title="🃏 Bluff"
              desc="Lie about your cards, catch the liars"
              onClick={() => set({ game: 'bluff' })}
            />
            <Option
              on={crazy7}
              disabled={false}
              title="7️⃣ Crazy 7"
              desc="Match suit or number; a 7 makes the next player pick 2"
              onClick={() => set({ game: 'crazy7' })}
            />
          </div>
        </section>
      )}

      {isHost && crazy7 && (
        <section className="panel">
          <h2 className="section-title">Game settings</h2>
          {coinsOn && <StakePicker stake={stake} players={view.players.length} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
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
          <SettingRow title="7️⃣ Stack 7s" desc="Answer a 7 with your own 7: the next player picks 4, then 6…">
            <Choice value={view.config.stack7} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ stack7: on })} />
          </SettingRow>
          <p className="label">Cards</p>
          <div className="seg">
            <Option on={view.config.decks === 1} disabled={false} title="1 deck" desc="52 cards" onClick={() => set({ decks: 1 })} />
            <Option on={view.config.decks === 2} disabled={false} title="2 decks" desc="104 cards, more 7s" onClick={() => set({ decks: 2 })} />
          </div>
        </section>
      )}

      {isHost && !crazy7 && <section className="panel">
        <h2 className="section-title">Game settings</h2>
        {coinsOn && <StakePicker stake={stake} players={view.players.length} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
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
        <p className="label">Extras</p>
        <SettingRow title="🔍 Peek power" desc="Secretly see one played card before calling">
          <Choice value={view.config.peeks > 0} options={[[false, 'No'], [true, 'Yes']]} onPick={(on) => set({ peeks: on ? 1 : 0 })} />
        </SettingRow>
        {view.config.peeks > 0 && (
          <SettingRow title="Peeks per player" desc="How many each player gets per game">
            <Choice value={view.config.peeks} options={[[1, '1'], [2, '2'], [3, '3']]} onPick={(n) => set({ peeks: n })} />
          </SettingRow>
        )}
        {coinsOn && stake > 0 && (
          <SettingRow title="🎲 Bet your call" desc="Bet coins on your Bluff calls">
            <Choice value={view.config.bets} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ bets: on })} />
          </SettingRow>
        )}
        <SettingRow title="👥 Teams" desc="Partners play together, both must finish">
          <Choice value={view.config.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
        </SettingRow>
      </section>}

      <details className="panel rules">
        <summary>How to play {crazy7 ? 'Crazy 7' : 'Bluff'}</summary>
        {crazy7 ? (
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
            <li>
              With 2 cards on your turn, tap 📢 Last card, then play. Forget it and someone moves before you say it: you pick 1 and miss your next
              turn.
            </li>
            <li>The first player to empty their hand wins. Everyone else loses. Stuck with nothing to play or pick: fewest cards wins.</li>
          </ul>
        ) : (
          <ul>
            <li>On your turn put one or more cards face down and call a rank. You can lie.</li>
            <li>Everyone after you must call the same rank, or pass.</li>
            <li>Anyone can shout Bluff on the last play. Liar picks up the whole pile; if it was true, the caller does.</li>
            <li>If everyone passes, the pile is cleared and the last player starts a new round.</li>
            <li>Empty your hand first to win. The last player holding cards loses.</li>
          </ul>
        )}
      </details>

      <VoicePicker sample={crazy7 ? `${me?.name ?? 'Ravi'} played seven of spades. Priya picks 2` : `${me?.name ?? 'Ravi'} played four Queens`} />

      <div className="lobby-actions">
        {isHost ? (
          <>
            {startBlock && <p className="start-block">{startBlock}</p>}
            <div className="sticky-row">
              <button className="btn ghost leave-btn" onClick={actions.leave}>
                Leave
              </button>
              <button className="btn primary grow shine" disabled={startBlock !== null} onClick={actions.start}>
                {startBlock === null
                  ? `Start · ${view.players.length} players${stake > 0 ? ` · 🪙 ${compactCoins(pot)}` : ''}`
                  : 'Start game'}
              </button>
            </div>
          </>
        ) : (
          <div className="sticky-row">
            <button className="btn ghost leave-btn" onClick={actions.leave}>
              Leave
            </button>
            <p className="waiting grow">
              ⏳ Waiting for the host to start
              <span className="dots" aria-hidden>
                <i>.</i>
                <i>.</i>
                <i>.</i>
              </span>
            </p>
          </div>
        )}
      </div>

      {viewing && (
        <PlayerSheet
          auth={auth}
          name={viewing.name}
          username={viewing.username}
          level={viewing.level}
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
    </main>
  );
}
