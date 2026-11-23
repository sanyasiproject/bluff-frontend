import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cx } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { auraOf } from '../lib/aura';
import { backOf } from '../lib/look';
import { confettiAt } from '../lib/motion';
import { useNewCards } from '../lib/newCards';
import { useOneCardAlert } from '../lib/spotlight';
import { sfx } from '../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../lib/speech';
import { RANG_COLORS, RANG_HAND_SIZE, RANG_MISSED_PENALTY, rangHandPoints, type Card, type RangCard as RangCardData, type RangColor, type RangMove, type RangView, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble, Note } from '../useBluff';
import { FlyingCards, type Flight } from './FlyingCards';
import { LevelUp } from './LevelUp';
import { PileReact } from './PileReact';
import { LevelBadge } from './LevelBadge';
import { Backdrop, GameOver, PlayersSheet } from './Overlays';
import { QuickChat } from './QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from './LiveVoice';
import { GameMenu, Seat, SeatSheet, useOnChange } from './Table';
import { StreakMark, TurnCountdown, useTurnEndsAt } from './TurnTimer';
import { Avatar } from './Avatar';
import { SecretChip } from './SecretMissions';
import { useBox, fanLayout } from './FanHand';
import { OnTable, seatSpots, TableScene } from './TableScene';
import { OppCards } from './Table3D';
import { TableInfo } from './TableInfo';
import { RangArrows, RangDeck3D, RangPile3D, RangRing } from './RangTable3D';
import { FullscreenButton } from './RotateGate';
import { useLandscape } from '../lib/useLandscape';
import { isRangWild, RangSwapContext, RANG_COLOR_NAME, RANG_HEX, RangCard, RangCardBack, rangCardName, RangChip, rangSymbol } from './RangCard';

const BUBBLE_MS = 4000;
const MIN_SLICE = 28;
const RATIO = 1.4;
// big hands (stacked +4s): smaller cards, narrower slices and rows that show only the top corner
const BIG_HAND = 14;
const BIG_SLICE = 23;
const BIG_ROW_SHOW = 0.4;

/** a seat's last move: a short line and the card played, if any */
interface SeatAct {
  text: string;
  card?: RangCardData | null;
  color?: RangColor | null;
}

/** a card waiting for a choice before it is played; extras are the same-number cards put down with it (doubles) */
type Choice =
  | { kind: 'color'; card: RangCardData }
  | { kind: 'target'; card: RangCardData; extras?: string[] }
  | { kind: 'doubles'; card: RangCardData; partners: RangCardData[] }
  | null;

/** a move, with the Force play flag newer servers send */
type Move = RangMove & { forced?: boolean };

/** number cards (0–9) can go down together with doubles on */
const isNumber = (c: RangCardData) => /^[0-9]$/.test(c.value);

/** the face-down deck; tap it to pick when you may */
function Deck({ count, live, penalty, boxRef, onPick }: { count: number; live: boolean; penalty: number; boxRef: RefObject<HTMLButtonElement>; onPick: () => void }) {
  const layers = Math.min(3, Math.max(count, 0));
  const tip = penalty > 0 ? `Pick ${penalty}` : 'Pick';
  return (
    <button
      ref={boxRef}
      type="button"
      className={cx('c7-deck rg-deck', live && 'live')}
      disabled={!live}
      aria-label={live ? (penalty > 0 ? `Pick ${penalty} cards, ${count} left in the deck` : `Pick a card, ${count} left in the deck`) : `${count} cards in the deck`}
      onClick={onPick}
    >
      {count === 0 && <span className="c7-empty">Empty</span>}
      {Array.from({ length: layers }, (_, i) => (
        <RangCardBack key={i} size="md" className="c7-deck-card" style={{ translate: `${i * -2}px ${i * -3}px` } as CSSProperties} />
      ))}
      <span key={count} className="c7-count bump">
        {count}
      </span>
      {live && <span className="c7-deck-tip">{tip}</span>}
    </button>
  );
}

/** the pile: the top card in a ring of the colour to match, a few cards under it */
function Pile({ rg, boxRef }: { rg: RangView; boxRef: RefObject<HTMLDivElement> }) {
  const under = rg.under.slice(-3);
  const ring = rg.color ? RANG_HEX[rg.color] : 'transparent';
  return (
    <div
      className="c7-pile rg-pile"
      ref={boxRef}
      style={{ ['--rg-now' as string]: ring }}
      aria-label={rg.top ? `Top card ${rangCardName(rg.top)}, ${rg.pileCount} in the pile` : 'Pile'}
    >
      {under.map((c, i) => {
        const n = rg.pileCount - under.length + i;
        return (
          <RangCard
            key={`${c.id}-${n}`}
            card={c}
            size="md"
            className="c7-under rg-under"
            style={{ rotate: `${((n * 47) % 30) - 15}deg`, translate: `${((n * 13) % 13) - 6}px ${((n * 7) % 7) - 3}px` } as CSSProperties}
          />
        );
      })}
      {rg.top && (
        // re-keyed when a new card lands or the colour changes, so it drops in and the ring pulses
        <div
          key={`${rg.top.id}-${rg.pileCount}-${rg.color}`}
          className={cx('rg-top', rg.color && 'ringed', (rg.top.value === 'draw2' || rg.top.value === 'wild4') && 'hit')}
        >
          <RangCard card={rg.top} size="lg" chosen={isRangWild(rg.top) ? rg.color : null} />
        </div>
      )}
      <span className="c7-count pile-side">{rg.pileCount}</span>
    </div>
  );
}

/** the colour to match, the way play goes round */
function ColorBar({ rg }: { rg: RangView }) {
  return (
    <div className="rg-colorbar">
      {rg.color && (
        <span key={rg.color} className={cx('rg-color', `rg-${rg.color}`)} role="status" aria-label={`Colour to match: ${RANG_COLOR_NAME[rg.color]}`}>
          <i className="rg-dot" aria-hidden />
          {RANG_COLOR_NAME[rg.color]}
        </span>
      )}
      <span key={rg.dir} className={cx('rg-dir', rg.dir === -1 && 'ccw')} aria-label={rg.dir === 1 ? 'Play goes clockwise' : 'Play goes anticlockwise'}>
        {rg.dir === 1 ? '↻' : '↺'}
      </span>
    </div>
  );
}

/** what the next card must match */
function MatchHint({ rg, stack }: { rg: RangView; stack: boolean }) {
  const top = rg.top;
  if (!top) return null;
  if (rg.penalty > 0) {
    if (!stack) return <p className="c7-hint">{`Pick ${rg.penalty} to go on`}</p>;
    return <p className="c7-hint">{top.value === 'wild4' ? 'Only a +4 can pass it on' : 'Only a +2 or +4 can pass it on'}</p>;
  }
  if (isRangWild(top)) return <p className="c7-hint">{rg.color ? `Match ${RANG_COLOR_NAME[rg.color]}, or play a Wild` : 'Play any card'}</p>;
  return <p className="c7-hint">{`Match ${rg.color ? RANG_COLOR_NAME[rg.color] : ''} or ${rangSymbol(top)}`}</p>;
}

/** a seat's small line: said last card, one card left, forgot to say it */
function seatTag(rg: RangView, id: string, cards: number) {
  if (rg.missed.includes(id)) return <span className="c7-tag miss">🙊 Missed</span>;
  if (rg.called.includes(id) && cards === 1) return <span className="c7-tag call">📢 Last card</span>;
  if (cards === 1) return <span className={cx('c7-tag one', rg.atRisk === id && 'risk')}>1 card!</span>;
  return null;
}

/** landscape: my Rang cards fanned like a held hand (FanHand's layout with Rang cards) */
function RangFanHand({ cards, onTap, deal, fresh = [], playable, dimRest }: { cards: RangCardData[]; onTap?: (id: string) => void; deal?: boolean; fresh?: string[]; playable?: string[]; dimRest?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const box = useBox(ref);
  const layout = useMemo(() => fanLayout(cards, box), [cards, box]);
  return (
    <div className={cx('fan-hand rg-fan-hand', !onTap && 'read-only')} ref={ref}>
      {cards.length === 0 && <p className="hand-empty">No cards left</p>}
      {layout.spots.map(({ card, style }, i) => {
        const ok = !!playable?.includes(card.id);
        return (
          <RangCard
            key={card.id}
            card={card}
            onClick={onTap ? () => onTap(card.id) : undefined}
            note={ok ? ', playable' : undefined}
            className={cx('fan-card', deal && 'deal', fresh.includes(card.id) && 'fresh', ok && 'playable', dimRest && playable && !ok && 'dim')}
            style={{ ...style, ['--cw' as string]: `${layout.cw}px`, animationDelay: deal ? `${i * 26}ms` : undefined }}
          />
        );
      })}
    </div>
  );
}

/** overlapping rows of Rang cards that fit the screen width (Hand's layout, for Rang cards) */
function RangHand({ cards, onTap, deal, fresh = [], playable, dimRest }: { cards: RangCardData[]; onTap?: (id: string) => void; deal?: boolean; fresh?: string[]; playable?: string[]; dimRest?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const big = cards.length > BIG_HAND;
  const cw = width >= 480 ? (big ? 62 : 70) : big ? 50 : 58;
  const perRowMax = Math.max(1, Math.floor((width - cw) / (big ? BIG_SLICE : MIN_SLICE)) + 1);
  const rowCount = Math.max(1, Math.ceil(cards.length / perRowMax));
  const perRow = Math.ceil(cards.length / rowCount);
  const slice = perRow > 1 ? Math.min(cw + 6, (width - cw) / (perRow - 1)) : 0;
  const rows = Array.from({ length: rowCount }, (_, r) => cards.slice(r * perRow, (r + 1) * perRow));
  return (
    <div className={cx('hand rg-hand', big && rowCount > 1 && 'tight')} ref={ref} style={{ ['--cw' as string]: `${cw}px`, ['--row-show' as string]: BIG_ROW_SHOW }}>
      {cards.length === 0 && <p className="hand-empty">No cards left</p>}
      {cards.length > 0 &&
        rows.map((row, r) => (
          <div key={r} className="hand-row" style={{ width: slice * (row.length - 1) + cw, height: cw * RATIO + 14 }}>
            {row.map((card, i) => {
              const ok = !!playable?.includes(card.id);
              return (
                <RangCard
                  key={card.id}
                  card={card}
                  onClick={onTap ? () => onTap(card.id) : undefined}
                  note={ok ? ', playable' : undefined}
                  className={cx(deal ? 'in-hand deal' : fresh.includes(card.id) ? 'in-hand fresh' : 'in-hand', ok && 'playable', dimRest && playable && !ok && 'dim')}
                  style={{ left: i * slice, zIndex: r * 100 + i, animationDelay: deal ? `${(r * perRow + i) * 28}ms` : undefined }}
                />
              );
            })}
          </div>
        ))}
    </div>
  );
}

const NO_CARDS: RangCardData[] = [];

/** doubles: pick which same-number cards go down together, then the colour that comes next (the card of that colour goes last) */
function DoublesSheet({
  card,
  partners,
  playable,
  busy,
  onPlay,
  onClose,
}: {
  card: RangCardData;
  partners: RangCardData[];
  /** my cards that fit on the pile now: one of them has to go down first */
  playable: string[];
  busy: boolean;
  onPlay: (first: RangCardData, extras: string[]) => void;
  onClose: () => void;
}) {
  // the extras put down with the tapped card; all of them to start with
  const [picked, setPicked] = useState<string[]>(() => partners.map((c) => c.id));
  const toggle = (id: string) => setPicked((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  const chosen = [card, ...partners.filter((c) => picked.includes(c.id))];
  // a colour can come next when a card of it can go last and another chosen card that fits can go first
  const orderFor = (color: RangColor): RangCardData[] | null => {
    const last = [...chosen].reverse().find((c) => c.color === color && chosen.some((f) => f !== c && playable.includes(f.id)));
    if (!last) return null;
    const first = (playable.includes(card.id) && card !== last ? card : chosen.find((f) => f !== last && playable.includes(f.id)))!;
    return [first, ...chosen.filter((c) => c !== first && c !== last), last];
  };
  const colors = RANG_COLORS.filter((c) => chosen.length > 1 && orderFor(c));
  const [color, setColor] = useState<RangColor | null>(null);
  // the colour asked for, while it can still be done; else the last chosen card's own
  const next = color && colors.includes(color) ? color : (chosen[chosen.length - 1].color ?? colors[0] ?? null);
  const order = next && chosen.length > 1 ? (orderFor(next) ?? chosen) : chosen;
  return (
    <Backdrop onClose={onClose}>
      <div className="rg-sheet-head">
        <h3>{`Doubles · ${card.value}`}</h3>
      </div>
      <p className="muted small">Tap a card to add it or leave it out.</p>
      <div className="rg-doubles">
        <span className="rg-dbl on first">
          <RangCard card={card} size="md" />
          <i className="rg-dbl-n">{order.indexOf(card) + 1}</i>
        </span>
        {partners.map((c) => {
          const at = order.indexOf(c);
          return (
            <span key={c.id} className={cx('rg-dbl', at >= 0 && 'on')}>
              <RangCard card={c} size="md" onClick={() => toggle(c.id)} note={at >= 0 ? ', added' : ', left out'} />
              {at >= 0 && <i className="rg-dbl-n">{at + 1}</i>}
            </span>
          );
        })}
      </div>
      {colors.length > 1 && (
        <>
          <p className="label">Colour next</p>
          <div className="rg-dbl-colors" role="radiogroup" aria-label="Colour next">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={next === c}
                className={cx('rg-dbl-color', `rg-${c}`, next === c && 'on')}
                onClick={() => setColor(c)}
              >
                <i className="rg-dot" aria-hidden />
                {RANG_COLOR_NAME[c]}
              </button>
            ))}
          </div>
        </>
      )}
      {colors.length <= 1 && next && chosen.length > 1 && (
        <p className={cx('rg-dbl-next', `rg-${next}`)}>
          <i className="rg-dot" aria-hidden />
          {`Colour next: ${RANG_COLOR_NAME[next]}`}
        </p>
      )}
      <div className="confirm-actions">
        <button className="btn ghost" disabled={busy} onClick={() => onPlay(card, [])}>
          Only this card
        </button>
        <button className="btn primary" disabled={busy || chosen.length < 2} onClick={() => onPlay(order[0], order.slice(1).map((c) => c.id))}>
          {`Put down ${chosen.length} together`}
        </button>
      </div>
    </Backdrop>
  );
}

/** game time left, ticking each second from the server's ms left (each view resets it) */
function GameClock({ msLeft }: { msLeft: number }) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + msLeft);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setEndsAt(Date.now() + msLeft), [msLeft]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span className={cx('rg-clock', left <= 30 && 'low')} role="timer" aria-label={`${text} of game time left`}>
      ⏱ {text}
    </span>
  );
}

type TableProps = { view: RoomView; actions: Actions; bubbles: ChatBubble[]; auth: Auth; notes?: Note[] };

/** the Rang table; with 7-0 swap on, every 0 and 7 on it shows its swap badge */
export function RangTable(props: TableProps) {
  return (
    <RangSwapContext.Provider value={props.view.config.rangSwap === true}>
      <RangTableInner {...props} />
    </RangSwapContext.Provider>
  );
}

function RangTableInner({ view, actions, bubbles, auth, notes = [] }: TableProps) {
  const rg = view.rang;
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
  const [acts, setActs] = useState<Record<string, SeatAct>>({});
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmKick, setConfirmKick] = useState<{ id: string; name: string } | null>(null);
  /** watcher stuck to one player; null follows whoever's turn it is */
  const [pinned, setPinned] = useState<string | null>(null);
  /** whose seat I tapped, to throw an emoji or send coins */
  const [target, setTarget] = useState<string | null>(null);
  /** a wild waiting for its colour, or a 7 waiting for who to swap with */
  const [choice, setChoice] = useState<Choice>(null);
  /** I tapped Pick myself this turn (so an automatic pick can be told apart) */
  const tappedPick = useRef(false);
  const [calling, setCalling] = useState(false);
  const waitNote = useRef(0);
  /** the last move already shown; undefined until the first view */
  const lastSeen = useRef<number | undefined>(undefined);
  const prevMarks = useRef<{ called: string[]; missed: string[]; deck: number } | null>(null);
  /** bumps when hands are swapped, so swapped-in cards aren't marked new */
  const [swapKey, setSwapKey] = useState(0);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const pileRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const handRef = useRef<HTMLElement>(null);
  const startLevel = useRef<number | null>(null);
  const levelShown = useRef(false);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const myTurn = playing && !!rg && view.turnId === view.meId;
  const turnEndsAt = useTurnEndsAt(view);
  const isHost = view.hostId === view.meId;
  const hostOffline = ![...view.players, ...view.watchers].find((p) => p.id === view.hostId)?.connected;
  const myIndex = view.players.findIndex((p) => p.id === view.meId);
  const opponents = myIndex < 0 ? view.players : [...view.players.slice(myIndex + 1), ...view.players.slice(0, myIndex)];
  /** who plays after me, in the current direction */
  const nextId = myIndex < 0 ? null : ((rg?.dir === -1 ? [...opponents].reverse() : opponents).find((p) => p.cardCount > 0 && !p.place)?.id ?? null);
  const name = (id: string | null | undefined) =>
    id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone');
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  const pinnedId = pinned && view.players.some((p) => p.id === pinned) ? pinned : null;
  const followId = watching ? (pinnedId ?? view.turnId ?? view.players[0]?.id ?? null) : null;
  const followed = view.players.find((p) => p.id === followId);
  const targetPlayer = view.players.find((p) => p.id === target && p.id !== view.meId);
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const spotOf = (id: string) => (id === view.meId ? handRef.current : seatEls.current.get(id));
  const hand = rg?.hand ?? NO_CARDS;
  const swapOn = view.config.rangSwap;
  const stackOn = view.config.rangStack;
  /** players a 7 can swap with: everyone else still holding cards */
  const swapTargets = view.players.filter((p) => p.id !== view.meId && p.cardCount > 0 && !p.place);
  const doublesOn = view.config.rangDoubles === true;
  const forceOn = view.config.rangForce === true;
  const handSize = view.config.rangHand ?? RANG_HAND_SIZE;
  const missedPenalty = view.config.rangMissed ?? RANG_MISSED_PENALTY;
  // 2v2: 🔵 and 🟠 teams, and my partner
  const teamOf = (id: string): 'a' | 'b' | null => (view.teams?.[0].includes(id) ? 'a' : view.teams?.[1].includes(id) ? 'b' : null);
  const myTeam = view.teams?.find((t) => t.includes(view.meId));
  const partnerId = myTeam?.find((id) => id !== view.meId) ?? null;

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
    lastSeen.current = undefined;
    prevMarks.current = null;
    setActs({});
    setChoice(null);
    startLevel.current = me?.level ?? null;
    levelShown.current = false;
    const freshDeal = !!rg && rg.pileCount === 1 && view.players.every((p) => p.cardCount <= handSize + 1);
    if (!freshDeal) return;
    setDealing(true);
    sfx.deal();
    const frame = requestAnimationFrame(() => {
      const from = deckRef.current?.getBoundingClientRect();
      if (!from) return;
      const targets = [...opponents.map((p) => seatEls.current.get(p.id)), watching ? null : handRef.current];
      const owners = [...opponents.map((p) => p.id), view.meId];
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

  // each new move: a seat label, a sound, and cards flying to the pile or from the deck
  const flightSeq = useRef(0);
  /** the move before the one being shown, so a Force play's pick isn't flown twice */
  const prevMove = useRef<Move | null>(null);
  /** face-down cards flying from the deck to whoever picked */
  const pickFly = (id: string | null | undefined, count: number, delay: number) => {
    const to = id ? spotOf(id) : null;
    const p = view.players.find((x) => x.id === id);
    if (!deckRef.current || !to || count <= 0) return;
    // every card picked flies, so a stack of 12 looks like 12
    fly({ key: `pick-${++flightSeq.current}`, count: Math.min(count, 16), from: deckRef.current.getBoundingClientRect(), to: to.getBoundingClientRect(), delay, vanish: true, backs: p ? [p.back] : undefined, auras: p ? [p.shop?.aura ?? null] : undefined });
  };
  useEffect(() => {
    if (!rg) return;
    const last = rg.last;
    const before = lastSeen.current;
    lastSeen.current = last?.id ?? -1;
    const prev = prevMove.current;
    prevMove.current = last;
    if (before === undefined || !last || last.id === before) return;
    const by = last.playerId;
    const next: Record<string, SeatAct> = {};
    const say = (id: string | null | undefined, act: SeatAct) => {
      if (id) next[id] = act;
    };
    if (last.kind === 'play' && last.card) {
      const card = last.card;
      const move = last as Move;
      // doubles: every card put down, the top one last
      const down = move.cards && move.cards.length > 1 ? move.cards : [card];
      // Force play: the picked card flies from the deck first, unless that pick was already shown
      const pickShown = !!prev && prev.id === last.id - 1 && prev.kind === 'pick' && prev.playerId === by;
      const playDelay = move.forced ? (pickShown ? 150 : 520) : 0;
      if (move.forced && !pickShown) {
        pickFly(by, 1, 0);
        window.setTimeout(() => sfx.draw(), 120);
      }
      const from = by ? spotOf(by) : null;
      if (from && pileRef.current) {
        // face up, like Crazy 7
        const box = from.getBoundingClientRect();
        const to = pileRef.current.getBoundingClientRect();
        down.forEach((c, i) => fly({ key: `play-${++flightSeq.current}`, count: 1, rangCard: c, size: 'md', from: box, to, delay: playDelay + i * 140 }));
      }
      window.setTimeout(() => {
        if (card.value === 'draw2' || card.value === 'wild4') sfx.seven();
        else sfx.play(down.length);
      }, playDelay);
      const chip = { card, color: last.color ?? null };
      // "picked & played" for a Force play, "2× 7" for doubles
      const how = [move.forced && 'picked & played', down.length > 1 && `${down.length}× ${card.value}`].filter(Boolean).join(' ');
      const lead = how ? `${how} · ` : '';
      if (swapOn && card.value === '7' && last.targetId) {
        say(by, { text: `${lead}swapped with ${name(last.targetId)}`, ...chip });
        say(last.targetId, { text: `swapped with ${name(by)}` });
        setSwapKey((k) => k + 1);
      } else if (swapOn && card.value === '0') {
        say(by, { text: `${lead}passed hands on`, ...chip });
        setSwapKey((k) => k + 1);
      } else {
        const verb = move.forced ? 'picked & played' : down.length > 1 ? `played ${down.length}× ${card.value}` : card.value === 'reverse' ? 'reversed' : 'played';
        say(by, { text: move.forced && down.length > 1 ? `${verb} · ${down.length}× ${card.value}` : verb, ...chip });
        if (card.value === 'skip' && last.targetId) say(last.targetId, { text: 'skipped' });
      }
    } else if ((last.kind === 'pick' || last.kind === 'penalty' || last.kind === 'missed') && last.count > 0) {
      pickFly(by, last.count, 0);
      // the missed-call penalty comes as a penalty move for someone who was in missed
      const missed = last.kind === 'missed' || (last.kind === 'penalty' && !!by && !!prevMarks.current?.missed.includes(by));
      if (missed) sfx.caught();
      else window.setTimeout(() => sfx.draw(), 120);
      say(by, { text: missed ? `missed · +${last.count}` : `+${last.count}` });
    } else if (last.kind === 'pass') {
      sfx.pass();
      say(by, { text: 'passed' });
    } else if (last.kind === 'challenge') {
      (last.guilty ? sfx.caught : sfx.truth)();
      // guilty: the +4 flies back to its player, who also picks; fair: the challenger picks
      const picker = last.guilty ? last.targetId : by;
      const owner = last.guilty ? spotOf(last.targetId ?? '') : null;
      if (owner && pileRef.current) {
        fly({ key: `back-${++flightSeq.current}`, count: 1, from: pileRef.current.getBoundingClientRect(), to: owner.getBoundingClientRect(), vanish: true, rangCard: { id: 'returned', color: null, value: 'wild4' } });
      }
      pickFly(picker, last.count, last.guilty ? 500 : 200);
      if (last.count > 0) window.setTimeout(() => sfx.draw(), 320);
      if (last.guilty) {
        say(by, { text: 'challenged' });
        say(last.targetId, { text: `+4 back · +${last.count || 4}` });
      } else {
        say(by, { text: `+${last.count || 6} · fair +4` });
      }
    }
    if (Object.keys(next).length > 0) setActs((prev) => ({ ...prev, ...next }));
  }, [rg?.last?.id]);

  // cards that came into my hand (picked, or a +2/+4) are marked for a few seconds
  const handIds = useMemo(() => hand as unknown as Card[], [hand]);
  const newIds = useNewCards(handIds, { reset: `${view.phase}-${swapKey}` });

  const oneCard = playing ? view.players.filter((p) => p.cardCount === 1).map((p) => p.id) : [];
  useOneCardAlert(oneCard);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const myLevel = view.coinResults?.find((r) => r.playerId === view.meId)?.level ?? null;
  useEffect(() => {
    if (view.phase !== 'over' || levelShown.current || myLevel === null || startLevel.current === null || myLevel <= startLevel.current) return;
    levelShown.current = true;
    setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  // someone said last card (bell), someone was caught (buzz), the pile was shuffled into the deck
  useEffect(() => {
    if (!rg) return;
    const before = prevMarks.current;
    prevMarks.current = { called: rg.called, missed: rg.missed, deck: rg.deckCount };
    if (!before) return;
    if (rg.missed.some((id) => !before.missed.includes(id))) sfx.caught();
    else if (rg.called.some((id) => !before.called.includes(id))) sfx.lastCard();
    if (rg.deckCount > before.deck) sfx.shuffle();
  }, [view]);

  // each new turn of mine, even one that comes straight back to me
  useOnChange(myTurn ? (rg?.turn ?? null) : null, (turn) => {
    tappedPick.current = false;
    if (turn === null) {
      setChoice(null);
      return;
    }
    sfx.turn();
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(120);
  });

  useOnChange(view.phase, (phase) => {
    if (phase !== 'over' || view.stopped) return;
    (view.loserIds.includes(view.meId) ? sfx.lose : sfx.win)();
    // 2v2: both partners get confetti
    view.winnerIds.forEach((winner) => confettiAt(spotOf(winner), winner === view.meId ? { count: 60, spread: 1.3 } : { count: 30, spread: 0.8 }));
  });

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    await fn();
    setBusy(false);
  };

  /** cards that may answer a +2 / +4 right now */
  const stackText = rg?.top?.value === 'wild4' ? 'a +4' : 'a +2 or +4';

  // one tap plays a glowing card; a wild asks for a colour, a 7 (7-0 on) asks who to swap with
  const tapCard = (id: string) => {
    if (!rg) return;
    if (!myTurn) {
      if (playing && Date.now() - waitNote.current > 2500) {
        waitNote.current = Date.now();
        actions.toast('Wait for your turn');
      }
      return;
    }
    const card = hand.find((c) => c.id === id);
    if (!card) return;
    if (!rg.playable.includes(id)) {
      const top = rg.top;
      actions.toast(
        rg.penalty > 0
          ? stackOn
            ? `Only ${stackText} now, or pick ${rg.penalty}`
            : `Pick ${rg.penalty} first`
          : top && rg.color
            ? `That card doesn't match ${RANG_COLOR_NAME[rg.color]} or ${rangSymbol(top)}`
            : "That card can't go now",
      );
      return;
    }
    if (isRangWild(card)) {
      setChoice({ kind: 'color', card });
      return;
    }
    // doubles: same-number cards in hand open the sheet to put them down together
    // doubles only on the same number: on a green 8, a green 4 goes alone even with other 4s in hand
    const sameAsTop = !!rg.top && rg.top.value === card.value;
    const partners = doublesOn && isNumber(card) && sameAsTop ? hand.filter((c) => c.id !== id && c.value === card.value) : [];
    if (partners.length > 0) {
      setChoice({ kind: 'doubles', card, partners });
      return;
    }
    playNumber(card, []);
  };

  /** a number card (with any doubles); a 7 with 7-0 swap asks who to swap with while cards are left */
  const playNumber = (card: RangCardData, extras: string[]) => {
    if (swapOn && card.value === '7' && hand.length > 1 + extras.length && swapTargets.length > 0) {
      setChoice({ kind: 'target', card, extras });
      return;
    }
    setChoice(null);
    void act(() => actions.rangPlay(card.id, undefined, undefined, extras.length > 0 ? extras : undefined));
  };

  const playChoice = (color?: RangColor, targetId?: string) => {
    const c = choice;
    setChoice(null);
    const extras = c?.kind === 'target' && c.extras && c.extras.length > 0 ? c.extras : undefined;
    if (c) void act(() => actions.rangPlay(c.card.id, color, targetId, extras));
  };
  const pick = () => {
    tappedPick.current = true;
    void act(() => actions.rangPick());
  };
  const pass = () => void act(() => actions.rangPass());
  const challenge = () => void act(() => actions.rangChallenge());
  const call = async () => {
    if (calling) return;
    unlockSpeech();
    setCalling(true);
    await actions.rangCall();
    setCalling(false);
  };
  const toggleSound = () => {
    unlockSpeech();
    setSoundOn(!sound);
    setSound(!sound);
  };

  let status = '';
  if (rg && playing && rg.auto && view.turnId) {
    // the room is about to pick or pass for the player on turn, a moment later so everyone can follow
    const who = name(view.turnId);
    if (rg.missed.includes(view.turnId)) status = myTurn ? `Missed last card · picking ${missedPenalty} for you…` : `${who} missed last card · picking ${missedPenalty}…`;
    else if (rg.penalty > 0) status = myTurn ? `Picking ${rg.penalty} for you…` : `${who} picks ${rg.penalty}…`;
    else if (rg.picks === 0) status = myTurn ? 'No matching card · picking one for you…' : `${who} has no match · picking a card…`;
    else status = myTurn ? 'Still no match · your turn passes…' : `${who}: still no match · passing…`;
  } else if (rg && playing) {
    if (myTurn) {
      if (rg.penalty > 0) status = rg.playable.length > 0 ? `Pick ${rg.penalty} or stack ${stackText}` : `Pick ${rg.penalty}`;
      else if (rg.picks > 0) {
        const head = rg.picks === 1 && !tappedPick.current ? 'No match, we picked one for you' : `Picked ${rg.picks} of ${rg.maxPicks}`;
        const choices = [rg.playable.length > 0 && 'play a glowing card', rg.canPick && 'pick again', rg.canPass && 'pass'].filter(Boolean);
        status = `${head} · ${choices.join(' or ') || 'play a glowing card'}`;
      } else status = rg.playable.length > 0 ? 'Play a glowing card' : 'Pick a card';
    } else {
      status = `${name(view.turnId)}'s turn`;
    }
  }
  const urgent = !!rg && rg.atRisk === view.meId;
  const picksLeft = (rg?.maxPicks ?? view.config.rangPicks) - (rg?.picks ?? 0);
  /** a 0 I could play now passes every hand on */
  const zeroHint = myTurn && swapOn && !!rg && hand.some((c) => c.value === '0' && rg.playable.includes(c.id));
  const colorCount = (color: RangColor) => hand.filter((c) => c.color === color).length;
  // the top card's play: "played 2×" for doubles, "picked & played" for a Force play
  const topMove = rg?.last?.kind === 'play' && rg.last.card?.id === rg.top?.id ? (rg.last as Move) : null;
  const topCount = topMove?.cards?.length ?? 1;
  const topHow = topMove?.forced ? 'picked & played' : topCount > 1 ? `played ${topCount}×` : 'played';

  if (!rg) {
    return (
      <main className="screen center-screen">
        <p className="muted">Dealing…</p>
      </main>
    );
  }

  // one opponent's seat (portrait: in the row on top; landscape: standing at the far rail)
  const seatOf = (p: (typeof view.players)[number]) => {
    const a = acts[p.id];
    return (
      <Seat
        key={p.id}
        player={p}
        turn={p.id === view.turnId}
        passed={false}
        viewing={watching && p.id === followId}
        team={teamOf(p.id)}
        partner={p.id === partnerId}
        action={a?.text ?? null}
        bubble={bubbleOf(p.id)}
        onClick={watching ? () => setPinned(pinnedId === p.id ? null : p.id) : () => setTarget(p.id)}
        label={watching ? `See ${p.name}'s cards` : `Throw an emoji at ${p.name}`}
        tag={
          <>
            {a?.card && <RangChip card={a.card} color={a.color} />}
            {seatTag(rg, p.id, p.cardCount)}
            {playing && p.id === nextId && <span className="c7-tag next">next</span>}
          </>
        }
        extra={cx(playing && p.cardCount === 1 && 'c7-one spot', playing && rg.penalty > 0 && p.id === view.turnId && 'c7-hit')}
        turnEndsAt={p.id === view.turnId ? turnEndsAt : null}
        turnSec={view.config.turnSec}
        seatRef={(el) => {
          if (el) seatEls.current.set(p.id, el);
          else seatEls.current.delete(p.id);
        }}
      />
    );
  };
  // landscape: where everyone sits round the 3D table
  const spots = seatSpots(opponents.length);
  // the table's extra switches that the shared rules list doesn't name
  const extraRules = [
    view.teams && '2 vs 2',
    doublesOn && 'Doubles',
    forceOn && 'Force play',
    handSize !== RANG_HAND_SIZE && `${handSize} cards each`,
    missedPenalty !== RANG_MISSED_PENALTY && `Last card penalty ${missedPenalty}`,
  ].filter(Boolean) as string[];
  // what only I need now and then, kept in the table info panel instead of on the table
  const infoMine = (
    <p className="tinfo-counts">
      {partnerId && <span>{`${teamOf(view.meId) === 'a' ? '🔵' : '🟠'} Team · with ${name(partnerId)}`}</span>}
      {!partnerId && watching && view.teams && <span>🔵 vs 🟠</span>}
      {me && <span>{`🃏 Cards in your hand · ${hand.length}`}</span>}
      {me && hand.length > 0 && <span>{`🔢 Points in your hand · ${rangHandPoints(hand)}`}</span>}
      {rg.msLeft !== null && <span>⏱ When game time runs out, the fewest points win</span>}
      {extraRules.length > 0 && <span>{`➕ ${extraRules.join(' · ')}`}</span>}
      {view.config.stake > 0 && <span>{`🪙 Pot ${compactCoins(pot)}`}</span>}
    </p>
  );
  const infoTips = [
    'Tap a glowing card to play it',
    'Tap the deck when it glows to pick a card',
    'The ring round the pile is the colour to match; the arrows show which way play goes',
    'Down to two cards? Say 📢 Last card, then play',
    view.config.rangChallenge && 'Challenge a +4: if they had the colour, they take it back and pick 4; if not, you pick 6',
    swapOn && 'A 7 swaps hands with anyone; a 0 passes every hand on',
    'Hold the pile to react to the last play',
  ].filter(Boolean) as string[];

  return (
    <main className={cx('table c7-table rg-table', myTurn && 'rg-my-turn')}>
      <TableScene ranked={view.config.ranked}>
        {land && (
          <>
            {opponents.map((p, i) => (
              <Fragment key={p.id}>
                <OnTable x={spots[i].cards.x} y={spots[i].cards.y}>
                  <OppCards count={p.cardCount} back={p.back} aura={p.shop?.aura ?? null} turn={spots[i].cards.turn} />
                </OnTable>
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
            {/* the way play goes, round the deck and the pile */}
            <OnTable x={50} y={47} className="rg3-dir-spot">
              <RangArrows dir={rg.dir} />
            </OnTable>
            <OnTable x={58} y={47} className="rg3-ring-spot">
              <RangRing rg={rg} />
            </OnTable>
            <OnTable x={41} y={47} z={3} className="rg3-deck-spot">
              <RangDeck3D count={rg.deckCount} live={myTurn && rg.canPick && !busy} penalty={rg.penalty} boxRef={deckRef} onPick={pick} />
            </OnTable>
            <OnTable x={58} y={47} z={3} className="pile-spot rg3-pile-spot">
              <PileReact onReact={(i) => void actions.reactOnPile(i)}>
                <RangPile3D rg={rg} boxRef={pileRef} />
              </PileReact>
            </OnTable>
            {/* +2 / +4 waiting: a small sign standing by the deck */}
            {playing && rg.penalty > 0 && (
              <OnTable x={24} y={51} stand className="felt-sign rg3-sign">
                <div key={`${rg.penalty}-${view.turnId}`} className={cx('rg3-penalty', myTurn && 'mine')} role="status">
                  {`Pick ${rg.penalty}!`}
                  {(rg.chain?.length ?? 0) > 1 && <small>{rg.chain.map((n) => `+${n}`).join(' ')}</small>}
                </div>
              </OnTable>
            )}
          </>
        )}
      </TableScene>
      <header className="topbar">
        {land && <TableInfo view={view} notes={notes} mine={infoMine} tips={infoTips} />}
        {!land && (
          <>
            <span className="code-chip">{view.code}</span>
            <span className="c7-chip rg-game-chip">
              🌈<span> Rang</span>
            </span>
            {partnerId && (
              <span className={cx('team-chip rg-team-chip', `team-${teamOf(view.meId)}`)} aria-label={`Your team: ${teamOf(view.meId) === 'a' ? 'blue' : 'orange'}, with ${name(partnerId)}`}>
                {`${teamOf(view.meId) === 'a' ? '🔵' : '🟠'} Team · with ${name(partnerId)}`}
              </span>
            )}
            {!partnerId && watching && view.teams && <span className="team-chip rg-team-chip">🔵 vs 🟠</span>}
            {view.config.stake > 0 && <span className="pot-chip">🪙 Pot {compactCoins(pot)}</span>}
          </>
        )}
        {/* game time: when it runs out, the fewest points win */}
        {rg && rg.msLeft !== null && view.phase === 'playing' && <GameClock msLeft={rg.msLeft} />}
        <span className="grow" />
        <div className="topbar-actions">
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              <span key={view.watchRequests.length} className="req-ring" aria-hidden />
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <FullscreenButton />
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
      <section className="center c7-center rg-center">
        {playing && rg.penalty > 0 ? (
          <div key={`${rg.penalty}-${view.turnId}`} className={cx('c7-banner', myTurn && 'mine')} role="status">
            {myTurn
              ? stackOn && rg.playable.length > 0
                ? `Pick ${rg.penalty} or stack ${stackText}!`
                : `Pick ${rg.penalty}!`
              : `${name(view.turnId)} must pick ${rg.penalty}${stackOn ? ` or stack ${stackText}` : ''}`}
            {/* how a stacked penalty adds up: +2 +2 +4 +4 = 12 */}
            {(rg.chain?.length ?? 0) > 1 && <small className="rg-chain">{`${rg.chain.map((n) => `+${n}`).join(' ')} = ${rg.penalty}`}</small>}
          </div>
        ) : (
          <div className="round-chip set c7-rules-chip">
            {[
              view.teams && '2 vs 2',
              `Up to ${rg.maxPicks} pick${rg.maxPicks > 1 ? 's' : ''} a turn`,
              stackOn && 'Stacking on',
              swapOn && '7 and 0 swap',
              doublesOn && 'Doubles',
              forceOn && 'Force play',
              handSize !== RANG_HAND_SIZE && `${handSize} cards each`,
              missedPenalty !== RANG_MISSED_PENALTY && `Last card penalty ${missedPenalty}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
        {myTurn && rg.canChallenge && <p className="rg-challenge-hint">Challenge the +4: if they had the colour, they take it back and pick 4; if not, you pick 6</p>}
        <div className="c7-board" style={{ ['--rg-now' as string]: rg.color ? RANG_HEX[rg.color] : 'transparent' }}>
          <Deck count={rg.deckCount} live={myTurn && rg.canPick && !busy} penalty={rg.penalty} boxRef={deckRef} onPick={pick} />
          <PileReact onReact={(i) => void actions.reactOnPile(i)}>
            <Pile rg={rg} boxRef={pileRef} />
          </PileReact>
        </div>
        <ColorBar rg={rg} />
        {rg.top && rg.topBy && (
          <p className="c7-played">
            <b>{name(rg.topBy)}</b>
            {` ${topHow} `}
            <RangChip card={rg.top} color={rg.color} />
          </p>
        )}
        {playing && <MatchHint rg={rg} stack={stackOn} />}
        {!myTurn && status && <p className="turn-status">{status}</p>}
      </section>
      )}

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
          {followId && (land ? <RangFanHand cards={rg.watch?.[followId] ?? NO_CARDS} /> : <RangHand cards={rg.watch?.[followId] ?? NO_CARDS} />)}
        </section>
      )}

      <section
        ref={handRef}
        className={cx('hand-area', watching && 'hidden', myTurn && 'my-turn', oneCard.includes(view.meId) && 'spot')}
        data-member={watching ? undefined : view.meId}
      >
        {!land && (
          <div className="hand-tags">
            <SecretChip view={view} />
          </div>
        )}
        <div className="hand-head">
          {myTurn ? (
            <span className="your-turn">
              YOUR TURN {turnEndsAt && <TurnCountdown endsAt={turnEndsAt} away={me?.away} sec={view.config.turnSec} />}
            </span>
          ) : (
            !land && (
              <span>
                {`Your cards · ${hand.length}`} <StreakMark player={me} />
              </span>
            )
          )}
          {myTurn && !land && <span className="turn-hint">{status}</span>}
          {newIds.length > 0 && !land && <span className="new-chip">+{newIds.length} new</span>}
          {hand.length > 0 && !land && <span className="rg-points">{`${rangHandPoints(hand)} pts`}</span>}
          {!myTurn && rg.called.includes(view.meId) && hand.length === 1 && <span className="c7-tag call">📢 Said it</span>}
          {rg.missed.includes(view.meId) && <span className="c7-tag miss">{`🙊 Missed · you pick ${missedPenalty}`}</span>}
        </div>
        {zeroHint && !land && <p className="rg-zero-hint">{`A 0 passes every hand on ${rg.dir === 1 ? '↻' : '↺'}`}</p>}
        {land ? (
          <RangFanHand cards={hand} playable={myTurn ? rg.playable : undefined} dimRest={myTurn && !dealing} onTap={watching ? undefined : tapCard} deal={dealing} fresh={newIds} />
        ) : (
          <RangHand
            cards={hand}
            playable={myTurn ? rg.playable : undefined}
            dimRest={myTurn && !dealing}
            // always tappable so cards don't remount each turn; taps count only on my turn
            onTap={watching ? undefined : tapCard}
            deal={dealing}
            fresh={newIds}
          />
        )}
      </section>

      <footer className="action-bar c7-actions rg-actions">
        {rg.canCall && (
          <button className={cx('btn c7-call', urgent && 'urgent', !myTurn && 'grow')} disabled={calling} onClick={() => void call()}>
            {`📢 ${urgent ? 'Say LAST CARD now!' : hand.length === 2 ? 'Last card (say it, then play)' : 'Last card!'}`}
          </button>
        )}
        {myTurn && rg.canChallenge && (
          <button className="btn rg-challenge" disabled={busy} onClick={challenge}>
            ⚖️ Challenge
          </button>
        )}
        {myTurn && rg.penalty > 0 && (
          <button className="btn danger grow rg-pick" disabled={busy || !rg.canPick} onClick={pick}>
            {`Pick ${rg.penalty}`}
          </button>
        )}
        {myTurn && rg.penalty === 0 && rg.canPick && (
          <button className={cx('btn grow rg-pick', rg.playable.length === 0 && 'primary')} disabled={busy} onClick={pick}>
            {`Pick a card · ${picksLeft} left`}
          </button>
        )}
        {myTurn && rg.canPass && (
          <button className={cx('btn rg-pass', !rg.canPick && rg.playable.length === 0 && 'primary grow')} disabled={busy} onClick={pass}>
            Pass
          </button>
        )}
        {myTurn && !land && rg.penalty === 0 && !rg.canPick && !rg.canPass && !rg.canCall && <p className="hint">Tap a glowing card to play it</p>}
        {!myTurn && !rg.canCall && (!land || watching) && (
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

      {choice?.kind === 'color' && myTurn && (
        <Backdrop onClose={() => setChoice(null)}>
          <div className="rg-sheet-head">
            <RangCard card={choice.card} size="sm" />
            <h3>Pick a colour</h3>
          </div>
          <div className="rg-colors">
            {RANG_COLORS.map((c) => (
              <button key={c} type="button" className={cx('rg-color-btn', `rg-${c}`)} disabled={busy} onClick={() => playChoice(c)}>
                <b>{RANG_COLOR_NAME[c]}</b>
                <small>{`${colorCount(c)} in hand`}</small>
              </button>
            ))}
          </div>
          <button className="btn ghost block" onClick={() => setChoice(null)}>
            Cancel
          </button>
        </Backdrop>
      )}
      {choice?.kind === 'target' && myTurn && (
        <Backdrop onClose={() => setChoice(null)}>
          <div className="rg-sheet-head">
            <RangCard card={choice.card} size="sm" />
            <h3>Swap hands with…</h3>
            {choice.extras && choice.extras.length > 0 && <span className="rg-target-count">{`${choice.extras.length + 1}× 7`}</span>}
          </div>
          <p className="muted small">You give them your cards and take theirs.</p>
          <ul className="player-list rg-targets">
            {swapTargets.map((p) => (
              <li key={p.id}>
                <button type="button" className="player-row rg-target" disabled={busy} onClick={() => playChoice(undefined, p.id)}>
                  <Avatar name={p.name} avatar={p.avatar} bot={p.bot} size="sm" />
                  <span className="grow" data-no-translate>
                    {p.name}
                  </span>
                  <span className="rg-target-count">{`${p.cardCount} cards`}</span>
                </button>
              </li>
            ))}
          </ul>
          <button className="btn ghost block" onClick={() => setChoice(null)}>
            Cancel
          </button>
        </Backdrop>
      )}
      {choice?.kind === 'doubles' && myTurn && (
        <DoublesSheet key={choice.card.id} card={choice.card} partners={choice.partners} playable={rg.playable} busy={busy} onPlay={(first, extras) => playNumber(first, extras)} onClose={() => setChoice(null)} />
      )}
      {view.phase === 'over' && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
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
