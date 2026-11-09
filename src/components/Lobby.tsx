import { useEffect, useState } from 'react';
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
import { STAKES, type GameConfig, type PublicPlayer, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { FriendsSheet } from './FriendsSheet';
import { InvitePanel } from './InvitePanel';
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

function Option({ on, disabled, title, desc, onClick }: OptionProps) {
  return (
    <button type="button" className={cx('option', on && 'on')} disabled={disabled} aria-pressed={on} onClick={onClick}>
      <b>{title}</b>
      <span>{desc}</span>
    </button>
  );
}

/** 5 players + 7 watchers, same limit as the server */
const ROOM_LIMIT = 12;

const names = (players: PublicPlayer[]) => players.map((p) => p.name).join(', ');

/** host picks how many coins each player puts in; everyone sees what it means */
function StakePicker({ stake, players, isHost, onPick }: { stake: number; players: number; isHost: boolean; onPick: (n: number) => void }) {
  const pot = stake * Math.max(players, 2);
  return (
    <>
      <p className="label">🪙 Coins at stake (per player)</p>
      {isHost && (
        <div className="stake-grid">
          {STAKES.map((s) => (
            <button key={s} type="button" className={cx('stake-chip', s === stake && 'on')} aria-pressed={s === stake} onClick={() => onPick(s)}>
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
            <span>Paid only when the game finishes · log in needed</span>
          </>
        )}
      </div>
    </>
  );
}

export function Lobby({ view, actions, auth }: { view: RoomView; actions: Actions; auth: Auth }) {
  const [friendsOpen, setFriendsOpen] = useState(false);
  const isHost = view.hostId === view.meId;
  const me = [...view.players, ...view.watchers].find((p) => p.id === view.meId);
  const set = (patch: Partial<GameConfig>) => actions.setConfig({ ...view.config, ...patch });
  const coinsOn = auth.accountsOn === true;

  const stake = view.config.stake;
  const pot = stake * view.players.length;
  const guests = stake > 0 ? view.players.filter((p) => !p.registered) : [];
  const short = stake > 0 ? view.players.filter((p) => p.registered && (p.coins ?? 0) < stake) : [];
  const startBlock =
    view.players.length < 2
      ? 'Need at least 2 players'
      : guests.length > 0
        ? `${names(guests)} must log in to play for coins`
        : short.length > 0
          ? `${names(short)} ${short.length > 1 ? "don't" : "doesn't"} have 🪙 ${formatCoins(stake)}`
          : null;

  const remove = (id: string, name: string) => {
    if (window.confirm(`Remove ${name} from the room?`)) void actions.kick(id);
  };

  const removeButton = (id: string, name: string) =>
    isHost && id !== view.meId ? (
      <button className="remove-btn" aria-label={`Remove ${name}`} onClick={() => remove(id, name)}>
        ✕
      </button>
    ) : null;

  return (
    <main className="screen lobby">
      <header className="lobby-head">
        <div className="grow">
          <p className="label">Room code</p>
          <p className="room-code">{view.code}</p>
        </div>
        <QuickChat onSend={actions.chat} />
        <AccountCorner auth={auth} roomCode={view.code} onInvite={actions.invite} />
      </header>

      {view.players.length + view.watchers.length < ROOM_LIMIT && (
        <InvitePanel code={view.code} onToast={actions.toast} onFriends={auth.user ? () => setFriendsOpen(true) : undefined} />
      )}

      <section className="panel">
        <h2 className="section-title">
          Players <span className="muted">{view.players.length}/5</span>
        </h2>
        <ul className="player-list">
          {view.players.map((p) => (
            <li key={p.id} className={cx('player-row', !p.connected && 'offline')}>
              <span className="avatar sm" style={{ background: avatarColor(p.name) }}>
                {p.name[0]?.toUpperCase()}
              </span>
              <span className="grow">
                {p.name}
                {p.id === view.meId && <span className="muted"> (you)</span>}
                {coinsOn && (
                  <span className={cx('player-coins', (!p.registered || (p.coins ?? 0) < stake) && stake > 0 && 'warn')}>
                    {p.registered ? `🪙 ${compactCoins(p.coins ?? 0)}` : 'guest'}
                    {stake > 0 && !p.registered && ' · must log in'}
                    {stake > 0 && p.registered && (p.coins ?? 0) < stake && ' · not enough'}
                  </span>
                )}
              </span>
              {p.id === view.hostId && <span className="tag">Host</span>}
              {!p.connected && <span className="tag dim">offline</span>}
              {removeButton(p.id, p.name)}
            </li>
          ))}
        </ul>
      </section>

      {view.watchers.length > 0 && (
        <section className="panel">
          <h2 className="section-title">
            Watching <span className="muted">{view.watchers.length}</span>
          </h2>
          {view.watchers.some((w) => w.id === view.meId) && (
            <p className="muted small watch-note">Seats are full · you get the next free one</p>
          )}
          <ul className="player-list">
            {view.watchers.map((w) => (
              <li key={w.id} className={cx('player-row', !w.connected && 'offline')}>
                <span className="avatar sm" style={{ background: avatarColor(w.name) }}>
                  {w.name[0]?.toUpperCase()}
                </span>
                <span className="grow">
                  {w.name}
                  {w.id === view.meId && <span className="muted"> (you)</span>}
                </span>
                <span className="tag dim">👀</span>
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
            <span>{stake > 0 ? `🪙 ${formatCoins(stake)} each` : '🆓 Free game'}</span>
            <span>🎴 {view.config.decks === 2 ? '2 decks' : '1 deck'}</span>
            <span>{view.config.bluffRule === 'one' ? '👆 Pick one card' : '🃏 Show all cards'}</span>
          </div>
          {stake > 0 && <p className="muted small">Winner takes 🪙 {formatCoins(pot)}</p>}
        </section>
      )}

      {isHost && <section className="panel">
        <h2 className="section-title">Game settings</h2>
        {coinsOn && <StakePicker stake={stake} players={view.players.length} isHost={isHost} onPick={(n) => set({ stake: n })} />}
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
      </section>}

      <details className="panel rules">
        <summary>How to play</summary>
        <ul>
          <li>On your turn put one or more cards face down and call a rank. You can lie.</li>
          <li>Everyone after you must call the same rank, or pass.</li>
          <li>Anyone can shout Bluff on the last play. Liar picks up the whole pile; if it was true, the caller does.</li>
          <li>If everyone passes, the pile is cleared and the last player starts a new round.</li>
          <li>Empty your hand first to win. The last player holding cards loses.</li>
        </ul>
      </details>

      <VoicePicker sample={`${me?.name ?? 'Ravi'} played four Queens`} />

      <div className="lobby-actions">
        {isHost ? (
          <>
            {startBlock && <p className="start-block">{startBlock}</p>}
            <div className="sticky-row">
              <button className="btn ghost leave-btn" onClick={actions.leave}>
                Leave
              </button>
              <button className="btn primary grow" disabled={startBlock !== null} onClick={actions.start}>
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
            <p className="waiting grow">⏳ Waiting for the host to start…</p>
          </div>
        )}
      </div>

      {friendsOpen && <FriendsSheet auth={auth} roomCode={view.code} onInvite={actions.invite} onClose={() => setFriendsOpen(false)} />}
    </main>
  );
}
