import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { avatarColor, cx, isRed, SUIT_SYMBOL } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { confettiAt } from '../lib/motion';
import { sfx } from '../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import type { Card, Crazy7View, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble } from '../useBluff';
import { FlyingCards, type Flight } from './FlyingCards';
import { Hand } from './Hand';
import { LevelBadge } from './LevelBadge';
import { Backdrop, GameOver, PlayersSheet } from './Overlays';
import { PlayingCard } from './PlayingCard';
import { QuickChat } from './QuickChat';
import { GameMenu, Seat, SeatSheet, useOnChange } from './Table';

const BUBBLE_MS = 4000;

/** "7♠", "10♥" */
const short = (c: Card) => `${c.rank}${SUIT_SYMBOL[c.suit]}`;

/** the face-down deck; tap it to pick when you may */
function Deck({ count, live, boxRef, onPick }: { count: number; live: boolean; boxRef: RefObject<HTMLButtonElement>; onPick: () => void }) {
  const layers = Math.min(3, Math.max(count, 0));
  return (
    <button
      ref={boxRef}
      type="button"
      className={cx('c7-deck', live && 'live')}
      disabled={!live}
      aria-label={live ? `Pick a card, ${count} left in the deck` : `${count} cards in the deck`}
      onClick={onPick}
    >
      {count === 0 && <span className="c7-empty">Empty</span>}
      {Array.from({ length: layers }, (_, i) => (
        <PlayingCard key={i} faceDown size="md" className="c7-deck-card" style={{ translate: `${i * -2}px ${i * -3}px` } as CSSProperties} />
      ))}
      <span key={count} className="c7-count bump">
        {count}
      </span>
      {live && <span className="c7-deck-tip">Pick</span>}
    </button>
  );
}

/** the pile: the top card face up and a few under it, fanned */
function Pile({ c7, boxRef }: { c7: Crazy7View; boxRef: RefObject<HTMLDivElement> }) {
  const under = c7.under.slice(-3);
  return (
    <div className="c7-pile" ref={boxRef} aria-label={c7.top ? `Top card ${short(c7.top)}, ${c7.pileCount} in the pile` : 'Pile'}>
      {under.map((c, i) => {
        const n = c7.pileCount - under.length + i;
        return (
          <PlayingCard
            key={`${c.id}-${n}`}
            card={c}
            size="md"
            className="c7-under"
            style={{ rotate: `${((n * 47) % 30) - 15}deg`, translate: `${((n * 13) % 13) - 6}px ${((n * 7) % 7) - 3}px` } as CSSProperties}
          />
        );
      })}
      {c7.top && (
        // re-keyed when a new card lands, so it drops in
        <div key={`${c7.top.id}-${c7.pileCount}`} className={cx('c7-top', c7.top.rank === '7' && 'seven')}>
          <PlayingCard card={c7.top} size="lg" />
        </div>
      )}
      <span className="c7-count pile-side">{c7.pileCount}</span>
    </div>
  );
}

/** what the next card must match */
function MatchHint({ c7 }: { c7: Crazy7View }) {
  const top = c7.top;
  if (!top) return null;
  if (c7.penalty > 0) {
    return <p className="c7-hint">Only a 7 can pass it on</p>;
  }
  return (
    <p className="c7-hint">
      Match <b className={cx('c7-suit', isRed(top.suit) && 'red')}>{SUIT_SYMBOL[top.suit]}</b> or <b>{top.rank}</b>
    </p>
  );
}

/** a seat's small line: said last card, one card left, forgot to say it */
function seatTag(c7: Crazy7View, id: string, cards: number) {
  const missed = c7.missed.includes(id);
  const called = c7.called.includes(id);
  if (missed) return <span className="c7-tag miss">🙊 Missed</span>;
  if (called && cards === 1) return <span className="c7-tag call">📢 Last card</span>;
  if (cards === 1) return <span className={cx('c7-tag one', c7.atRisk === id && 'risk')}>1 card!</span>;
  return null;
}

export function Crazy7Table({ view, actions, bubbles, auth }: { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth }) {
  const c7 = view.crazy7;
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<'menu' | 'people' | 'requests' | null>(null);
  // there's no page behind a game: back opens the menu (Stop, Leave…) instead of leaving the app
  useBack(() => setPanel('menu'));
  const [flights, setFlights] = useState<Flight[]>([]);
  const fly = (f: Flight) => setFlights((all) => [...all, f]);
  const [dealing, setDealing] = useState(false);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const freshTimer = useRef<number>();
  /** what each player did last, shown on their seat */
  const [acts, setActs] = useState<Record<string, string>>({});
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmKick, setConfirmKick] = useState<{ id: string; name: string } | null>(null);
  /** watcher stuck to one player; null follows whoever's turn it is */
  const [pinned, setPinned] = useState<string | null>(null);
  /** whose seat I tapped, to throw an emoji or send coins */
  const [target, setTarget] = useState<string | null>(null);
  /** I tapped Pick myself this turn (so an automatic pick can be told apart) */
  const tappedPick = useRef(false);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const pileRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const handRef = useRef<HTMLElement>(null);
  /** my level when this game started, to show a level up at the end */
  const startLevel = useRef<number | null>(null);
  const prevCounts = useRef<Map<string, number> | null>(null);
  const prevTop = useRef<{ id: string | null; pile: number } | null>(null);
  const prevHand = useRef<string[] | null>(null);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const myTurn = playing && !!c7 && view.turnId === view.meId;
  const isHost = view.hostId === view.meId;
  const opponents = view.players.filter((p) => p.id !== view.meId);
  // players who left mid-game still count for names and the pot
  const name = (id: string | null) =>
    id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone');
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const pinnedId = pinned && view.players.some((p) => p.id === pinned) ? pinned : null;
  const followId = watching ? (pinnedId ?? view.turnId ?? view.players[0]?.id ?? null) : null;
  const followed = view.players.find((p) => p.id === followId);
  const targetPlayer = view.players.find((p) => p.id === target && p.id !== view.meId);
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  /** a seat's element, or my hand for me */
  const spotOf = (id: string) => (id === view.meId ? handRef.current : seatEls.current.get(id));

  // someone new asks to watch: the host hears a knock and sees a note, and the game goes on
  const seenRequests = useRef(new Set(view.watchRequests.map((r) => r.id)));
  useEffect(() => {
    const added = view.watchRequests.filter((r) => !seenRequests.current.has(r.id));
    seenRequests.current = new Set(view.watchRequests.map((r) => r.id));
    if (added.length === 0) return;
    sfx.knock();
    actions.toast(added.length === 1 ? `👀 ${added[0].name} wants to watch · tap 👀 to answer` : `👀 ${added.length} people want to watch`);
  }, [view.watchRequests]);

  // a new game (or rematch): cards fly from the deck to every seat and to my hand
  useEffect(() => {
    if (!playing) return;
    prevCounts.current = null;
    prevHand.current = null;
    setActs({});
    setDealing(true);
    sfx.deal();
    startLevel.current = me?.level ?? null;
    const frame = requestAnimationFrame(() => {
      const from = deckRef.current?.getBoundingClientRect();
      if (!from) return;
      const targets = [...opponents.map((p) => seatEls.current.get(p.id)), watching ? null : handRef.current];
      targets.forEach((el, i) => {
        if (el) fly({ key: `deal-${i}-${Date.now()}`, count: 4, from, to: el.getBoundingClientRect(), delay: i * 140, vanish: true });
      });
    });
    const t = setTimeout(() => setDealing(false), 1600);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frame);
    };
  }, [view.phase]);

  // what changed on the table: a card played flies face up to the pile, picked cards fly from the deck
  const flightSeq = useRef(0);
  useEffect(() => {
    if (!c7) return;
    const counts = new Map(view.players.map((p) => [p.id, p.cardCount]));
    const before = prevCounts.current;
    const topBefore = prevTop.current;
    prevCounts.current = counts;
    prevTop.current = { id: c7.top?.id ?? null, pile: c7.pileCount };
    if (!before || !topBefore) return;
    const next: Record<string, string> = {};
    let delay = 0;
    const top = c7.top;
    if (top && (top.id !== topBefore.id || c7.pileCount > topBefore.pile)) {
      const by =
        c7.last?.kind === 'play' && c7.last.playerId
          ? c7.last.playerId
          : view.players.find((p) => (before.get(p.id) ?? 0) > p.cardCount)?.id;
      const from = by ? spotOf(by) : null;
      const to = pileRef.current;
      if (from && to) {
        fly({ key: `play-${++flightSeq.current}`, count: 1, card: top, size: 'md', from: from.getBoundingClientRect(), to: to.getBoundingClientRect() });
      }
      if (top.rank === '7') sfx.seven();
      else sfx.play(1);
      if (by) next[by] = `played ${short(top)}`;
      delay = 280;
    }
    let picked = false;
    for (const p of view.players) {
      const gained = p.cardCount - (before.get(p.id) ?? p.cardCount);
      if (gained <= 0) continue;
      picked = true;
      const from = deckRef.current;
      const to = spotOf(p.id);
      if (from && to) {
        fly({ key: `pick-${++flightSeq.current}`, count: Math.min(gained, 6), from: from.getBoundingClientRect(), to: to.getBoundingClientRect(), delay, vanish: true });
      }
      next[p.id] = `+${gained}`;
    }
    if (picked) window.setTimeout(() => sfx.draw(), delay);
    const last = c7.last;
    if (last?.kind === 'pass' && last.playerId) next[last.playerId] = next[last.playerId] ? `${next[last.playerId]} · passed` : 'passed';
    if (Object.keys(next).length > 0) setActs((prev) => ({ ...prev, ...next }));
  }, [view]);

  // cards that arrive in my hand glow for a moment
  useEffect(() => {
    const ids = view.hand.map((c) => c.id);
    const prev = prevHand.current;
    prevHand.current = ids;
    if (!prev) return;
    const had = new Set(prev);
    const added = ids.filter((id) => !had.has(id));
    if (added.length === 0) return;
    window.clearTimeout(freshTimer.current);
    freshTimer.current = window.setTimeout(() => {
      setFreshIds(added);
      freshTimer.current = window.setTimeout(() => setFreshIds([]), 1600);
    }, 300);
  }, [view.hand]);
  useEffect(() => () => window.clearTimeout(freshTimer.current), []);

  // last card calls ring a bell; a missed call buzzes
  useOnChange(c7?.last?.id ?? null, () => {
    const last = c7?.last;
    if (last?.kind === 'call') sfx.lastCard();
    else if (last?.kind === 'missed') sfx.caught();
    else if (last?.kind === 'shuffle') sfx.deal();
  });

  useOnChange(myTurn, (mine) => {
    tappedPick.current = false;
    if (!mine) return;
    sfx.turn();
    // browsers block vibration until the player has tapped the page once
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(120);
  });

  useOnChange(view.phase, (phase) => {
    if (phase !== 'over' || view.stopped) return;
    (view.loserIds.includes(view.meId) ? sfx.lose : sfx.win)();
    const winner = view.winnerIds[0];
    if (winner) confettiAt(spotOf(winner), winner === view.meId ? { count: 60, spread: 1.3 } : { count: 30, spread: 0.8 });
  });

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    await fn();
    setBusy(false);
  };

  // one tap plays a glowing card; a card that doesn't fit says why
  const tapCard = (id: string) => {
    if (!c7 || !myTurn) return;
    if (!c7.playable.includes(id)) {
      const top = c7.top;
      actions.toast(
        c7.penalty > 0
          ? view.config.stack7
            ? `Only a 7 now, or pick ${c7.penalty}`
            : `Pick ${c7.penalty} first`
          : top
            ? `That card doesn't match ${SUIT_SYMBOL[top.suit]} or ${top.rank}`
            : "That card can't go now",
      );
      return;
    }
    void act(() => actions.c7Play(id));
  };

  const pick = () => {
    tappedPick.current = true;
    void act(() => actions.c7Pick());
  };
  const pass = () => void act(() => actions.c7Pass());
  const call = () => {
    unlockSpeech();
    void actions.c7Call();
  };
  const toggleSound = () => {
    unlockSpeech();
    setSoundOn(!sound);
    setSound(!sound);
  };

  let status = '';
  if (c7 && playing) {
    if (myTurn) {
      if (c7.penalty > 0) status = c7.playable.length > 0 ? `Pick ${c7.penalty} or play a 7` : `Pick ${c7.penalty}`;
      else if (c7.picks > 0) {
        const head = c7.picks === 1 && !tappedPick.current ? 'No match, we picked one for you' : `Picked ${c7.picks} of ${view.config.maxPicks}`;
        status = `${head} · ${c7.playable.length > 0 ? 'play a glowing card or pass' : c7.canPick ? 'pick again or pass' : 'pass'}`;
      } else status = c7.playable.length > 0 ? 'Play a glowing card' : 'Pick a card';
    } else {
      status = `${name(view.turnId)}'s turn`;
    }
  }
  const urgent = !!c7 && c7.atRisk === view.meId;
  const picksLeft = view.config.maxPicks - (c7?.picks ?? 0);

  if (!c7) {
    return (
      <main className="screen center-screen">
        <p className="muted">Dealing…</p>
      </main>
    );
  }

  return (
    <main className="table c7-table">
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="c7-chip">
          7️⃣<span> Crazy 7</span>
        </span>
        {view.config.stake > 0 && <span className="pot-chip">🪙 Pot {compactCoins(pot)}</span>}
        <span className="grow" />
        <div className="topbar-actions">
          {/* host only: people waiting to watch; it pulses and knocks, but never pops up over the game */}
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              <span key={view.watchRequests.length} className="req-ring" aria-hidden />
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
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
            passed={false}
            viewing={watching && p.id === followId}
            action={acts[p.id] ?? null}
            bubble={bubbleOf(p.id)}
            onClick={watching ? () => setPinned(pinnedId === p.id ? null : p.id) : () => setTarget(p.id)}
            label={watching ? `See ${p.name}'s cards` : `Throw an emoji at ${p.name}`}
            tag={seatTag(c7, p.id, p.cardCount)}
            extra={cx(playing && p.cardCount === 1 && 'c7-one', playing && c7.penalty > 0 && p.id === view.turnId && 'c7-hit')}
            seatRef={(el) => {
              if (el) seatEls.current.set(p.id, el);
              else seatEls.current.delete(p.id);
            }}
          />
        ))}
      </section>

      <section className="center c7-center">
        {playing && c7.penalty > 0 ? (
          <div key={`${c7.penalty}-${view.turnId}`} className={cx('c7-banner', myTurn && 'mine')} role="status">
            {myTurn
              ? view.config.stack7 && c7.playable.length > 0
                ? `Pick ${c7.penalty} or play a 7!`
                : `Pick ${c7.penalty}!`
              : `${name(view.turnId)} must pick ${c7.penalty}${view.config.stack7 ? ' or play a 7' : ''}`}
          </div>
        ) : (
          <div className="round-chip set c7-rules-chip">
            Up to <b>{view.config.maxPicks}</b> pick{view.config.maxPicks > 1 ? 's' : ''} a turn{view.config.stack7 ? ' · 7s stack' : ''}
          </div>
        )}
        <div className="c7-board">
          <Deck count={c7.deckCount} live={myTurn && c7.canPick && !busy} boxRef={deckRef} onPick={pick} />
          <Pile c7={c7} boxRef={pileRef} />
        </div>
        {playing && <MatchHint c7={c7} />}
        {!myTurn && status && <p className="turn-status">{status}</p>}
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

      <section
        ref={handRef}
        className={cx('hand-area', watching && 'hidden', myTurn && 'my-turn')}
        data-member={watching ? undefined : view.meId}
      >
        <div className="hand-head">
          {myTurn ? <span className="your-turn">YOUR TURN</span> : <span>Your cards · {view.hand.length}</span>}
          {myTurn && <span className="turn-hint">{status}</span>}
          {!myTurn && c7.called.includes(view.meId) && view.hand.length === 1 && <span className="c7-tag call">📢 Said it</span>}
        </div>
        <Hand
          cards={view.hand}
          playable={myTurn ? c7.playable : undefined}
          dimRest={myTurn && !dealing}
          // always tappable so cards don't remount each turn; taps count only on my turn
          onToggle={watching ? undefined : tapCard}
          deal={dealing}
          fresh={freshIds}
        />
      </section>

      <footer className="action-bar c7-actions">
        {c7.canCall && (
          <button className={cx('btn c7-call', urgent && 'urgent', !myTurn && 'grow')} onClick={call}>
            📢 {urgent ? 'Say LAST CARD now!' : 'Last card!'}
          </button>
        )}
        {myTurn && c7.penalty > 0 && (
          <button className="btn danger grow" disabled={busy || !c7.canPick} onClick={pick}>
            Pick {c7.penalty}
          </button>
        )}
        {myTurn && c7.penalty === 0 && c7.canPick && (
          <button className={cx('btn grow', c7.playable.length === 0 && 'primary')} disabled={busy} onClick={pick}>
            Pick a card · {picksLeft} left
          </button>
        )}
        {myTurn && c7.canPass && (
          <button className={cx('btn', !c7.canPick && c7.playable.length === 0 && 'primary grow')} disabled={busy} onClick={pass}>
            Pass
          </button>
        )}
        {myTurn && c7.penalty === 0 && !c7.canPick && !c7.canPass && !c7.canCall && (
          <p className="hint">Tap a glowing card to play it</p>
        )}
        {!myTurn && !c7.canCall && (
          <p className="hint">
            {watching
              ? view.watchers.find((w) => w.id === view.meId)?.byChoice
                ? '👀 Watching · switch to Playing in the lobby'
                : "👀 Watching · you'll play next game"
              : playing
                ? 'Wait for your turn'
                : ''}
          </p>
        )}
      </footer>

      {view.phase === 'over' && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {targetPlayer && (
        <SeatSheet player={targetPlayer} auth={auth} onThrow={(i) => void actions.throwAt(targetPlayer.id, i)} onClose={() => setTarget(null)} />
      )}
      {flights.map((f) => (
        <FlyingCards key={f.key} flight={f} onDone={() => setFlights((all) => all.filter((x) => x.key !== f.key))} />
      ))}
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
                  setConfirmStop(true);
                }
              : undefined
          }
          onLeave={
            watching
              ? () => {
                  setPanel(null);
                  void actions.leave();
                }
              : playing && me
                ? () => {
                    setPanel(null);
                    setConfirmLeave(true);
                  }
                : undefined
          }
          onClose={() => setPanel(null)}
        />
      )}
      {confirmStop && playing && (
        <Backdrop center onClose={() => setConfirmStop(false)}>
          <div className="confirm-box">
            <h3>Stop this game for everyone?</h3>
            <p className="muted">Nobody wins or loses and no coins move. Everyone goes back to the lobby.</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirmStop(false)}>
                Keep playing
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setConfirmStop(false);
                  void actions.toLobby();
                }}
              >
                Stop game
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {confirmLeave && playing && (
        <Backdrop center onClose={() => setConfirmLeave(false)}>
          <div className="confirm-box">
            <h3>Leave this game?</h3>
            <p className="muted">
              It counts as a loss
              {view.config.stake > 0 ? ` and you still pay your 🪙 ${formatCoins(view.config.stake)} stake` : ''}.
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirmLeave(false)}>
                Stay
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setConfirmLeave(false);
                  void actions.leave();
                }}
              >
                Leave game
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {confirmKick && (
        <Backdrop center onClose={() => setConfirmKick(null)}>
          <div className="confirm-box">
            <h3>Remove {confirmKick.name}?</h3>
            <p className="muted">
              {playing && view.players.some((p) => p.id === confirmKick.id)
                ? "Their cards leave the game and they won't pay or win coins. With only one player left the game stops."
                : 'They leave the room.'}
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirmKick(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  const id = confirmKick.id;
                  setConfirmKick(null);
                  void actions.kick(id);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </Backdrop>
      )}
      {panel === 'requests' && (
        <Backdrop onClose={() => setPanel(null)}>
          <h3>👀 Want to watch</h3>
          <p className="muted small">They joined after the game started. Let them in to watch; they play from the next game.</p>
          {view.watchRequests.length === 0 && <p className="muted small">No one is waiting.</p>}
          <ul className="player-list">
            {view.watchRequests.map((r) => (
              <li key={r.id} className="player-row">
                <span className="avatar sm" style={{ background: avatarColor(r.name) }}>
                  {r.name[0]?.toUpperCase()}
                </span>
                <span className="grow">
                  {r.name} {r.registered ? <LevelBadge level={r.level} /> : <span className="muted small">guest</span>}
                </span>
                <button className="btn small ghost" onClick={() => void actions.admit(r.id, false)}>
                  No
                </button>
                <button className="btn small primary" onClick={() => void actions.admit(r.id, true)}>
                  Let in
                </button>
              </li>
            ))}
          </ul>
          {view.watchRequests.length > 1 && (
            <button className="btn block" onClick={() => view.watchRequests.forEach((r) => void actions.admit(r.id, true))}>
              Let everyone in
            </button>
          )}
          <button className="btn ghost block" onClick={() => setPanel(null)}>
            Close
          </button>
        </Backdrop>
      )}
      {panel === 'people' && (
        <PlayersSheet
          view={view}
          onRemove={(id, who) => {
            setPanel(null);
            setConfirmKick({ id, name: who });
          }}
          onClose={() => setPanel(null)}
        />
      )}
    </main>
  );
}
