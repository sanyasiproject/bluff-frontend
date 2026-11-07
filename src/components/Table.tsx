import { useEffect, useState } from 'react';
import { avatarColor, claimText, cx, placeLabel, rankPlural } from '../lib/cards';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import type { PublicPlayer, Rank, RoomView } from '../types';
import type { Actions } from '../useBluff';
import { Hand } from './Hand';
import { GameOver, PickSheet, RankSheet, RevealOverlay } from './Overlays';
import { PlayingCard } from './PlayingCard';

function Seat({ player, turn, passed }: { player: PublicPlayer; turn: boolean; passed: boolean }) {
  const badge = player.place ? placeLabel(player.place) : !player.connected ? 'offline' : passed ? 'pass' : null;
  return (
    <div className={cx('seat', turn && 'turn', !player.connected && 'offline', player.place && 'done')}>
      {badge && <span className={cx('badge', player.place && 'gold')}>{badge}</span>}
      <span className="avatar" style={{ background: avatarColor(player.name) }}>
        {player.name[0]?.toUpperCase()}
      </span>
      <span className="seat-name">{player.name}</span>
      <span className="seat-count">
        <i className="mini-back" />
        {player.cardCount}
      </span>
    </div>
  );
}

function Pile({ count }: { count: number }) {
  const shown = Math.min(count, 7);
  return (
    <div className="pile" aria-label={`${count} cards in the pile`}>
      {count === 0 && <div className="pile-empty">Pile</div>}
      {Array.from({ length: shown }, (_, i) => {
        // keys shift as the pile grows so newly played cards animate in
        const n = count - shown + i;
        return (
          <PlayingCard
            key={n}
            faceDown
            size="sm"
            className="pile-card"
            style={{ transform: `translate(-50%, -50%) rotate(${((n * 47) % 34) - 17}deg) translate(${((n * 13) % 11) - 5}px, ${-i}px)` }}
          />
        );
      })}
      {count > 0 && <span className="pile-count">{count}</span>}
    </div>
  );
}

export function Table({ view, actions }: { view: RoomView; actions: Actions }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sheet, setSheet] = useState<'rank' | 'pick' | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [busy, setBusy] = useState(false);

  const me = view.players.find((p) => p.id === view.meId);
  const name = (id: string | null) => (id === view.meId ? 'You' : (view.players.find((p) => p.id === id)?.name ?? 'Someone'));
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turnId === view.meId;
  const lp = view.lastPlay;
  const canBluff = playing && !!lp && lp.playerId !== view.meId && (me?.cardCount ?? 0) > 0;
  const isHost = view.hostId === view.meId;
  const opponents = view.players.filter((p) => p.id !== view.meId);

  // drop selected cards that left the hand
  useEffect(() => {
    const ids = new Set(view.hand.map((c) => c.id));
    setSelected((prev) => (prev.every((id) => ids.has(id)) ? prev : prev.filter((id) => ids.has(id))));
  }, [view.hand]);

  useEffect(() => {
    if (!view.reveal) return;
    setShowReveal(true);
    const t = setTimeout(() => setShowReveal(false), 5000);
    return () => clearTimeout(t);
  }, [view.reveal?.playId]);

  useEffect(() => {
    setSheet((s) => (s === 'pick' ? null : s));
  }, [lp?.id]);

  useEffect(() => {
    if (myTurn) navigator.vibrate?.(120);
    else setSheet((s) => (s === 'rank' ? null : s));
  }, [myTurn]);

  // functional updates so quick taps never read a stale selection
  const toggle = (id: string) => {
    if (!selected.includes(id) && selected.length >= view.maxPerPlay) {
      actions.toast(`You can put down at most ${view.maxPerPlay} cards`);
    }
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= view.maxPerPlay ? prev : [...prev, id];
    });
  };

  const play = async (rank?: Rank) => {
    setBusy(true);
    const ok = await actions.play(selected, rank);
    setBusy(false);
    if (ok) {
      setSelected([]);
      setSheet(null);
    }
  };

  const pass = async () => {
    setBusy(true);
    await actions.pass();
    setBusy(false);
  };

  const callBluff = () => {
    if (!lp) return;
    if (view.config.bluffRule === 'one') setSheet('pick');
    else void actions.bluff(lp.id);
  };

  let status = '';
  if (me?.place) status = `You finished ${placeLabel(me.place)}!`;
  else if (myTurn) status = view.roundRank ? `Your turn · put down ${rankPlural(view.roundRank)} or pass` : 'Your turn · start a new round';
  else if (playing) status = `${name(view.turnId)}'s turn`;

  return (
    <main className="table">
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="topbar-info">
          {view.config.decks === 2 ? '2 decks' : '1 deck'} · {view.config.bluffRule === 'one' ? 'pick one' : 'show all'}
        </span>
        <div className="topbar-actions">
          <button
            className="icon-btn"
            aria-label={sound ? 'Mute voice' : 'Turn voice on'}
            onClick={() => {
              unlockSpeech();
              setSoundOn(!sound);
              setSound(!sound);
            }}
          >
            {sound ? '🔊' : '🔇'}
          </button>
          {isHost && playing && (
            <button
              className="icon-btn"
              aria-label="End game"
              onClick={() => window.confirm('End this game for everyone?') && actions.toLobby()}
            >
              ✕
            </button>
          )}
        </div>
      </header>

      <section className="seats">
        {opponents.map((p) => (
          <Seat key={p.id} player={p} turn={p.id === view.turnId} passed={view.passedIds.includes(p.id)} />
        ))}
      </section>

      <section className="center">
        <div className={cx('round-chip', view.roundRank && 'set')}>
          {view.roundRank ? (
            <>
              Round <b>{rankPlural(view.roundRank)}</b>
            </>
          ) : (
            'New round'
          )}
        </div>
        <Pile count={view.pileCount} />
        <p className="last-play">
          {lp ? (
            <>
              <b>{name(lp.playerId)}</b> put down <b>{claimText(lp.count, lp.rank)}</b>
            </>
          ) : (
            <span className="muted">{myTurn ? 'Pick cards and call any rank' : 'Waiting for the first move'}</span>
          )}
        </p>
        <p className={cx('turn-status', myTurn && 'mine')}>{status}</p>
        {canBluff && lp && (
          <button className="btn danger bluff-btn" onClick={callBluff}>
            Bluff!
            <small>
              {name(lp.playerId)}'s {claimText(lp.count, lp.rank)}
            </small>
          </button>
        )}
      </section>

      <section className="hand-area">
        <div className="hand-head">
          <span>Your cards · {view.hand.length}</span>
          {selected.length > 0 && (
            <button className="link-btn" onClick={() => setSelected([])}>
              Clear {selected.length}
            </button>
          )}
        </div>
        <Hand cards={view.hand} selected={selected} onToggle={toggle} />
      </section>

      <footer className="action-bar">
        {myTurn && view.roundRank && (
          <>
            <button className="btn" disabled={busy} onClick={pass}>
              Pass
            </button>
            <button className="btn primary grow" disabled={busy || selected.length === 0} onClick={() => play()}>
              {selected.length ? `Play ${claimText(selected.length, view.roundRank)}` : 'Select cards'}
            </button>
          </>
        )}
        {myTurn && !view.roundRank && (
          <button className="btn primary grow" disabled={busy || selected.length === 0} onClick={() => setSheet('rank')}>
            {selected.length ? `Put down ${selected.length} · call a rank` : 'Select cards to start'}
          </button>
        )}
        {!myTurn && (
          <p className="hint">
            {selected.length > 0
              ? `${selected.length} selected · play when it's your turn`
              : playing
                ? `Waiting for ${name(view.turnId)}…`
                : ''}
          </p>
        )}
      </footer>

      {sheet === 'rank' && (
        <RankSheet hand={view.hand} selected={selected} busy={busy} onPick={play} onClose={() => setSheet(null)} />
      )}
      {sheet === 'pick' && lp && (
        <PickSheet
          count={lp.count}
          who={name(lp.playerId)}
          claim={claimText(lp.count, lp.rank)}
          onPick={(i) => {
            setSheet(null);
            void actions.bluff(lp.id, i);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {showReveal && view.reveal && (
        <RevealOverlay reveal={view.reveal} name={name} onClose={() => setShowReveal(false)} />
      )}
      {view.phase === 'over' && !showReveal && <GameOver view={view} onLobby={actions.toLobby} />}
    </main>
  );
}
