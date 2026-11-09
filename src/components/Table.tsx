import { useEffect, useRef, useState, type RefObject } from 'react';
import { avatarColor, claimText, cx, placeLabel, rankPlural } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { sfx } from '../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import type { Card, PublicPlayer, Rank, RoomView } from '../types';
import type { Actions, ChatBubble } from '../useBluff';
import { FlyingCards, type Flight } from './FlyingCards';
import { Hand } from './Hand';
import { Backdrop, GameOver, PickSheet, PlayersSheet, RankSheet, RevealOverlay } from './Overlays';
import { PlayingCard } from './PlayingCard';
import { QuickChat } from './QuickChat';

interface SeatProps {
  player: PublicPlayer;
  turn: boolean;
  passed: boolean;
  /** a watcher is looking at this player's cards */
  viewing?: boolean;
  /** what this player just did, e.g. "3 × Q" */
  action?: string | null;
  bubble?: ChatBubble | null;
  onClick?: () => void;
  /** where played cards fly from */
  seatRef?: (el: HTMLElement | null) => void;
}

function Seat({ player, turn, passed, viewing, action, bubble, onClick, seatRef }: SeatProps) {
  const badge = player.place ? placeLabel(player.place) : !player.connected ? 'offline' : passed ? 'pass' : null;
  const className = cx('seat', turn && 'turn', viewing && 'viewing', !player.connected && 'offline', player.place && 'done');
  const body = (
    <>
      {viewing && <span className="eye-badge">👁</span>}
      {badge && <span className={cx('badge', player.place && 'gold')}>{badge}</span>}
      <span className="avatar" style={{ background: avatarColor(player.name) }}>
        {player.name[0]?.toUpperCase()}
        {player.level && <span className="seat-lv">{player.level}</span>}
      </span>
      <span className="seat-name">{player.name}</span>
      <span className="seat-count">
        <i className="mini-back" />
        {player.cardCount}
      </span>
      {action && <span className="seat-action">{action}</span>}
      {bubble && (
        <span key={bubble.key} className="seat-bubble">
          {bubble.text}
        </span>
      )}
    </>
  );
  return onClick ? (
    <button
      ref={seatRef}
      type="button"
      className={className}
      aria-pressed={viewing}
      aria-label={`See ${player.name}'s cards`}
      onClick={onClick}
    >
      {body}
    </button>
  ) : (
    <div ref={seatRef} className={className}>
      {body}
    </div>
  );
}

/** watchers see what was really put down, outlined green (matches the claim) or red */
function TruthRow({ cards, claim }: { cards: Card[]; claim: Rank }) {
  const lie = cards.some((c) => c.rank !== claim);
  return (
    <div className="truth-row" aria-label="Cards actually played">
      <div className="truth-cards">
        {cards.map((c) => (
          <div key={c.id} className={cx('truth-card', c.rank === claim ? 'match' : 'miss')}>
            <PlayingCard card={c} size="sm" />
          </div>
        ))}
      </div>
      <span className={cx('truth-tag', lie ? 'lie' : 'true')}>{lie ? 'Bluff!' : 'Truth'}</span>
    </div>
  );
}

function Pile({ count, boxRef }: { count: number; boxRef: RefObject<HTMLDivElement> }) {
  const shown = Math.min(count, 7);
  return (
    <div className="pile" ref={boxRef} aria-label={`${count} cards in the pile`}>
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

/** ⋯ menu: game info, sound, and host or watcher actions, kept out of the crowded top bar */
function GameMenu({
  view,
  sound,
  onToggleSound,
  onPeople,
  onStop,
  onEnd,
  onLeave,
  onClose,
}: {
  view: RoomView;
  sound: boolean;
  onToggleSound: () => void;
  onPeople?: () => void;
  onStop?: () => void;
  /** host, once someone has won */
  onEnd?: () => void;
  onLeave?: () => void;
  onClose: () => void;
}) {
  const winner = view.players.find((p) => p.place === 1);
  const c = view.config;
  return (
    <Backdrop onClose={onClose}>
      <h3>Room {view.code}</h3>
      <p className="game-rules-line">
        {c.decks === 2 ? '2 decks' : '1 deck'} · {c.bluffRule === 'one' ? 'Pick one card' : 'Show all cards'} ·{' '}
        {c.stake > 0 ? `🪙 ${formatCoins(c.stake)} each` : 'Free game'}
        {view.watchers.length > 0 && ` · 👀 ${view.watchers.length} watching`}
      </p>
      <div className="menu-buttons">
        <button className="btn block" onClick={onToggleSound}>
          {sound ? '🔊 Sound on · tap to mute' : '🔇 Sound off · tap to turn on'}
        </button>
        {onPeople && (
          <button className="btn block" onClick={onPeople}>
            👥 People in this room
          </button>
        )}
        {onEnd && winner && (
          <button className="btn block" onClick={onEnd}>
            🏁 End game · {winner.name} wins
          </button>
        )}
        {onStop && (
          <button className="btn block danger-text" onClick={onStop}>
            ⏹ Stop game for everyone
          </button>
        )}
        {onLeave && (
          <button className="btn block ghost" onClick={onLeave}>
            🚪 Leave room
          </button>
        )}
      </div>
    </Backdrop>
  );
}

/** calls fn when value changes, never on the first render */
function useOnChange<T>(value: T, fn: (next: T) => void) {
  const prev = useRef(value);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    fn(value);
  });
}

const BUBBLE_MS = 4000;
const DOUBLE_TAP_MS = 350;

export function Table({ view, actions, bubbles }: { view: RoomView; actions: Actions; bubbles: ChatBubble[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sheet, setSheet] = useState<'rank' | 'pick' | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [busy, setBusy] = useState(false);
  /** watcher stuck to one player; null follows whoever's turn it is */
  const [pinned, setPinned] = useState<string | null>(null);
  const [panel, setPanel] = useState<'menu' | 'people' | null>(null);
  // there's no page behind a game: back opens the menu (Stop, Leave…) instead of leaving the app
  useBack(() => setPanel('menu'));
  const [flight, setFlight] = useState<Flight | null>(null);
  const [dealing, setDealing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const pileRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLElement>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  /** my level when this game started, to show a level up at the end */
  const startLevel = useRef<number | null>(null);

  const me = view.players.find((p) => p.id === view.meId);
  const name = (id: string | null) => (id === view.meId ? 'You' : (view.players.find((p) => p.id === id)?.name ?? 'Someone'));
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turnId === view.meId;
  const lp = view.lastPlay;
  const canBluff = playing && !!lp && lp.playerId !== view.meId && (me?.cardCount ?? 0) > 0;
  const bluffLocked = view.bluffCallsLeft === 0;
  const isHost = view.hostId === view.meId;
  // once someone has finished 1st the host may end the game; everyone else then loses
  const winner = view.players.find((p) => p.place === 1);
  const canEnd = isHost && playing && !!winner;
  // joined mid-game or the room was full: see the table, no hand
  const watching = !me;
  const opponents = view.players.filter((p) => p.id !== view.meId);
  const pinnedId = pinned && view.players.some((p) => p.id === pinned) ? pinned : null;
  const followId = watching ? (pinnedId ?? view.turnId ?? lp?.playerId ?? view.players[0]?.id ?? null) : null;
  const followed = view.players.find((p) => p.id === followId);
  // everyone still holds an even share: the cards were just dealt
  const perPlayer = (view.config.decks * 52) / Math.max(view.players.length, 1);
  const freshDeal = playing && !lp && view.pileCount === 0 && view.players.every((p) => Math.abs(p.cardCount - perPlayer) < 1);

  // quick messages: on the sender's seat, or as a line in the middle for me and watchers
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const seatIds = new Set(opponents.map((p) => p.id));
  const middleChats = fresh.filter((b) => !seatIds.has(b.from)).slice(-2);

  // drop selected cards that left the hand
  useEffect(() => {
    const ids = new Set(view.hand.map((c) => c.id));
    setSelected((prev) => (prev.every((id) => ids.has(id)) ? prev : prev.filter((id) => ids.has(id))));
  }, [view.hand]);

  // a new game (or rematch) deals new cards; card ids repeat between games, so start clean
  useEffect(() => {
    setSelected([]);
    if (!freshDeal) return;
    setDealing(true);
    sfx.deal();
    const t = setTimeout(() => setDealing(false), 1600);
    return () => clearTimeout(t);
  }, [view.phase]);

  useEffect(() => {
    // a quick next play clears the reveal before its timer ends, so close it here too
    if (!view.reveal) {
      setShowReveal(false);
      return;
    }
    setShowReveal(true);
    const t = setTimeout(() => setShowReveal(false), 5000);
    return () => clearTimeout(t);
  }, [view.reveal?.playId]);

  useEffect(() => {
    setSheet((s) => (s === 'pick' ? null : s));
  }, [lp?.id]);

  useEffect(() => {
    // browsers block vibration until the player has tapped the page once
    if (myTurn && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(120);
    else setSheet((s) => (s === 'rank' ? null : s));
  }, [myTurn]);

  useEffect(() => {
    if (playing) startLevel.current = me?.level ?? null;
  }, [playing]);

  // sounds and card motion follow what changed on the table
  useOnChange(lp?.id ?? null, (id) => {
    if (!id || !lp) return;
    sfx.play(lp.count);
    const from = lp.playerId === view.meId ? handRef.current : seatEls.current.get(lp.playerId);
    const to = pileRef.current;
    if (from && to) {
      setFlight({ key: id, count: Math.min(lp.count, 6), from: from.getBoundingClientRect(), to: to.getBoundingClientRect() });
    }
  });
  useOnChange(view.passedIds.length, (n) => n > 0 && sfx.pass());
  useOnChange(view.reveal?.playId ?? null, (id) => id && view.reveal && (view.reveal.bluff ? sfx.caught() : sfx.truth()));
  useOnChange(myTurn, (mine) => mine && sfx.turn());
  useOnChange(view.phase, (phase) => {
    if (phase === 'over' && !view.stopped) (view.loserIds.includes(view.meId) ? sfx.lose : sfx.win)();
  });

  // functional update so quick taps never read a stale selection; tap order is the order others see
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // a quick second tap on the same card selects every card of that rank, tapped card first
  const tapCard = (id: string) => {
    const now = Date.now();
    const prev = lastTap.current;
    if (prev?.id === id && now - prev.at < DOUBLE_TAP_MS) {
      lastTap.current = null;
      const rank = view.hand.find((c) => c.id === id)?.rank;
      const same = view.hand.filter((c) => c.rank === rank && c.id !== id).map((c) => c.id);
      setSelected((cur) => [...cur.filter((x) => x !== id), id, ...same.filter((x) => !cur.includes(x))]);
      return;
    }
    lastTap.current = { id, at: now };
    toggle(id);
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

  const callBluff = async () => {
    if (!lp || bluffLocked || busy) return;
    if (view.config.bluffRule === 'one') {
      setSheet('pick');
      return;
    }
    setBusy(true);
    await actions.bluff(lp.id);
    setBusy(false);
  };

  const toggleSound = () => {
    unlockSpeech();
    setSoundOn(!sound);
    setSound(!sound);
  };

  let status = '';
  if (me?.place) status = `You finished ${placeLabel(me.place)}!`;
  else if (myTurn) status = view.roundRank ? `Put down ${rankPlural(view.roundRank)} or pass` : 'New round · call any rank';
  else if (playing) status = `${name(view.turnId)}'s turn`;

  return (
    <main className="table">
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        {view.config.stake > 0 && <span className="pot-chip">🪙 Pot {compactCoins(view.config.stake * view.players.length)}</span>}
        <span className="grow" />
        <div className="topbar-actions">
          <QuickChat onSend={actions.chat} />
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>

      <section className="seats">
        {opponents.map((p) => (
          <Seat
            key={p.id}
            player={p}
            turn={p.id === view.turnId}
            passed={view.passedIds.includes(p.id)}
            viewing={watching && p.id === followId}
            action={lp?.playerId === p.id ? `${lp.count} × ${lp.rank}` : null}
            bubble={bubbleOf(p.id)}
            onClick={watching ? () => setPinned(pinnedId === p.id ? null : p.id) : undefined}
            seatRef={(el) => {
              if (el) seatEls.current.set(p.id, el);
              else seatEls.current.delete(p.id);
            }}
          />
        ))}
      </section>

      <section className="center">
        <div className={cx('round-chip', view.roundRank ? 'set' : 'blank')} aria-hidden={!view.roundRank}>
          Round <b>{view.roundRank ? rankPlural(view.roundRank) : '–'}</b>
        </div>
        <Pile count={view.pileCount} boxRef={pileRef} />
        {lp && (
          <p className="last-play">
            <b>{name(lp.playerId)}</b> put down <b>{claimText(lp.count, lp.rank)}</b>
          </p>
        )}
        {watching && lp && view.watch?.lastPlayCards && <TruthRow cards={view.watch.lastPlayCards} claim={lp.rank} />}
        {!myTurn && status && <p className="turn-status">{status}</p>}
        {middleChats.map((b) => (
          <p key={b.key} className="chat-line">
            <b>{name(b.from) === 'Someone' ? (view.watchers.find((w) => w.id === b.from)?.name ?? 'Someone') : name(b.from)}:</b> {b.text}
          </p>
        ))}
        {canBluff && lp && (
          <button
            className={cx('btn danger bluff-btn', bluffLocked && 'locked')}
            disabled={bluffLocked || busy}
            onClick={callBluff}
          >
            {bluffLocked ? 'Bluff locked' : 'Bluff!'}
            {bluffLocked ? <small>Play or pass first</small> : view.bluffCallsLeft === 1 && <small>1 call left</small>}
          </button>
        )}
        {canEnd && (
          <button className="btn small ghost end-btn" onClick={() => setConfirmEnd(true)}>
            🏁 End game · {winner!.name} wins
          </button>
        )}
      </section>

      {watching && (
        <section className="hand-area watch-hand">
          <div className="hand-head">
            <span>{followed ? `👁 ${followed.name} · ${followed.cardCount} cards` : '👀 Watching'}</span>
            {pinnedId ? (
              <button className="link-btn" onClick={() => setPinned(null)}>
                Follow turn
              </button>
            ) : (
              <span>Tap a player to pin</span>
            )}
          </div>
          {followId && <Hand cards={view.watch?.hands[followId] ?? []} />}
        </section>
      )}

      <section ref={handRef} className={cx('hand-area', watching && 'hidden', myTurn && 'my-turn')}>
        <div className="hand-head">
          {myTurn ? <span className="your-turn">YOUR TURN</span> : <span>Your cards · {view.hand.length}</span>}
          {myTurn && <span className="turn-hint">{status}</span>}
          {selected.length > 0 ? (
            <button className="link-btn" onClick={() => setSelected([])}>
              Clear {selected.length}
            </button>
          ) : (
            !myTurn && view.hand.length > 1 && <span className="tap-tip">Double-tap = all of a rank</span>
          )}
        </div>
        <Hand cards={view.hand} selected={selected} onToggle={tapCard} deal={dealing} />
      </section>

      <footer className="action-bar">
        {myTurn && view.roundRank && (
          <>
            <button className="btn" disabled={busy} onClick={pass}>
              Pass
            </button>
            <button className="btn primary grow" disabled={busy || selected.length === 0} onClick={() => play()}>
              {selected.length ? `Play ${claimText(selected.length, view.roundRank)}` : 'Tap cards to select'}
            </button>
          </>
        )}
        {myTurn && !view.roundRank && (
          <button className="btn primary grow" disabled={busy || selected.length === 0} onClick={() => setSheet('rank')}>
            {selected.length ? `Put down ${selected.length} · call a rank` : 'Tap cards to select'}
          </button>
        )}
        {!myTurn && (
          <p className="hint">
            {watching
              ? view.watchers.find((w) => w.id === view.meId)?.byChoice
                ? '👀 Watching · switch to Playing in the lobby'
                : "👀 Watching · you'll play next game"
              : selected.length > 0
                ? `${selected.length} selected · play on your turn`
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
      {view.phase === 'over' && !(showReveal && view.reveal) && (
        <GameOver
          view={view}
          onLobby={actions.toLobby}
          onRematch={isHost ? actions.rematch : undefined}
          startLevel={startLevel.current}
        />
      )}
      {flight && (
        <FlyingCards key={flight.key} flight={flight} onDone={() => setFlight((f) => (f?.key === flight.key ? null : f))} />
      )}
      {panel === 'menu' && (
        <GameMenu
          view={view}
          sound={sound}
          onToggleSound={toggleSound}
          onPeople={isHost ? () => setPanel('people') : undefined}
          onStop={
            isHost && playing
              ? () => {
                  setPanel(null);
                  if (window.confirm('Stop this game for everyone? No coins will move.')) void actions.toLobby();
                }
              : undefined
          }
          onEnd={
            canEnd
              ? () => {
                  setPanel(null);
                  setConfirmEnd(true);
                }
              : undefined
          }
          onLeave={
            watching
              ? () => {
                  setPanel(null);
                  void actions.leave();
                }
              : undefined
          }
          onClose={() => setPanel(null)}
        />
      )}
      {confirmEnd && winner && (
        <Backdrop center onClose={() => setConfirmEnd(false)}>
          <div className="confirm-box">
            <h3>End the game now?</h3>
            <p className="muted">
              {winner.name} finished 1st and wins. Everyone else loses
              {view.config.stake > 0 ? ` and the 🪙 ${formatCoins(view.config.stake * view.players.length)} pot goes to ${winner.name}` : ''}.
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirmEnd(false)}>
                Keep playing
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setConfirmEnd(false);
                  void actions.endGame();
                }}
              >
                End game
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {panel === 'people' && (
        <PlayersSheet
          view={view}
          onRemove={(id, who) => {
            const mid = view.phase === 'playing' && view.players.some((p) => p.id === id);
            const warn = mid ? ` Their cards leave the game and they won't pay or win coins.` : '';
            if (window.confirm(`Remove ${who} from the room?${warn}`)) void actions.kick(id);
          }}
          onClose={() => setPanel(null)}
        />
      )}
    </main>
  );
}
