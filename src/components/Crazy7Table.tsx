import { Fragment, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cx, isRed, SUIT_NAME, SUIT_SYMBOL } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { auraOf } from '../lib/aura';
import { backOf } from '../lib/look';
import { confettiAt } from '../lib/motion';
import { useNewCards } from '../lib/newCards';
import { useOneCardAlert } from '../lib/spotlight';
import { sfx } from '../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import { SUITS, type Card, type Crazy7View, type RoomView, type Suit } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble, Note } from '../useBluff';
import { FlyingCards, type Flight } from './FlyingCards';
import { Hand } from './Hand';
import { FanHand } from './FanHand';
import { OnTable, seatSpots, TableScene } from './TableScene';
import { OppCards } from './Table3D';
import { TableInfo } from './TableInfo';
import { Deck3D, Discard3D } from './C7Table3D';
import { useLandscape } from '../lib/useLandscape';
import { LevelUp } from './LevelUp';
import { PileReact } from './PileReact';
import { LevelBadge } from './LevelBadge';
import { Backdrop, GameOver, PlayersSheet } from './Overlays';
import { PlayingCard } from './PlayingCard';
import { QuickChat } from './QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from './LiveVoice';
import { useTableFx } from './TableFx';
import { useCardRects } from '../lib/cardRects';
import { GameMenu, Seat, SeatSheet, useOnChange } from './Table';
import { StreakMark, TurnCountdown, useTurnEndsAt } from './TurnTimer';
import { Avatar } from './Avatar';
import { SecretChip } from './SecretMissions';

const BUBBLE_MS = 4000;

/** "7♠", "10♥" */
const short = (c: Card) => `${c.rank}${SUIT_SYMBOL[c.suit]}`;

/** the face-down deck; tap it to pick when you may */
function Deck({ count, live, penalty, boxRef, onPick }: { count: number; live: boolean; penalty: number; boxRef: RefObject<HTMLButtonElement>; onPick: () => void }) {
  const layers = Math.min(3, Math.max(count, 0));
  // while a 7's pick waits, tapping takes all of it
  const tip = penalty > 0 ? `Pick ${penalty}` : 'Pick';
  return (
    <button
      ref={boxRef}
      type="button"
      className={cx('c7-deck', live && 'live')}
      disabled={!live}
      aria-label={live ? (penalty > 0 ? `Pick ${penalty} cards, ${count} left in the deck` : `Pick a card, ${count} left in the deck`) : `${count} cards in the deck`}
      onClick={onPick}
    >
      {count === 0 && <span className="c7-empty">Empty</span>}
      {/* landscape: the deck's thickness, more as it grows */}
      {count > 0 && <span className="c7-deck-depth" style={{ ['--depth' as string]: Math.min(count, 60) } as CSSProperties} aria-hidden />}
      {Array.from({ length: layers }, (_, i) => (
        <PlayingCard key={i} faceDown size="md" className="c7-deck-card" style={{ translate: `${i * -2}px ${i * -3}px` } as CSSProperties} />
      ))}
      <span key={count} className="c7-count bump">
        {count}
      </span>
      {live && <span className="c7-deck-tip">{tip}</span>}
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
        <div
          key={`${c7.top.id}-${c7.pileCount}`}
          className={cx('c7-top', c7.top.rank === '7' && 'seven')}
          style={{ ['--tilt' as string]: `${((c7.pileCount * 37) % 15) - 7}deg` } as CSSProperties}
        >
          <PlayingCard card={c7.top} size="lg" />
        </div>
      )}
      <span className="c7-count pile-side">{c7.pileCount}</span>
    </div>
  );
}

/** what the next card must match; with power cards a J's suit, or a 7 or 2 passing a pick on */
function MatchHint({ c7, power }: { c7: Crazy7View; power: boolean }) {
  const top = c7.top;
  if (!top) return null;
  if (c7.penalty > 0) {
    return <p className="c7-hint">{power ? 'Only a 7 or a 2 can pass it on' : 'Only a 7 can pass it on'}</p>;
  }
  if (power && c7.wish) {
    return (
      <p className="c7-hint">
        Match <b className={cx('c7-suit', isRed(c7.wish) && 'red')}>{SUIT_SYMBOL[c7.wish]}</b> or a <b>J</b>
      </p>
    );
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

export function Crazy7Table({ view, actions, bubbles, auth, notes = [] }: { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth; notes?: Note[] }) {
  const c7 = view.crazy7;
  const [busy, setBusy] = useState(false);
  const land = useLandscape();
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<'menu' | 'people' | 'requests' | null>(null);
  // there's no page behind a game: back opens the menu (Stop, Leave…) instead of leaving the app
  useBack(() => setPanel('menu'));
  const [flights, setFlights] = useState<Flight[]>([]);
  const fly = (f: Flight) => setFlights((all) => [...all, f]);
  const [dealing, setDealing] = useState(false);
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
  /** power cards: the J waiting for me to name a suit */
  const [jackId, setJackId] = useState<string | null>(null);
  /** my "last card" request is on its way */
  const [calling, setCalling] = useState(false);
  /** when "Wait for your turn" was last shown */
  const waitNote = useRef(0);
  /** who had said last card or been caught, and the deck size, in the last view */
  const prevMarks = useRef<{ called: string[]; missed: string[]; deck: number } | null>(null);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const pileRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const handRef = useRef<HTMLElement>(null);
  // where each of my cards sat, so a played card flies from its own place
  const cardRect = useCardRects(handRef);
  /** my level when this game started, to show a level up at the end */
  const startLevel = useRef<number | null>(null);
  const levelShown = useRef(false);
  const prevCounts = useRef<Map<string, number> | null>(null);
  const prevTop = useRef<{ id: string | null; pile: number } | null>(null);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const myTurn = playing && !!c7 && view.turnId === view.meId;
  const turnEndsAt = useTurnEndsAt(view);
  const isHost = view.hostId === view.meId;
  // the server lets anyone stop a game whose host is offline, so it can't hang forever
  const hostOffline = ![...view.players, ...view.watchers].find((p) => p.id === view.hostId)?.connected;
  // seats start from the player after me, so the order round the table reads left to right
  const myIndex = view.players.findIndex((p) => p.id === view.meId);
  const opponents = myIndex < 0 ? view.players : [...view.players.slice(myIndex + 1), ...view.players.slice(0, myIndex)];
  const power = !!view.config.c7Power;
  /** who plays after me (the other way round after an A): my 7 hits them, and their move closes my last-card window */
  const nextId = myIndex < 0 ? null : ((c7?.dir === -1 ? [...opponents].reverse() : opponents).find((p) => p.cardCount > 0)?.id ?? null);
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
    prevMarks.current = null;
    setActs({});
    startLevel.current = me?.level ?? null;
    levelShown.current = false;
    // a reload or rejoin mid-game shows the table as it is
    const freshDeal = !!c7 && c7.pileCount === 1 && view.players.every((p) => p.cardCount <= view.config.handSize + 1);
    if (!freshDeal) return;
    setDealing(true);
    sfx.deal();
    const frame = requestAnimationFrame(() => {
      const from = deckRef.current?.getBoundingClientRect();
      if (!from) return;
      const targets = [...opponents.map((p) => seatEls.current.get(p.id)), watching ? null : handRef.current];
      const owners = [...opponents.map((p) => p.id), view.meId];
      // cards going into a hand show in that player's card back
      targets.forEach((el, i) => {
        if (el) fly({ key: `deal-${i}-${Date.now()}`, count: 4, from, to: el.getBoundingClientRect(), delay: i * 140, vanish: true, backs: [backOf(view.players, owners[i])], auras: [auraOf(view.players, owners[i])] });
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
  // Uno-style moments for the power cards and the 7: skip, reverse, +2, a J's suit, last card, caught
  const { fx, layer: fxLayer } = useTableFx();
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
        // my own card leaves from where it sat in my hand, at its own size
        const mine = by === view.meId ? cardRect(top.id) : undefined;
        // my own card already flew the moment I tapped it
        if (flown.current.has(top.id)) flown.current.delete(top.id);
        else fly({ key: `play-${++flightSeq.current}`, count: 1, card: top, size: 'md', from: mine ?? from.getBoundingClientRect(), startWidth: mine?.width, to: to.getBoundingClientRect(), onTable: land });
      }
      if (top.rank === '7') sfx.seven();
      else if (by !== view.meId) sfx.play(1);
      if (by) next[by] = `played ${short(top)}`;
      // the card's big moment, once it has landed
      const card = top;
      window.setTimeout(() => {
        const pile = pileRef.current;
        if (card.rank === '7' || (power && card.rank === '2')) fx('draw', pile, { text: `+${c7.penalty > 0 ? c7.penalty : 2}` });
        else if (power && card.rank === '8') {
          sfx.skip();
          fx('skip', pile);
        } else if (power && card.rank === 'A') {
          sfx.reverse();
          fx('reverse', pile);
        } else if (power && card.rank === 'J' && c7.wish) {
          sfx.wild();
          fx('wild', pile, { text: `${SUIT_SYMBOL[c7.wish]} ${SUIT_NAME[c7.wish].toUpperCase()}!`, color: isRed(c7.wish) ? '#e2342f' : '#f2f7f4' });
        }
      }, 420);
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
        fly({
          key: `pick-${++flightSeq.current}`,
          count: Math.min(gained, 6),
          from: from.getBoundingClientRect(),
          to: to.getBoundingClientRect(),
          delay,
          vanish: true,
          backs: [p.back],
          auras: [p.shop?.aura ?? null],
        });
      }
      next[p.id] = `+${gained}`;
      // a 7's (or 2's) penalty lands on its player
      if (gained > 1 && to) window.setTimeout(() => fx('draw', to, { text: `+${gained}` }), delay + 300);
    }
    if (picked) window.setTimeout(() => sfx.draw(), delay);
    const last = c7.last;
    if (last?.kind === 'pass' && last.playerId) next[last.playerId] = next[last.playerId] ? `${next[last.playerId]} · passed` : 'passed';
    if (Object.keys(next).length > 0) setActs((prev) => ({ ...prev, ...next }));
  }, [view]);

  // cards that came into my hand (picked, or a 7's penalty) are marked for a few seconds
  const newIds = useNewCards(view.hand, { reset: view.phase });

  // anyone down to one card gets a spotlight (me too: my hand glows), with a heartbeat when it starts
  const oneCard = playing ? view.players.filter((p) => p.cardCount === 1).map((p) => p.id) : [];
  useOneCardAlert(oneCard);
  /** my new level once a game lifted it; the level-up screen shows over the results */
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const myLevel = view.coinResults?.find((r) => r.playerId === view.meId)?.level ?? null;
  useEffect(() => {
    if (view.phase !== 'over' || levelShown.current || myLevel === null || startLevel.current === null || myLevel <= startLevel.current) return;
    levelShown.current = true;
    setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  // someone said last card (bell), someone was caught (buzz), the pile was shuffled into the deck
  useEffect(() => {
    if (!c7) return;
    const before = prevMarks.current;
    prevMarks.current = { called: c7.called, missed: c7.missed, deck: c7.deckCount };
    if (!before) return;
    const caught = c7.missed.filter((id) => !before.missed.includes(id));
    const said = c7.called.filter((id) => !before.called.includes(id));
    if (caught.length) sfx.caught();
    else if (said.length) sfx.lastCard();
    // the shout bursts from whoever said it; a stamp on whoever forgot
    said.forEach((id) => fx('call', spotOf(id)));
    caught.forEach((id) => fx('missed', spotOf(id)));
    if (c7.deckCount > before.deck) sfx.shuffle();
  }, [view]);

  // each new turn of mine, even one that comes straight back to me
  useOnChange(myTurn ? (c7?.turn ?? null) : null, (turn) => {
    tappedPick.current = false;
    if (turn === null) return;
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
  /** cards I just played, already flying; hidden from my hand until the server confirms */
  const [sending, setSending] = useState<string[]>([]);
  const flown = useRef(new Set<string>());
  useEffect(() => {
    setSending((ids) => (ids.length && ids.every((id) => view.hand.some((c) => c.id === id)) ? ids : []));
  }, [view.hand]);
  // play a card without waiting for the server: it flies now, comes back if the server says no
  const playNow = async (id: string, suit?: Suit) => {
    if (busy) return;
    const card = view.hand.find((c) => c.id === id);
    const from = cardRect(id);
    const to = pileRef.current?.getBoundingClientRect();
    if (card && from && to) {
      sfx.play(1);
      fly({ key: `mine-${++flightSeq.current}`, count: 1, card, size: 'md', from, startWidth: from.width, to, onTable: land });
      flown.current.add(id);
    }
    setSending([id]);
    setBusy(true);
    const ok = await actions.c7Play(id, suit);
    setBusy(false);
    if (!ok) {
      flown.current.delete(id);
      setSending([]);
    }
  };

  // my hand without the card on its way to the pile
  const handNow = sending.length ? view.hand.filter((c) => !sending.includes(c.id)) : view.hand;

  // one tap plays a glowing card; a card that doesn't fit says why
  const tapCard = (id: string) => {
    if (!c7) return;
    if (!myTurn) {
      if (playing && Date.now() - waitNote.current > 2500) {
        waitNote.current = Date.now();
        actions.toast('Wait for your turn');
      }
      return;
    }
    if (!c7.playable.includes(id)) {
      const top = c7.top;
      actions.toast(
        c7.penalty > 0
          ? view.config.stack7
            ? `Only a ${power ? '7 or a 2' : '7'} now, or pick ${c7.penalty}`
            : `Pick ${c7.penalty} first`
          : power && c7.wish
            ? `Only ${SUIT_SYMBOL[c7.wish]} or a J now`
            : top
              ? `That card doesn't match ${SUIT_SYMBOL[top.suit]} or ${top.rank}`
              : "That card can't go now",
      );
      return;
    }
    // a power J names a suit first
    if (power && view.hand.find((x) => x.id === id)?.rank === 'J') return setJackId(id);
    void playNow(id);
  };
  const playJack = (suit: Suit) => {
    const id = jackId;
    setJackId(null);
    if (id) void playNow(id, suit);
  };

  const pick = () => {
    tappedPick.current = true;
    void act(() => actions.c7Pick());
  };
  const pass = () => void act(() => actions.c7Pass());
  const call = async () => {
    if (calling) return;
    unlockSpeech();
    setCalling(true);
    await actions.c7Call();
    setCalling(false);
  };
  const toggleSound = () => {
    unlockSpeech();
    setSoundOn(!sound);
    setSound(!sound);
  };

  let status = '';
  if (c7 && playing && c7.auto && view.turnId) {
    // the room is about to pick or pass for the player on turn, a moment later so everyone can follow
    const who = myTurn ? 'You' : name(view.turnId);
    if (c7.missed.includes(view.turnId)) status = myTurn ? 'Missed last card · picking 1 for you…' : `${who} missed last card · picking 1…`;
    else if (c7.penalty > 0) status = myTurn ? `Picking ${c7.penalty} for you…` : `${who} picks ${c7.penalty}…`;
    else if (c7.picks === 0) status = myTurn ? 'No matching card · picking one for you…' : `${who} has no match · picking a card…`;
    else status = myTurn ? 'Still no match · your turn passes…' : `${who}: still no match · passing…`;
  } else if (c7 && playing) {
    if (myTurn) {
      if (c7.penalty > 0) status = c7.playable.length > 0 ? `Pick ${c7.penalty} or play a ${power ? '7 or 2' : '7'}` : `Pick ${c7.penalty}`;
      else if (c7.picks > 0) {
        const head = c7.picks === 1 && !tappedPick.current ? 'No match, we picked one for you' : `Picked ${c7.picks} of ${view.config.maxPicks}`;
        // Pass only stops picking early; at the limit a card that fits must be played
        const choices = [c7.playable.length > 0 && 'play a glowing card', c7.canPick && 'pick again', c7.canPass && 'pass'].filter(Boolean);
        status = `${head} · ${choices.join(' or ') || 'play a glowing card'}`;
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

  // table pieces, laid out differently in portrait and landscape
  const banner =
    playing && c7.penalty > 0 ? (
      <div key={`${c7.penalty}-${view.turnId}`} className={cx('c7-banner', myTurn && 'mine')} role="status">
        {myTurn
          ? view.config.stack7 && c7.playable.length > 0
            ? `Pick ${c7.penalty} or play a ${power ? '7 or 2' : '7'}!`
            : `Pick ${c7.penalty}!`
          : `${name(view.turnId)} must pick ${c7.penalty}${view.config.stack7 ? ` or play a ${power ? '7 or 2' : '7'}` : ''}`}
      </div>
    ) : null;
  const rulesChip = (
    <div className="round-chip set c7-rules-chip">
      Up to <b>{view.config.maxPicks}</b> pick{view.config.maxPicks > 1 ? 's' : ''} a turn{view.config.stack7 ? ' · 7s stack' : ''}
      {power && ' · ⚡ power cards'}
    </div>
  );
  const deck = <Deck count={c7.deckCount} live={myTurn && c7.canPick && !busy} penalty={c7.penalty} boxRef={deckRef} onPick={pick} />;
  const pile = (
    <PileReact onReact={(i) => void actions.reactOnPile(i)}>
      <Pile c7={c7} boxRef={pileRef} />
    </PileReact>
  );
  const dirChip =
    power && playing ? (
      <span key={c7.dir} className={cx('c7p-dir', c7.dir === -1 && 'back')} role="img" aria-label={c7.dir === 1 ? 'Play goes round in seat order' : 'Play goes the other way round'}>
        {c7.dir === 1 ? '↻' : '↺'}
      </span>
    ) : null;
  const wishChip =
    power && playing && c7.wish ? (
      <span key={c7.wish} className={cx('c7p-wish', isRed(c7.wish) && 'red')} role="status">
        J → <b>{SUIT_SYMBOL[c7.wish]}</b> <span className="c7p-wish-name">{SUIT_NAME[c7.wish]}</span>
      </span>
    ) : null;
  const played =
    c7.top && c7.topBy ? (
      <p className="c7-played">
        <b>{name(c7.topBy)}</b> played <b className={cx(isRed(c7.top.suit) && 'red')}>{short(c7.top)}</b>
      </p>
    ) : null;
  const callBtn = c7.canCall && (
    <button className={cx('btn c7-call', urgent && 'urgent', !myTurn && 'grow')} disabled={calling} onClick={() => void call()}>
      📢 {land ? (urgent ? 'LAST CARD!' : 'Last card') : urgent ? 'Say LAST CARD now!' : view.hand.length === 2 ? 'Last card (say it, then play)' : 'Last card!'}
    </button>
  );

  // one opponent's seat (portrait: in the row on top; landscape: standing at the far rail)
  const seatOf = (p: (typeof opponents)[number]) => (
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
      tag={
        land ? (
          // landscape: the tags sit beside the avatar so the standing seat stays short
          <span className="c7-tags">
            {seatTag(c7, p.id, p.cardCount)}
            {playing && p.id === nextId && opponents.length > 1 && <span className="c7-tag next">next</span>}
          </span>
        ) : (
          <>
            {seatTag(c7, p.id, p.cardCount)}
            {playing && p.id === nextId && <span className="c7-tag next">next</span>}
          </>
        )
      }
      extra={cx(playing && p.cardCount === 1 && 'c7-one spot', playing && c7.penalty > 0 && p.id === view.turnId && 'c7-hit')}
      turnEndsAt={p.id === view.turnId ? turnEndsAt : null}
      turnSec={view.config.turnSec}
      seatRef={(el) => {
        if (el) seatEls.current.set(p.id, el);
        else seatEls.current.delete(p.id);
      }}
    />
  );
  // landscape: where everyone sits round the 3D table
  const spots = seatSpots(opponents.length);
  const matchText = !c7.top
    ? null
    : c7.penalty > 0
      ? power
        ? 'Only a 7 or a 2 can pass the pick on'
        : 'Only a 7 can pass the pick on'
      : power && c7.wish
        ? `Play this suit or a J · ${SUIT_SYMBOL[c7.wish]}`
        : `Match the suit or the number · ${short(c7.top)}`;
  // what only I need now and then, kept in the table info panel instead of on the table
  const infoMine =
    playing && me ? (
      <p className="tinfo-counts">
        <span>{`🃏 Cards in your hand · ${view.hand.length}`}</span>
        {myTurn && c7.penalty === 0 && <span>{`➕ Picks left this turn · ${picksLeft}`}</span>}
        {status && <span>{`⏳ ${status}`}</span>}
        {matchText && <span>{`🎯 ${matchText}`}</span>}
        <span>{`🎴 Cards in the deck · ${c7.deckCount}`}</span>
        <span>{`🗂 Cards in the pile · ${c7.pileCount}`}</span>
        {c7.called.includes(view.meId) && view.hand.length === 1 && <span>📢 You said last card</span>}
        {c7.missed.includes(view.meId) && <span>🙊 Missed · you pick 1 and skip your next turn</span>}
      </p>
    ) : null;
  const infoTips = [
    'Tap a glowing card to play it',
    'No card fits? Tap the deck or Pick',
    'Two cards left? Tap 📢 Last card before you play',
    view.config.stack7 ? 'A 7 makes the next player pick, unless they put a 7 on it' : 'A 7 makes the next player pick',
    ...(power ? ['J names a suit · 8 skips · A turns play round · 2 makes the next pick two'] : []),
    'Hold the pile to react to the last play',
  ];

  return (
    <main className={cx('table c7-table', myTurn && 'my-turn-table', view.config.ranked && 'ranked-table')}>
      <TableScene ranked={view.config.ranked}>
        {land && (
          <>
            {opponents.map((p, i) => (
              <Fragment key={p.id}>
                <OnTable x={spots[i].cards.x} y={spots[i].cards.y}>
                  <OppCards count={p.cardCount} back={p.back} aura={p.shop?.aura ?? null} turn={spots[i].cards.turn} />
                </OnTable>
                {playing && p.id === view.turnId && (
                  <OnTable x={spots[i].cards.x} y={spots[i].cards.y} className="turn-spot">
                    <i />
                  </OnTable>
                )}
                <OnTable x={spots[i].seat.x} y={spots[i].seat.y} stand className="seat-stand">
                  {seatOf(p)}
                </OnTable>
              </Fragment>
            ))}
            {/* play's direction: a faint arrow lying on the felt round the deck and pile */}
            {power && playing && (
              <OnTable x={50} y={48} className="c7-dir-spot">
                <span key={c7.dir} className={cx('c7-dir3d', c7.dir === -1 && 'back')} role="img" aria-label={c7.dir === 1 ? 'Play goes round in seat order' : 'Play goes the other way round'}>
                  {c7.dir === 1 ? '↻' : '↺'}
                </span>
              </OnTable>
            )}
            <OnTable x={42} y={48} z={3} className="c7-deck-spot">
              <Deck3D count={c7.deckCount} live={myTurn && c7.canPick && !busy} penalty={c7.penalty} boxRef={deckRef} onPick={pick} />
            </OnTable>
            <OnTable x={58} y={48} z={3} className="c7-pile-spot">
              <PileReact onReact={(i) => void actions.reactOnPile(i)}>
                <Discard3D c7={c7} boxRef={pileRef} />
              </PileReact>
            </OnTable>
            {playing && (c7.penalty > 0 || (power && c7.wish)) && (
              <OnTable x={71} y={52} stand className="felt-sign c7-signs">
                {c7.penalty > 0 && (
                  <span key={`${c7.penalty}-${view.turnId}`} className={cx('c7-sign pick', myTurn && 'mine')} role="status">
                    {`Pick ${c7.penalty}!`}
                  </span>
                )}
                {power && c7.wish && (
                  <span key={c7.wish} className={cx('c7-sign wish', isRed(c7.wish) && 'red')} role="status" aria-label={`J wished ${SUIT_NAME[c7.wish]}`}>
                    J → <b>{SUIT_SYMBOL[c7.wish]}</b>
                  </span>
                )}
              </OnTable>
            )}
          </>
        )}
      </TableScene>
      <header className="topbar">
        {land && <TableInfo view={view} notes={notes} mine={infoMine} tips={infoTips} />}
        {!land && <span className="code-chip">{view.code}</span>}
        {!land && (
          <span className="c7-chip">
            7️⃣<span> Crazy 7</span>
          </span>
        )}
        {!land && view.config.stake > 0 && <span className="pot-chip">🪙 Pot {compactCoins(pot)}</span>}
        <span className="grow" />
        <div className="topbar-actions">
          {/* host only: people waiting to watch; it pulses and knocks, but never pops up over the game */}
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              <span key={view.watchRequests.length} className="req-ring" aria-hidden />
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />

      {!land && (
        <section className="seats" data-n={opponents.length}>
          {opponents.map(seatOf)}
        </section>
      )}

      {!land && (
        <section className="center c7-center">
          {banner ?? rulesChip}
          <div className="c7-board">
            {deck}
            {pile}
          </div>
          {power && playing && (
            <div className="c7p-row">
              {dirChip}
              {wishChip}
            </div>
          )}
          {played}
          {playing && <MatchHint c7={c7} power={power} />}
          {!myTurn && status && <p className="turn-status">{status}</p>}
        </section>
      )}

      {land && <section className="side-actions">{callBtn}</section>}

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
          {followId && (land ? <FanHand cards={view.watch?.hands[followId] ?? []} /> : <Hand cards={view.watch?.hands[followId] ?? []} />)}
        </section>
      )}

      <section
        ref={handRef}
        className={cx('hand-area', watching && 'hidden', myTurn && 'my-turn', oneCard.includes(view.meId) && 'spot')}
        data-member={watching ? undefined : view.meId}
      >
        <div className="hand-tags">{!land && <SecretChip view={view} />}</div>
        <div className="hand-head">
          {myTurn ? (
            <span className="your-turn">
              YOUR TURN {turnEndsAt && <TurnCountdown endsAt={turnEndsAt} away={me?.away} sec={view.config.turnSec} />}
            </span>
          ) : (
            !land && (
              <span>
                Your cards · {view.hand.length} <StreakMark player={me} />
              </span>
            )
          )}
          {myTurn && !land && <span className="turn-hint">{status}</span>}
          {newIds.length > 0 && !land && <span className="new-chip">+{newIds.length} new</span>}
          {!myTurn && c7.called.includes(view.meId) && view.hand.length === 1 && <span className="c7-tag call">📢 Said it</span>}
          {c7.missed.includes(view.meId) && <span className="c7-tag miss">{land ? '🙊 Missed' : '🙊 Missed · you pick 1 and skip your next turn'}</span>}
        </div>
        {land ? (
          <FanHand
            cards={handNow}
            playable={myTurn ? c7.playable : undefined}
            dimRest={myTurn && !dealing}
            onToggle={watching ? undefined : tapCard}
            deal={dealing}
            fresh={newIds}
          />
        ) : (
          <Hand
            cards={handNow}
            playable={myTurn ? c7.playable : undefined}
            dimRest={myTurn && !dealing}
            // always tappable so cards don't remount each turn; taps count only on my turn
            onToggle={watching ? undefined : tapCard}
            deal={dealing}
            fresh={newIds}
          />
        )}
      </section>

      <footer className="action-bar c7-actions">
        {!land && callBtn}
        {myTurn && c7.penalty > 0 && (
          <button className="btn danger grow" disabled={busy || !c7.canPick} onClick={pick}>
            Pick {c7.penalty}
          </button>
        )}
        {myTurn && c7.penalty === 0 && c7.canPick && (
          <button className={cx('btn grow', c7.playable.length === 0 && 'primary')} disabled={busy} onClick={pick}>
            {land ? 'Pick' : `Pick a card · ${picksLeft} left`}
          </button>
        )}
        {myTurn && c7.canPass && (
          <button className={cx('btn', !c7.canPick && c7.playable.length === 0 && 'primary grow')} disabled={busy} onClick={pass}>
            Pass
          </button>
        )}
        {myTurn && !land && c7.penalty === 0 && !c7.canPick && !c7.canPass && !c7.canCall && (
          <p className="hint">Tap a glowing card to play it</p>
        )}
        {!myTurn && !c7.canCall && (
          <p className="hint">
            {watching
              ? view.watchers.find((w) => w.id === view.meId)?.byChoice
                ? '👀 Watching · switch to Playing in the lobby'
                : "👀 Watching · you'll play next game"
              : playing && !land
                ? 'Wait for your turn'
                : ''}
          </p>
        )}
      </footer>

      {view.phase === 'over' && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {jackId && myTurn && c7.playable.includes(jackId) && (
        <Backdrop onClose={() => setJackId(null)}>
          <h3>Name a suit for your J</h3>
          <p className="muted small">The next player must play this suit or another J.</p>
          <div className="c7p-suits">
            {SUITS.map((s) => (
              <button key={s} className={cx('rank-btn c7p-suit', isRed(s) && 'red')} disabled={busy} onClick={() => playJack(s)}>
                <b>{SUIT_SYMBOL[s]}</b>
                <span>{SUIT_NAME[s]}</span>
              </button>
            ))}
          </div>
          <button className="btn ghost block" onClick={() => setJackId(null)}>
            Cancel
          </button>
        </Backdrop>
      )}
      {targetPlayer && (
        <SeatSheet player={targetPlayer} auth={auth} onThrow={(i) => void actions.throwAt(targetPlayer.id, i)} onClose={() => setTarget(null)} />
      )}
      {fxLayer}
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
            (isHost || hostOffline) && playing
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
                <Avatar name={r.name} size="sm" />
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
