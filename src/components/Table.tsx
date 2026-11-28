import { Fragment, useEffect, useRef, useState, type RefObject } from 'react';
import { claimText, cx, placeLabel, rankPlural, SUIT_SYMBOL } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { auraOf } from '../lib/aura';
import { backOf } from '../lib/look';
import { confettiAt } from '../lib/motion';
import { useNewCards } from '../lib/newCards';
import { useOneCardAlert } from '../lib/spotlight';
import { sfx } from '../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import { backsClaim, claimsAllowed, DEFAULT_CARD_BACK, SHIELD_MAX_CARDS, type Card, type PublicPlayer, type Rank, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble, Note } from '../useBluff';
import { ConfirmBox } from './ConfirmBox';
import { FlyingCards, type Flight } from './FlyingCards';
import { Hand } from './Hand';
import { FanHand } from './FanHand';
import { OnTable, seatSpots, TableScene } from './TableScene';
import { OppCards, PartnerCards, Pile3D } from './Table3D';
import { TableInfo } from './TableInfo';
import { useLandscape } from '../lib/useLandscape';
import { LevelBadge } from './LevelBadge';
import { LevelUp } from './LevelUp';
import { PileReact } from './PileReact';
import { Backdrop, BetSheet, GameOver, PeekSheet, PickSheet, PlayersSheet, RankSheet, RevealOverlay } from './Overlays';
import { PlayingCard } from './PlayingCard';
import { QuickChat } from './QuickChat';
import { Avatar } from './Avatar';
import { SazaTag } from './Saza';
import { StreakMark, TurnCountdown, useTurnEndsAt } from './TurnTimer';
import { LiveVoiceButtons, LiveVoiceNotice } from './LiveVoice';
import { SecretChip } from './SecretMissions';
import { stopText } from '../lib/stopRule';
import { BUBBLE_MS } from '../lib/common';
import { GameMenu, Seat, SeatSheet, useOnChange } from './tableParts';

/** watchers see what was really put down, outlined green (backs the claim, Kismat cards too) or red */
function TruthRow({ cards, claim, kismat }: { cards: Card[]; claim: Rank; kismat: Rank | null }) {
  const lie = cards.some((c) => !backsClaim(c, claim, kismat));
  return (
    <div className="truth-row" aria-label="Cards actually played">
      <div className="truth-cards">
        {cards.map((c) => (
          <div key={c.id} className={cx('truth-card', backsClaim(c, claim, kismat) ? 'match' : 'miss')}>
            <PlayingCard card={c} size="sm" wild={c.rank === kismat} />
          </div>
        ))}
      </div>
      <span className={cx('truth-tag', lie ? 'lie' : 'true')}>{lie ? 'Bluff!' : 'Truth'}</span>
    </div>
  );
}

function Pile({
  count,
  boxRef,
  playKey,
  backs,
  auras = [],
}: {
  count: number;
  boxRef: RefObject<HTMLDivElement>;
  playKey: string | null;
  backs: string[];
  /** owners' shop auras, lined up with backs */
  auras?: (string | null)[];
}) {
  const shown = Math.min(count, 7);
  // backs line up with the top cards; any without an owner show the classic back
  const offset = shown - backs.length;
  return (
    <div className="pile" ref={boxRef} aria-label={`${count} cards in the pile`}>
      {count === 0 && <div className="pile-empty">Pile</div>}
      {/* landscape: the pile's thickness grows with its cards */}
      {count > 1 && <span className="pile-depth" style={{ ['--depth' as string]: Math.min(count, 60) }} aria-hidden />}
      {Array.from({ length: shown }, (_, i) => {
        // keys shift as the pile grows so newly played cards animate in
        const n = count - shown + i;
        return (
          <PlayingCard
            key={n}
            faceDown
            back={backs[i - offset] ?? DEFAULT_CARD_BACK}
            aura={auras[i - offset]}
            size="sm"
            className="pile-card"
            style={{ transform: `translate(-50%, -50%) rotate(${((n * 47) % 34) - 17}deg) translate(${((n * 13) % 11) - 5}px, ${-i}px)` }}
          />
        );
      })}
      {playKey && count > 0 && <span key={playKey} className="pile-ripple" />}
      {count > 0 && (
        <span key={count} className="pile-count bump">
          {count}
        </span>
      )}
    </div>
  );
}

/** captions under the three Seedhi claim buttons */
const SEEDHI_STEPS = ['down', 'same', 'up'];
/** short plurals for the Seedhi status line: "7s", "Ks", "Aces" */
const shortPlural = (r: Rank) => (r === 'A' ? 'Aces' : `${r}s`);
const DOUBLE_TAP_MS = 350;

export function Table({ view, actions, bubbles, auth, notes = [] }: { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth; notes?: Note[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  // sideways screens get the 3D table: fanned hand, actions down the right side
  const land = useLandscape();
  const [sheet, setSheet] = useState<'rank' | 'pick' | 'peek' | 'bet' | 'partner' | null>(null);
  /** coins to bet on my next bluff call (0 = none) */
  const [bet, setBet] = useState(0);
  /** cards I peeked at, kept for the play they belong to */
  const [peeked, setPeeked] = useState<{ playId: string; index: number; card: Card }[]>([]);
  const [showReveal, setShowReveal] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [busy, setBusy] = useState(false);
  /** 🔒 Card Shield on for my next play */
  const [shieldOn, setShieldOn] = useState(false);
  /** watcher stuck to one player; null follows whoever's turn it is */
  const [pinned, setPinned] = useState<string | null>(null);
  const [panel, setPanel] = useState<'menu' | 'people' | 'requests' | null>(null);
  // there's no page behind a game: back opens the menu (Stop, Leave…) instead of leaving the app
  useBack(() => setPanel('menu'));
  const [flights, setFlights] = useState<Flight[]>([]);
  const fly = (f: Flight) => setFlights((all) => [...all, f]);
  /** who already got their finish confetti this game */
  const finished = useRef(new Set(view.players.filter((p) => p.place).map((p) => p.id)));
  /** the reveal on screen, and the one whose pile already flew to the loser */
  const shownReveal = useRef<string | null>(null);
  const swept = useRef<string | null>(null);
  const [dealing, setDealing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmKick, setConfirmKick] = useState<{ id: string; name: string } | null>(null);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const pileRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLElement>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  /** my level when this game started, to show a level up at the end */
  const startLevel = useRef<number | null>(null);

  const me = view.players.find((p) => p.id === view.meId);
  // players who left mid-game still count for names and the pot
  const name = (id: string | null) =>
    id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone');
  // everyone's face-down cards show in their own card back
  const back = (id: string | null | undefined) => backOf(view.players, id);
  const pileBacks = view.pileTopBy.map(back);
  const aura = (id: string | null | undefined) => auraOf(view.players, id);
  const pileAuras = view.pileTopBy.map(aura);
  // the pile as it was before a call took it, for the cards flying to whoever picks it up
  const lastPileBacks = useRef<string[]>([]);
  const lastPileAuras = useRef<(string | null)[]>([]);
  if (pileBacks.length) {
    lastPileBacks.current = pileBacks;
    lastPileAuras.current = pileAuras;
  }
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const playing = view.phase === 'playing';
  // anyone still holding a single card gets a spotlight (and a heartbeat when it starts)
  const oneCard = playing ? view.players.filter((p) => p.cardCount === 1 && !p.place).map((p) => p.id) : [];
  useOneCardAlert(oneCard);
  /** my new level once a game lifted it; the level-up screen shows over the results */
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const levelShown = useRef(false);
  const myLevel = view.coinResults?.find((r) => r.playerId === view.meId)?.level ?? null;
  useEffect(() => {
    if (view.phase !== 'over' || levelShown.current || myLevel === null || startLevel.current === null || myLevel <= startLevel.current) return;
    levelShown.current = true;
    setLevelUp(myLevel);
  }, [view.phase, myLevel]);
  const myTurn = playing && view.turnId === view.meId;
  const turnEndsAt = useTurnEndsAt(view);
  const lp = view.lastPlay;
  // house twists; older servers send neither
  const kismat = view.kismat ?? null;
  const seedhi = view.config.seedhi === true;
  /** Seedhi, following a round: the three ranks this play may claim (one down, same, one up) */
  const seedhiNext = seedhi && view.roundRank ? claimsAllowed(view.roundRank, true) : null;
  // 2v2: my partner's play can't be challenged
  const teamOf = (id: string): 'a' | 'b' | null =>
    view.teams?.[0].includes(id) ? 'a' : view.teams?.[1].includes(id) ? 'b' : null;
  const myTeam = view.teams?.find((t) => t.includes(view.meId));
  const partnerId = myTeam?.find((id) => id !== view.meId) ?? null;
  // a play under a Card Shield can't be called or peeked at
  const canBluff = playing && !!lp && !lp.shielded && lp.playerId !== view.meId && lp.playerId !== partnerId && (me?.cardCount ?? 0) > 0;
  const shieldedNow = playing && !!lp?.shielded && lp.playerId !== view.meId;
  // Card Shield: up to SHIELD_MAX_CARDS, never the cards that would empty my hand
  const shieldReady = myTurn && view.config.shields > 0 && view.shieldsLeft > 0;
  const shieldWhy =
    selected.length > SHIELD_MAX_CARDS ? `max ${SHIELD_MAX_CARDS} cards` : selected.length > 0 && selected.length >= view.hand.length ? 'not your last cards' : null;
  const shieldNow = shieldReady && shieldOn && selected.length > 0 && !shieldWhy;
  const shieldBlocked = shieldReady && shieldOn && !!shieldWhy;
  const lock = shieldNow ? ' 🔒' : '';
  // a bet only counts while I can still afford it
  const betNow = bet <= view.betLimit ? bet : 0;
  const peekedNow = lp ? peeked.filter((p) => p.playId === lp.id) : [];
  const bluffLocked = view.bluffCallsLeft === 0;
  const isHost = view.hostId === view.meId;
  // the server lets anyone stop a game whose host is offline, so it can't hang forever
  const hostOffline = ![...view.players, ...view.watchers].find((p) => p.id === view.hostId)?.connected;
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
  // a big hand (2 decks) leaves little room: the middle of the table goes compact
  const crowded = Math.max(view.hand.length, followed?.cardCount ?? 0) > 30;
  const freshDeal = playing && !lp && view.pileCount === 0 && view.players.every((p) => Math.abs(p.cardCount - perPlayer) < 1);

  // quick messages also show on the sender's seat (they float up the screen for everyone)
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  // someone new asks to watch: the host hears a knock and sees a note, and the game goes on
  const seenRequests = useRef(new Set(view.watchRequests.map((r) => r.id)));
  useEffect(() => {
    const added = view.watchRequests.filter((r) => !seenRequests.current.has(r.id));
    seenRequests.current = new Set(view.watchRequests.map((r) => r.id));
    if (added.length === 0) return;
    sfx.knock();
    actions.toast(added.length === 1 ? `👀 ${added[0].name} wants to watch · tap 👀 to answer` : `👀 ${added.length} people want to watch`);
  }, [view.watchRequests]);

  /** whose seat I tapped, to throw an emoji or send coins */
  const [target, setTarget] = useState<string | null>(null);
  const targetPlayer = view.players.find((p) => p.id === target && p.id !== view.meId);

  // drop selected cards that left the hand
  useEffect(() => {
    const ids = new Set(view.hand.map((c) => c.id));
    setSelected((prev) => (prev.every((id) => ids.has(id)) ? prev : prev.filter((id) => ids.has(id))));
  }, [view.hand]);

  // a new game (or rematch) deals new cards; card ids repeat between games, so start clean
  useEffect(() => {
    setSelected([]);
    if (!freshDeal) return;
    finished.current = new Set();
    setDealing(true);
    sfx.deal();
    // a few face-down cards fly from the middle to every seat and to my hand
    const frame = requestAnimationFrame(() => {
      const pile = pileRef.current?.getBoundingClientRect();
      if (!pile) return;
      const targets = [...opponents.map((p) => seatEls.current.get(p.id)), watching ? null : handRef.current];
      const owners = [...opponents.map((p) => p.id), view.meId];
      targets.forEach((el, i) => {
        if (el) fly({ key: `deal-${i}-${Date.now()}`, count: 4, from: pile, to: el.getBoundingClientRect(), delay: i * 140, vanish: true, backs: [back(owners[i])], auras: [aura(owners[i])] });
      });
    });
    const t = setTimeout(() => setDealing(false), 1600);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(frame);
    };
  }, [view.phase]);

  // after a reveal closes, the pile flies to whoever picked it up
  useEffect(() => {
    const r = view.reveal;
    if (!r) return;
    if (showReveal) {
      shownReveal.current = r.playId;
      return;
    }
    if (shownReveal.current !== r.playId || swept.current === r.playId) return;
    swept.current = r.playId;
    const from = pileRef.current?.getBoundingClientRect();
    const target = r.loserId === view.meId ? handRef.current : seatEls.current.get(r.loserId);
    if (from && target && r.pileCount > 0) {
      fly({ key: `sweep-${r.playId}`, count: Math.min(r.pileCount, 8), from, to: target.getBoundingClientRect(), vanish: true, backs: [...lastPileBacks.current].reverse(), auras: [...lastPileAuras.current].reverse() });
    }
  }, [showReveal, view.reveal?.playId]);

  // confetti on a seat (or my hand) when that player empties their hand
  useEffect(() => {
    if (!playing) return;
    for (const p of view.players) {
      if (!p.place || finished.current.has(p.id)) continue;
      finished.current.add(p.id);
      const mine = p.id === view.meId;
      confettiAt(mine ? handRef.current : seatEls.current.get(p.id), mine ? { count: 50, spread: 1.2 } : { count: 26, spread: 0.7 });
    }
  });

  // cards that came into my hand (the pile after a call) are marked for a few seconds, once the reveal has closed
  const newIds = useNewCards(view.hand, { reset: view.phase, hold: () => !!view.reveal && swept.current !== view.reveal.playId });

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
    setSheet((s) => (s === 'pick' || s === 'peek' ? null : s));
  }, [lp?.id]);

  useEffect(() => {
    // browsers block vibration until the player has tapped the page once
    if (myTurn && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(120);
    else setSheet((s) => (s === 'rank' ? null : s));
  }, [myTurn]);

  useEffect(() => {
    if (playing) {
      startLevel.current = me?.level ?? null;
      levelShown.current = false;
    }
  }, [playing]);

  // sounds and card motion follow what changed on the table
  useOnChange(lp?.id ?? null, (id) => {
    if (!id || !lp) return;
    if (!(lp.playerId === view.meId && myPlay.current?.flown)) sfx.play(lp.count);
    const from = lp.playerId === view.meId ? handRef.current : seatEls.current.get(lp.playerId);
    const to = pileRef.current;
    const mine = lp.playerId === view.meId ? myPlay.current : null;
    myPlay.current = null;
    // my own play already flew (and made its sound) the moment I tapped
    if (mine?.flown) return;
    if (from && to && mine && mine.faces.length === lp.count) {
      // my own cards leave from their places in my hand, face up, and turn face down on the way to the pile
      fly({ key: id, count: lp.count, from: from.getBoundingClientRect(), to: to.getBoundingClientRect(), faces: mine.faces.slice(0, 8), froms: mine.froms.slice(0, 8), backs: [back(lp.playerId)], auras: [aura(lp.playerId)], onTable: land });
    } else if (from && to) {
      fly({ key: id, count: Math.min(lp.count, 6), from: from.getBoundingClientRect(), to: to.getBoundingClientRect(), backs: [back(lp.playerId)], auras: [aura(lp.playerId)], onTable: land });
    }
  });
  useOnChange(view.passedIds.length, (n) => n > 0 && sfx.pass());
  useOnChange(view.reveal?.playId ?? null, (id) => {
    if (!id || !view.reveal) return;
    (view.reveal.bluff ? sfx.caught : sfx.truth)();
    // I caught a liar: a small burst in the middle
    if (view.reveal.bluff && view.reveal.callerId === view.meId) confettiAt(pileRef.current, { count: 30, spread: 0.9 });
  });
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

  // the shield toggle is for this turn only
  useEffect(() => {
    if (!myTurn) setShieldOn(false);
  }, [myTurn]);

  /** my play on its way: the cards and where each sat in my hand, for the flight to the pile */
  const myPlay = useRef<{ faces: Card[]; froms: DOMRect[]; flown?: boolean } | null>(null);
  /** cards I just put down, hidden from my hand while the server confirms the play */
  const [sending, setSending] = useState<string[]>([]);
  useEffect(() => {
    // once the server's hand no longer has them, nothing needs hiding
    setSending((ids) => (ids.length && ids.every((id) => view.hand.some((c) => c.id === id)) ? ids : []));
  }, [view.hand]);
  const play = async (rank?: Rank) => {
    const ids = selected;
    setBusy(true);
    const faces = ids.map((id) => view.hand.find((c) => c.id === id)).filter((c): c is Card => !!c);
    const froms = ids.map((id) => (handRef.current?.querySelector(`[data-card="${id}"]`) ?? handRef.current)?.getBoundingClientRect() ?? new DOMRect());
    // no waiting for the server: the picker closes and my cards fly now; the server confirms in the background
    setSheet(null);
    setSelected([]);
    setSending(ids);
    const to = pileRef.current?.getBoundingClientRect();
    const from = handRef.current?.getBoundingClientRect();
    if (to && from && faces.length) {
      sfx.play(faces.length);
      fly({ key: `mine-${Date.now()}`, count: faces.length, from, to, faces: faces.slice(0, 8), froms: froms.slice(0, 8), backs: [back(view.meId)], auras: [aura(view.meId)], onTable: land });
      myPlay.current = { faces, froms, flown: true };
    } else myPlay.current = { faces, froms };
    const ok = await actions.play(ids, rank, shieldNow);
    setBusy(false);
    if (ok) setShieldOn(false);
    else {
      // refused (the error is shown): the cards come back, still picked
      myPlay.current = null;
      setSending([]);
      setSelected(ids);
    }
  };
  // my hand without the cards on their way to the pile
  const handNow = sending.length ? view.hand.filter((c) => !sending.includes(c.id)) : view.hand;

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
    if ((await actions.bluff(lp.id, undefined, betNow)) !== null) setBet(0);
    setBusy(false);
  };

  const peekAt = async (index: number) => {
    if (!lp) return;
    const card = await actions.peek(lp.id, index);
    if (card) setPeeked((prev) => [...prev, { playId: lp.id, index, card }]);
  };

  const toggleSound = () => {
    unlockSpeech();
    setSoundOn(!sound);
    setSound(!sound);
  };

  // Seedhi claim buttons: green when every selected card backs that rank
  const picked = view.hand.filter((c) => selected.includes(c.id));
  const honestFor = (r: Rank) => picked.length > 0 && picked.every((c) => backsClaim(c, r, kismat));
  const roundChip = (
    <div
      className={cx('round-chip', view.roundRank ? 'set' : 'blank')}
      aria-hidden={!view.roundRank}
      title={seedhiNext ? 'Seedhi: one rank down, the same, or one up' : undefined}
    >
      {seedhiNext ? (
        <>
          🪜 Next <b>{seedhiNext.join(' · ')}</b>
        </>
      ) : (
        <>
          Round <b>{view.roundRank ? rankPlural(view.roundRank) : '–'}</b>
        </>
      )}
    </div>
  );

  let status = '';
  if (me?.place) status = `You finished ${placeLabel(me.place)}!`;
  else if (myTurn && seedhiNext) status = `Claim ${seedhiNext.map(shortPlural).slice(0, 2).join(', ')} or ${shortPlural(seedhiNext[2])}`;
  else if (myTurn) status = view.roundRank ? `Put down ${rankPlural(view.roundRank)} or pass` : 'New round · call any rank';
  else if (playing) status = `${name(view.turnId)}'s turn`;

  // one opponent's seat (portrait: in the row on top; landscape: standing at the far rail)
  const seatOf = (p: PublicPlayer) => (
      <Seat
        key={p.id}
        player={p}
        turn={p.id === view.turnId}
        passed={view.passedIds.includes(p.id)}
        viewing={watching && p.id === followId}
        action={lp?.playerId === p.id ? `${lp.count} × ${lp.rank}${lp.shielded ? ' 🔒' : ''}` : null}
        bubble={bubbleOf(p.id)}
        onClick={watching ? () => setPinned(pinnedId === p.id ? null : p.id) : () => setTarget(p.id)}
        label={watching ? `See ${p.name}'s cards` : `Throw an emoji at ${p.name}`}
        team={teamOf(p.id)}
        partner={p.id === partnerId}
        extra={cx(oneCard.includes(p.id) && 'spot')}
        ranked={view.config.ranked}
        turnEndsAt={p.id === view.turnId ? turnEndsAt : null}
        turnSec={view.config.turnSec}
        seatRef={(el) => {
          if (el) seatEls.current.set(p.id, el);
          else seatEls.current.delete(p.id);
        }}
      />
  );
  const roundRow = (
    kismat ? (
            <div className="round-row">
              {roundChip}
              <button
                type="button"
                className="kismat-chip"
                title={`${rankPlural(kismat)} are wild this game`}
                aria-label={`Kismat card: ${rankPlural(kismat)} are wild this game`}
                onClick={() => actions.toast(`🍀 Kismat card: ${rankPlural(kismat)} are wild this game. They back up any claim`)}
              >
                🍀 Kismat <b>{kismat}</b>
              </button>
            </div>
          ) : (
            roundChip
          )
  );
  // landscape: where everyone sits round the 3D table
  // landscape: everyone in play order starting with the player after me, so in 2v2 my partner sits straight across
  const myAt = view.players.findIndex((p) => p.id === view.meId);
  const around = myAt < 0 ? opponents : [...view.players.slice(myAt + 1), ...view.players.slice(0, myAt)];
  const spots = seatSpots(around.length);
  // what only I need now and then, kept in the table info panel instead of on the table
  const infoMine = (
    <>
      {view.partnerHand && partnerId && (
        <button className={cx('btn block partner-btn', `team-${teamOf(view.meId)}`)} onClick={() => setSheet('partner')}>
          🤝 {name(partnerId)}'s cards · {view.partnerHand.length}
        </button>
      )}
      {playing && me && (
        <p className="tinfo-counts">
          {view.config.peeks > 0 && <span>🔍 {view.peeksLeft} peek{view.peeksLeft === 1 ? '' : 's'} left</span>}
          {view.config.shields > 0 && <span>🔒 {view.shieldsLeft} shield{view.shieldsLeft === 1 ? '' : 's'} left</span>}
          {view.bluffCallsLeft !== null && view.bluffCallsLeft !== undefined && <span>🤥 {view.bluffCallsLeft} call{view.bluffCallsLeft === 1 ? '' : 's'} left in a row</span>}
          <span>🃏 {view.hand.length} cards in your hand</span>
          {me.saza && <span>🤡 Saza: {me.saza}</span>}
        </p>
      )}
    </>
  );
  const infoTips = ['Tap cards to pick them; they go down in the order you tap', 'Double-tap a card to pick every card of that rank', 'Hold the pile to react to the last play', 'Big hand? ▦ Stacks groups your cards by rank'];

  // calling a bluff, peek, bet and End game: under the pile in portrait, down the right side in landscape
  const callControls = (
    <>
      {canBluff && lp && (
        <button
          className={cx('btn danger bluff-btn', bluffLocked && 'locked')}
          disabled={bluffLocked || busy}
          onClick={callBluff}
        >
          {bluffLocked ? 'Bluff locked' : 'Bluff!'}
          {bluffLocked ? (
            <small>Play or pass first</small>
          ) : (
            (betNow > 0 || view.bluffCallsLeft === 1) && (
              <small>
                {[betNow > 0 && `🪙 ${compactCoins(betNow)} bet`, view.bluffCallsLeft === 1 && '1 call left'].filter(Boolean).join(' · ')}
              </small>
            )
          )}
        </button>
      )}
      {canBluff && lp && !bluffLocked && (view.peeksLeft > 0 || view.betLimit >= 50) && (
        <div className="bluff-tools">
          {view.peeksLeft > 0 && (
            <button className="btn small" onClick={() => setSheet('peek')}>
              🔍 <span>Peek · {view.peeksLeft}</span>
            </button>
          )}
          {view.betLimit >= 50 && (
            <button className={cx('btn small', betNow > 0 && 'primary')} onClick={() => setSheet('bet')}>
              🪙 <span>{betNow > 0 ? `Bet ${compactCoins(betNow)}` : 'Bet'}</span>
            </button>
          )}
        </div>
      )}
      {canBluff && peekedNow.length > 0 && (
        <p className="peeked-line">
          {peekedNow.map((p) => (
            <span key={p.index}>
              🔍 Card {p.index + 1}: <b>{p.card.rank}</b>
              {SUIT_SYMBOL[p.card.suit]}
              {view.kismat !== null && p.card.rank === view.kismat && ' 🍀 wild'}
            </span>
          ))}
        </p>
      )}
      {canEnd && (
        <button className="btn small ghost end-btn" onClick={() => setConfirmEnd(true)}>
          🏁 End game · {view.teams ? `${winner!.name}'s team` : winner!.name} wins
        </button>
      )}
    </>
  );

  return (
    <main className={cx('table bluff-table', crowded && 'crowded', view.config.ranked && 'ranked-table', myTurn && 'my-turn-table')}>
      <TableScene ranked={view.config.ranked}>
        {land && (
          <>
            {around.map((p, i) => (
              <Fragment key={p.id}>
                {/* 2v2: my partner's cards lie face up in front of them, for me only; everyone else's face down */}
                {p.id === partnerId && view.partnerHand ? (
                  <>
                  <OnTable x={spots[i].cards.x} y={spots[i].cards.y + 9}>
                    <i className={`partner-glow team-${teamOf(p.id)}`} />
                  </OnTable>
                  <OnTable x={spots[i].cards.x} y={spots[i].cards.y + 11} stand z={4} className="partner-spot">
                    <PartnerCards cards={view.partnerHand} name={p.name} kismat={kismat} team={teamOf(p.id)} />
                  </OnTable>
                  </>
                ) : (
                  <OnTable x={spots[i].cards.x} y={spots[i].cards.y}>
                    <OppCards count={p.cardCount} back={p.back} aura={aura(p.id)} turn={spots[i].cards.turn} />
                  </OnTable>
                )}
                {p.id === view.turnId && (
                  <OnTable x={spots[i].cards.x} y={spots[i].cards.y} className="turn-spot">
                    <i />
                  </OnTable>
                )}
                <OnTable x={spots[i].seat.x} y={spots[i].seat.y} stand className="seat-stand">
                  {seatOf(p)}
                </OnTable>
              </Fragment>
            ))}
            <OnTable x={50} y={50} className="pile-spot">
              <PileReact onReact={(i) => void actions.reactOnPile(i)}>
                <Pile3D count={view.pileCount} boxRef={pileRef} playKey={lp?.id ?? null} backs={pileBacks} auras={pileAuras} />
              </PileReact>
            </OnTable>
            <OnTable x={30} y={52} stand className="felt-sign">
              {roundRow}
            </OnTable>
          </>
        )}
      </TableScene>
      <header className="topbar">
        {land && <TableInfo view={view} notes={notes} mine={infoMine} tips={infoTips} />}
        {/* a ranked table says so for the whole game: the room code turns gold (no extra width on a full top bar) */}
        {!land && (
        <span className={cx('code-chip', view.config.ranked && 'ranked-code')} aria-label={view.config.ranked ? `Ranked game, room ${view.code}` : undefined}>
          {view.config.ranked && '🏅 '}
          {view.code}
        </span>
        )}
        {!land && partnerId && (
          <span className={cx('team-chip', `team-${teamOf(view.meId)}`)}>
            {teamOf(view.meId) === 'a' ? '🔵' : '🟠'} with {name(partnerId)}
          </span>
        )}
        {!land && view.config.stake > 0 && <span className="pot-chip">🪙 Pot {compactCoins(pot)}</span>}
        <span className="grow" />
        <div className="topbar-actions">
          {/* host only: people waiting to watch; it pulses and knocks, but never pops up over the game */}
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              {/* re-keyed so each new request rings it again */}
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

      {land ? (
        // landscape: the round, the pile and the seats are on the 3D table; only rare notes float here
        <section className="center center-notes">
          {shieldedNow && <p className="shield-note">🔒 Card Shield: nobody can call or peek at this play</p>}
          {watching && lp && view.watch?.lastPlayCards && <TruthRow cards={view.watch.lastPlayCards} claim={lp.rank} kismat={kismat} />}
        </section>
      ) : (
      <section className="center">
        {roundRow}
        <PileReact onReact={(i) => void actions.reactOnPile(i)}>
          <Pile count={view.pileCount} boxRef={pileRef} playKey={lp?.id ?? null} backs={pileBacks} auras={pileAuras} />
        </PileReact>
        {lp && (
          <p className="last-play">
            <b>{name(lp.playerId)}</b> put down <b>{claimText(lp.count, lp.rank)}</b>
            {lp.shielded && <span className="shield-tag"> 🔒</span>}
          </p>
        )}
        {shieldedNow && <p className="shield-note">🔒 Card Shield: nobody can call or peek at this play</p>}
        {watching && lp && view.watch?.lastPlayCards && <TruthRow cards={view.watch.lastPlayCards} claim={lp.rank} kismat={kismat} />}
        {!myTurn && status && <p className="turn-status">{status}</p>}
        {callControls}
      </section>
      )}

      {land && <section className="side-actions">{callControls}</section>}

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
          {followId &&
            (land ? <FanHand cards={view.watch?.hands[followId] ?? []} kismat={kismat} stackable /> : <Hand cards={view.watch?.hands[followId] ?? []} kismat={kismat} />)}
        </section>
      )}

      <section
        ref={handRef}
        className={cx('hand-area', watching && 'hidden', myTurn && 'my-turn')}
        data-member={watching ? undefined : view.meId}
      >
        <div className="hand-tags">
          {!land && view.partnerHand && partnerId && (
            <button className={cx('partner-btn', `team-${teamOf(view.meId)}`)} onClick={() => setSheet('partner')}>
              🤝 {name(partnerId)}'s cards · {view.partnerHand.length}
            </button>
          )}
          {!land && <SecretChip view={view} />}
          {shieldReady && (
            <button className={cx('shield-chip', shieldOn && 'on', shieldBlocked && 'blocked')} aria-pressed={shieldOn} onClick={() => setShieldOn(!shieldOn)}>
              {shieldOn ? `🔒 Shield on${shieldWhy ? ` · ${shieldWhy}` : ''}` : `🔒 Card Shield · ${view.shieldsLeft}`}
            </button>
          )}
        </div>
        <div className="hand-head">
          {myTurn ? (
            <span className="your-turn">
              YOUR TURN {turnEndsAt && <TurnCountdown endsAt={turnEndsAt} away={me?.away} sec={view.config.turnSec} />}
            </span>
          ) : (
            !land && (
            <span>
              Your cards · {view.hand.length} <SazaTag badge={me?.saza} /> <StreakMark player={me} />
            </span>
            )
          )}
          {myTurn && !land && <span className="turn-hint">{status}</span>}
          {newIds.length > 0 && !land && <span className="new-chip">+{newIds.length} new</span>}
          {selected.length > 0 ? (
            <button className="link-btn" onClick={() => setSelected([])}>
              Clear {selected.length}
            </button>
          ) : (
            !myTurn && !land && view.hand.length > 1 && <span className="tap-tip">Double-tap = all of a rank</span>
          )}
        </div>
        {land ? (
          <FanHand cards={handNow} selected={selected} onToggle={tapCard} onSet={setSelected} stackable deal={dealing} fresh={newIds} kismat={kismat} />
        ) : (
          <Hand cards={handNow} selected={selected} onToggle={tapCard} deal={dealing} fresh={newIds} kismat={kismat} />
        )}
      </section>

      <footer className="action-bar">
        {myTurn && view.roundRank && !seedhiNext && (
          <>
            <button className="btn" disabled={busy} onClick={pass}>
              Pass
            </button>
            <button className="btn primary grow" disabled={busy || selected.length === 0 || shieldBlocked} onClick={() => play()}>
              {selected.length ? `Play ${claimText(selected.length, view.roundRank)}${lock}` : land ? 'Pick cards' : 'Tap cards to select'}
            </button>
          </>
        )}
        {myTurn && seedhiNext && (
          <>
            <button className="btn pass-btn" disabled={busy} onClick={pass}>
              Pass
            </button>
            {selected.length === 0 ? (
              <button className="btn primary grow" disabled>
                Tap cards to select
              </button>
            ) : (
              <div className="claim-pick" role="group" aria-label={`Call ${selected.length} card${selected.length > 1 ? 's' : ''} as`}>
                {seedhiNext.map((r, i) => (
                  <button
                    key={r}
                    className={cx('btn claim-btn', honestFor(r) && 'honest')}
                    disabled={busy || shieldBlocked}
                    aria-label={`Play ${claimText(selected.length, r)}${lock}`}
                    onClick={() => play(r)}
                  >
                    <b>{r}</b>
                    <small>{SEEDHI_STEPS[i]}</small>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {myTurn && !view.roundRank && (
          <button className="btn primary grow" disabled={busy || selected.length === 0 || shieldBlocked} onClick={() => setSheet('rank')}>
            {selected.length ? (
              land ? (
                <>
                  Put down {selected.length}
                  {lock}
                  <small>call a rank</small>
                </>
              ) : (
                `Put down ${selected.length} · call a rank${lock}`
              )
            ) : land ? (
              'Pick cards'
            ) : (
              'Tap cards to select'
            )}
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
        <RankSheet hand={view.hand} selected={selected} busy={busy} onPick={play} onClose={() => setSheet(null)} kismat={kismat} />
      )}
      {sheet === 'pick' && lp && (
        <PickSheet
          count={lp.count}
          back={back(lp.playerId)}
          aura={aura(lp.playerId)}
          who={name(lp.playerId)}
          claim={claimText(lp.count, lp.rank)}
          kismat={kismat}
          onPick={async (i) => {
            setSheet(null);
            if ((await actions.bluff(lp.id, i, betNow)) !== null) setBet(0);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'peek' && lp && (
        <PeekSheet
          count={lp.count}
          back={back(lp.playerId)}
          aura={aura(lp.playerId)}
          peeked={peekedNow}
          left={view.peeksLeft}
          claim={lp.rank}
          kismat={view.kismat}
          onPeek={peekAt}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'partner' && view.partnerHand && partnerId && (
        <Backdrop onClose={() => setSheet(null)}>
          <h3>
            🤝 {name(partnerId)}'s cards · {view.partnerHand.length}
          </h3>
          <p className="muted small">Only you and {name(partnerId)} see these. Plan together, the other team can't.</p>
          <Hand cards={view.partnerHand} kismat={kismat} />
          <button className="btn ghost block" onClick={() => setSheet(null)}>
            Close
          </button>
        </Backdrop>
      )}
      {sheet === 'bet' && (
        <BetSheet
          limit={view.betLimit}
          value={betNow}
          onPick={(n) => {
            setBet(n);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {showReveal && view.reveal && (
        <RevealOverlay reveal={view.reveal} name={name} back={back(view.reveal.playerId)} aura={aura(view.reveal.playerId)} onClose={() => setShowReveal(false)} kismat={kismat} />
      )}
      {view.phase === 'over' && !(showReveal && view.reveal) && (
        <GameOver
          view={view}
          onLobby={actions.toLobby}
          onRematch={isHost ? actions.rematch : undefined}
          startLevel={startLevel.current}
          onPickSaza={actions.pickSaza}
          onShowPlays={actions.playsOf}
        />
      )}
      {levelUp !== null && !(showReveal && view.reveal) && (
        <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />
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
            (isHost || hostOffline) && playing
              ? () => {
                  setPanel(null);
                  setConfirmStop(true);
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
      {confirmEnd && winner && (
        <Backdrop center onClose={() => setConfirmEnd(false)}>
          <div className="confirm-box">
            <h3>End the game now?</h3>
            <p className="muted">
              {view.teams
                ? `${winner.name} finished 1st, so their team wins. The other team loses`
                : `${winner.name} finished 1st and wins. The rest are ranked by card value left (A 1 … K 13); the highest loses`}
              {view.config.stake > 0
                ? ` and the 🪙 ${formatCoins(pot)} pot ${view.teams ? 'is split by their team' : `goes to ${winner.name}`}`
                : ''}
              .
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
      {confirmLeave && playing && (
        <Backdrop center onClose={() => setConfirmLeave(false)}>
          <div className="confirm-box">
            <h3>Leave this game?</h3>
            <p className="muted">
              It counts as a loss
              {view.config.stake > 0 ? ` and you still pay your 🪙 ${formatCoins(view.config.stake)} stake` : ''}
              {view.teams ? '. Your team loses the game' : ''}.
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
      {confirmStop && playing && (
        <ConfirmBox
          title={stopText(view).title}
          body={stopText(view).body}
          action={stopText(view).action}
          cancel="Keep playing"
          onCancel={() => setConfirmStop(false)}
          onConfirm={() => {
            setConfirmStop(false);
            void actions.toLobby();
          }}
        />
      )}
      {confirmKick && (
        <ConfirmBox
          title={`Remove ${confirmKick.name}?`}
          body={
            playing && view.players.some((p) => p.id === confirmKick.id)
              ? "Their cards leave the game and they won't pay or win coins."
              : 'They leave the room.'
          }
          action="Remove"
          onCancel={() => setConfirmKick(null)}
          onConfirm={() => {
            const id = confirmKick.id;
            setConfirmKick(null);
            void actions.kick(id);
          }}
        />
      )}
    </main>
  );
}
