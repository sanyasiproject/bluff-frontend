import { useEffect, useState } from 'react';
import { avatarColor, cx } from '../lib/cards';
import {
  currentVoiceName,
  getVoiceGender,
  onVoicesChanged,
  setVoiceGender,
  speak,
  unlockSpeech,
  type VoiceGender,
} from '../lib/speech';
import type { GameConfig, RoomView } from '../types';
import type { Actions } from '../useBluff';
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
      <p className="voice-name">On this phone: {currentVoiceName() ?? 'default voice'}</p>
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

export function Lobby({ view, actions }: { view: RoomView; actions: Actions }) {
  const isHost = view.hostId === view.meId;
  const me = [...view.players, ...view.watchers].find((p) => p.id === view.meId);
  const slots = Array.from({ length: 5 }, (_, i) => view.players[i] ?? null);
  const set = (patch: Partial<GameConfig>) => actions.setConfig({ ...view.config, ...patch });

  return (
    <main className="screen lobby">
      <header className="lobby-head">
        <div>
          <p className="label">Room code</p>
          <p className="room-code">{view.code}</p>
        </div>
        <QuickChat onSend={actions.chat} />
      </header>

      {view.players.length + view.watchers.length < ROOM_LIMIT && (
        <InvitePanel code={view.code} onToast={actions.toast} />
      )}

      <section className="panel">
        <h2 className="section-title">
          Players <span className="muted">{view.players.length}/5</span>
        </h2>
        <ul className="player-list">
          {slots.map((p, i) =>
            p ? (
              <li key={p.id} className={cx('player-row', !p.connected && 'offline')}>
                <span className="avatar sm" style={{ background: avatarColor(p.name) }}>
                  {p.name[0]?.toUpperCase()}
                </span>
                <span className="grow">
                  {p.name}
                  {p.id === view.meId && <span className="muted"> (you)</span>}
                </span>
                {p.id === view.hostId && <span className="tag">Host</span>}
                {!p.connected && <span className="tag dim">offline</span>}
              </li>
            ) : (
              <li key={`empty-${i}`} className="player-row empty">
                Waiting for player…
              </li>
            ),
          )}
        </ul>
      </section>

      {view.watchers.length > 0 && (
        <section className="panel">
          <h2 className="section-title">
            Watching <span className="muted">{view.watchers.length}</span>
          </h2>
          <p className="muted small watch-note">All 5 seats are taken. Watchers get a seat as soon as one frees up.</p>
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
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h2 className="section-title">
          Settings {!isHost && <span className="muted">· host decides</span>}
        </h2>
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
      </section>

      <details className="panel rules">
        <summary>How to play</summary>
        <ul>
          <li>On your turn put one or more cards face down and call a rank. You can lie.</li>
          <li>Everyone after you must call the same rank, or pass.</li>
          <li>Anyone can shout Bluff on the last play. Liar picks up the whole pile; if it was true, the caller does.</li>
          <li>If everyone passes, the pile is cleared and the last player starts a new round.</li>
          <li>Empty your hand first to win. The last player holding cards loses.</li>
          <li>Friends who join mid-game, or when 5 are playing, watch and get a seat in the next game.</li>
        </ul>
      </details>

      <VoicePicker sample={`${me?.name ?? 'Ravi'} played four Queens`} />

      <div className="lobby-actions">
        {isHost ? (
          <button className="btn primary block" disabled={view.players.length < 2} onClick={actions.start}>
            {view.players.length < 2 ? 'Need at least 2 players' : `Start game · ${view.players.length} players`}
          </button>
        ) : (
          <p className="waiting">Waiting for the host to start…</p>
        )}
        <button className="btn ghost block" onClick={actions.leave}>
          Leave room
        </button>
      </div>
    </main>
  );
}
