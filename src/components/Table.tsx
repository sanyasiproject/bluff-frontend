import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { api } from '../lib/api';
import { avatarColor, claimText, cx, placeLabel, rankPlural, SUIT_SYMBOL } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { confettiAt } from '../lib/motion';
import { useNewCards } from '../lib/newCards';
import { useOneCardAlert } from '../lib/spotlight';
import { sfx } from '../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import type { Card, FriendsResponse, PublicPlayer, Rank, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble } from '../useBluff';
import { ConfirmBox } from './ConfirmBox';
import { FlyingCards, type Flight } from './FlyingCards';
import { Hand } from './Hand';
import { LevelBadge } from './LevelBadge';
import { LevelUp } from './LevelUp';
import { PileReact } from './PileReact';
import { Backdrop, BetSheet, GameOver, PeekSheet, PickSheet, PlayersSheet, RankSheet, RevealOverlay } from './Overlays';
import { GiftRow, ThrowRow } from './PlayerActions';
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
  /** what tapping the seat does, for screen readers */
  label?: string;
  /** where played cards fly from */
  seatRef?: (el: HTMLElement | null) => void;
  /** 2v2: which team, and whether they're my partner */
  team?: 'a' | 'b' | null;
  partner?: boolean;
  /** extra line under the card count (Crazy 7: last card, missed call) */
  tag?: ReactNode;
  /** extra class names for the seat */
  extra?: string;
}

export function Seat({ player, turn, passed, viewing, action, bubble, onClick, label, seatRef, team, partner, tag, extra }: SeatProps) {
  const badge = player.place ? placeLabel(player.place) : !player.connected ? 'offline' : passed ? 'pass' : null;
  const className = cx(
    'seat',
    turn && 'turn',
    viewing && 'viewing',
    !player.connected && 'offline',
    player.place && 'done',
    team && `team-${team}`,
    extra,
  );
  const body = (
    <>
      {viewing && <span className="eye-badge">👁</span>}
      {badge && <span className={cx('badge', player.place && 'gold')}>{badge}</span>}
      <span className={cx('avatar', player.bot && 'bot-avatar')} style={player.bot ? undefined : { background: avatarColor(player.name) }}>
        {player.bot ? '🤖' : player.name[0]?.toUpperCase()}
        {player.level && <span className="seat-lv">{player.level}</span>}
      </span>
      <span className="seat-name">
        {partner && '🤝 '}
        {player.name}
      </span>
      <span className="seat-count">
        <i className="mini-back" />
        {/* re-keyed so the number bumps when it changes */}
        <b key={player.cardCount} className="bump">
          {player.cardCount}
        </b>
      </span>
      {action && <span className="seat-action">{action}</span>}
      {tag}
      {bubble && (
        <span key={bubble.key} className="seat-bubble">
          {bubble.text}
        </span>
      )}
    </>
  );
  return onClick ? (
    <button ref={seatRef} type="button" className={className} data-member={player.id} aria-pressed={viewing} aria-label={label} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div ref={seatRef} className={className} data-member={player.id}>
      {body}
    </div>
  );
}

/** tapping someone's seat: throw an emoji, or send coins if they're a friend */
export function SeatSheet({ player, auth, onThrow, onClose }: { player: PublicPlayer; auth: Auth; onThrow: (index: number) => void; onClose: () => void }) {
  const [friend, setFriend] = useState(false);
  useEffect(() => {
    if (!auth.user || !player.username) return;
    api<FriendsResponse>('/friends', { token: auth.token })
      .then((r) => setFriend(r.friends.some((f) => f.username === player.username)))
      .catch(() => setFriend(false));
  }, [player.username]);
  return (
    <Backdrop onClose={onClose}>
      <h3>
        {player.bot && '🤖 '}
        {player.name} <LevelBadge level={player.level} />
      </h3>
      <ThrowRow
        onThrow={(i) => {
          onThrow(i);
          // close so the flight is visible
          onClose();
        }}
      />
      {friend && <GiftRow auth={auth} name={player.name} target={{ memberId: player.id }} />}
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
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

function Pile({ count, boxRef, playKey }: { count: number; boxRef: RefObject<HTMLDivElement>; playKey: string | null }) {
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
      {playKey && count > 0 && <span key={playKey} className="pile-ripple" />}
      {count > 0 && (
        <span key={count} className="pile-count bump">
          {count}
        </span>
      )}
    </div>
  );
}

/** ⋯ menu: game info, sound, and host or watcher actions, kept out of the crowded top bar */
export function GameMenu({
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
        {c.decks === 2 ? '2 decks' : '1 deck'} ·{' '}
        {c.game === 'crazy7'
          ? `Crazy 7 · ${c.handSize} cards each · up to ${c.maxPicks} pick${c.maxPicks > 1 ? 's' : ''}${c.stack7 ? ' · 7s stack' : ''}`
          : c.bluffRule === 'one'
            ? 'Pick one card'
            : 'Show all cards'}{' '}
        ·{' '}
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
            🏁 End game · {view.teams ? `${winner.name}'s team` : winner.name} wins
          </button>
        )}
        {onStop && (
          <button className="btn block danger-text" onClick={onStop}>
            ⏹ Stop game for everyone
          </button>
        )}
        {onLeave && (
          <button className="btn block ghost danger-text" onClick={onLeave}>
            🚪 {view.players.some((p) => p.id === view.meId) && view.phase === 'playing' ? 'Leave game' : 'Leave room'}
          </button>
        )}
      </div>
    </Backdrop>
  );
}

/** calls fn when value changes, never on the first render */
export function useOnChange<T>(value: T, fn: (next: T) => void) {
  const prev = useRef(value);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    fn(value);
  });
}

const BUBBLE_MS = 4000;
const DOUBLE_TAP_MS = 350;

export function Table({ view, actions, bubbles, auth }: { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sheet, setSheet] = useState<'rank' | 'pick' | 'peek' | 'bet' | 'partner' | null>(null);
  /** coins to bet on my next bluff call (0 = none) */
  const [bet, setBet] = useState(0);
  /** cards I peeked at, kept for the play they belong to */
  const [peeked, setPeeked] = useState<{ playId: string; index: number; card: Card }[]>([]);
  const [showReveal, setShowReveal] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [busy, setBusy] = useState(false);
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
  const lp = view.lastPlay;
  // 2v2: my partner's play can't be challenged
  const teamOf = (id: string): 'a' | 'b' | null =>
    view.teams?.[0].includes(id) ? 'a' : view.teams?.[1].includes(id) ? 'b' : null;
  const myTeam = view.teams?.find((t) => t.includes(view.meId));
  const partnerId = myTeam?.find((id) => id !== view.meId) ?? null;
  const canBluff = playing && !!lp && lp.playerId !== view.meId && lp.playerId !== partnerId && (me?.cardCount ?? 0) > 0;
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
      targets.forEach((el, i) => {
        if (el) fly({ key: `deal-${i}-${Date.now()}`, count: 4, from: pile, to: el.getBoundingClientRect(), delay: i * 140, vanish: true });
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
      fly({ key: `sweep-${r.playId}`, count: Math.min(r.pileCount, 8), from, to: target.getBoundingClientRect(), vanish: true });
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
    sfx.play(lp.count);
    const from = lp.playerId === view.meId ? handRef.current : seatEls.current.get(lp.playerId);
    const to = pileRef.current;
    if (from && to) {
      fly({ key: id, count: Math.min(lp.count, 6), from: from.getBoundingClientRect(), to: to.getBoundingClientRect() });
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

  let status = '';
  if (me?.place) status = `You finished ${placeLabel(me.place)}!`;
  else if (myTurn) status = view.roundRank ? `Put down ${rankPlural(view.roundRank)} or pass` : 'New round · call any rank';
  else if (playing) status = `${name(view.turnId)}'s turn`;

  return (
    <main className="table">
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        {partnerId && (
          <span className={cx('team-chip', `team-${teamOf(view.meId)}`)}>
            {teamOf(view.meId) === 'a' ? '🔵' : '🟠'} with {name(partnerId)}
          </span>
        )}
        {view.config.stake > 0 && <span className="pot-chip">🪙 Pot {compactCoins(pot)}</span>}
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
            onClick={watching ? () => setPinned(pinnedId === p.id ? null : p.id) : () => setTarget(p.id)}
            label={watching ? `See ${p.name}'s cards` : `Throw an emoji at ${p.name}`}
            team={teamOf(p.id)}
            partner={p.id === partnerId}
            extra={cx(oneCard.includes(p.id) && 'spot')}
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
        <PileReact onReact={(i) => void actions.reactOnPile(i)}>
          <Pile count={view.pileCount} boxRef={pileRef} playKey={lp?.id ?? null} />
        </PileReact>
        {lp && (
          <p className="last-play">
            <b>{name(lp.playerId)}</b> put down <b>{claimText(lp.count, lp.rank)}</b>
          </p>
        )}
        {watching && lp && view.watch?.lastPlayCards && <TruthRow cards={view.watch.lastPlayCards} claim={lp.rank} />}
        {!myTurn && status && <p className="turn-status">{status}</p>}
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
                🔍 Peek · {view.peeksLeft}
              </button>
            )}
            {view.betLimit >= 50 && (
              <button className={cx('btn small', betNow > 0 && 'primary')} onClick={() => setSheet('bet')}>
                🪙 {betNow > 0 ? `Bet ${compactCoins(betNow)}` : 'Bet'}
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
              </span>
            ))}
          </p>
        )}
        {canEnd && (
          <button className="btn small ghost end-btn" onClick={() => setConfirmEnd(true)}>
            🏁 End game · {view.teams ? `${winner!.name}'s team` : winner!.name} wins
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

      <section
        ref={handRef}
        className={cx('hand-area', watching && 'hidden', myTurn && 'my-turn')}
        data-member={watching ? undefined : view.meId}
      >
        {view.partnerHand && partnerId && (
          <button className={cx('partner-btn', `team-${teamOf(view.meId)}`)} onClick={() => setSheet('partner')}>
            🤝 {name(partnerId)}'s cards · {view.partnerHand.length}
          </button>
        )}
        <div className="hand-head">
          {myTurn ? <span className="your-turn">YOUR TURN</span> : <span>Your cards · {view.hand.length}</span>}
          {myTurn && <span className="turn-hint">{status}</span>}
          {newIds.length > 0 && <span className="new-chip">+{newIds.length} new</span>}
          {selected.length > 0 ? (
            <button className="link-btn" onClick={() => setSelected([])}>
              Clear {selected.length}
            </button>
          ) : (
            !myTurn && view.hand.length > 1 && <span className="tap-tip">Double-tap = all of a rank</span>
          )}
        </div>
        <Hand cards={view.hand} selected={selected} onToggle={tapCard} deal={dealing} fresh={newIds} />
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
          peeked={peekedNow}
          left={view.peeksLeft}
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
          <Hand cards={view.partnerHand} />
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
                : `${winner.name} finished 1st and wins. Everyone else loses`}
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
      {confirmStop && playing && (
        <ConfirmBox
          title="Stop this game for everyone?"
          body="Nobody wins or loses and no coins move. Everyone goes back to the lobby."
          action="Stop game"
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
