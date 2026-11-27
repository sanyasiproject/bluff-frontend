// Dev only: a tiny Fruit Slice Duel server for the preview (gaps, items, magnets, strikes checked like the backend, collect window, slows, bots)
import { FRUIT_COLLECT_MS, FRUIT_ITEM_MS, FRUIT_ITEM_POINTS, FRUIT_KINDS, FRUIT_MAGNET_ROUNDS, FRUIT_MIN_REACTION_MS, FRUIT_SLOW_MS, type FruitItemKind, type FruitView } from '../../types';

const RESULT_MS = 1200;
const FRUITS = FRUIT_KINDS.filter((k) => k !== 'bomb') as Exclude<FruitItemKind, 'magnet'>[];

export interface DuelSim {
  v: FruitView;
  /** when the next item shows (during a gap) */
  nextAt: number;
  /** strikes on the current item: adjusted reaction per player */
  strikes: Record<string, number>;
  firstAt: number | null;
  resultUntil: number;
  /** bots' planned tap times on the current item */
  plan: Record<string, number>;
}

/** bot reaction by level (Normal, Hard, Expert) and how often they hit a magnet by mistake */
const BOT = [
  { lo: 430, hi: 760, oops: 0.18 },
  { lo: 320, hi: 560, oops: 0.09 },
  { lo: 250, hi: 420, oops: 0.04 },
];

const gap = () => 1000 + Math.random() * 1600;

export function newDuel(ids: string[], rounds: number, now: number): DuelSim {
  const zero = Object.fromEntries(ids.map((id) => [id, 0]));
  return {
    v: { phase: 'countdown', round: 0, rounds, item: null, result: null, scores: zero, slow: { ...zero }, startsAt: now + 3000, now },
    nextAt: now + 3000 + gap(),
    strikes: {},
    firstAt: null,
    resultUntil: 0,
    plan: {},
  };
}

/** a strike as the server checks it: the right item, once, human-fast, never longer than the time since it showed */
export function strikeIn(s: DuelSim, id: string, round: number, reaction: number, now: number): DuelSim {
  const it = s.v.item;
  if (s.v.phase !== 'play' || !it || it.round !== round || s.v.result?.round === round || id in s.strikes) return s;
  if (reaction < FRUIT_MIN_REACTION_MS || reaction > now - it.shownAt + 30) return s;
  const adj = reaction + ((s.v.slow[id] ?? 0) > 0 ? FRUIT_SLOW_MS : 0);
  return { ...s, strikes: { ...s.strikes, [id]: adj }, firstAt: s.firstAt ?? now };
}

/** one server tick; bots are the ids after the first, levels by seat */
export function tickDuel(s: DuelSim, now: number, bots: string[]): DuelSim {
  let x: DuelSim = { ...s, v: { ...s.v, now } };
  const v = x.v;
  if (v.phase === 'countdown') {
    if (now >= v.startsAt) x.v = { ...v, phase: 'play' };
    return x;
  }
  if (v.phase !== 'play') return x;
  // between items: the next one appears
  if (!v.item || v.result?.round === v.item.round) {
    if (now < x.resultUntil || now < x.nextAt) return x;
    if (v.round >= v.rounds) return { ...x, v: { ...v, phase: 'over', item: null } };
    const round = v.round + 1;
    const lastMagnet = v.item?.kind === 'magnet';
    const kind: FruitItemKind = !lastMagnet && Math.random() < 0.25 ? 'magnet' : FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const plan: Record<string, number> = {};
    bots.forEach((id, i) => {
      const b = BOT[i % BOT.length];
      if (kind === 'magnet' && Math.random() >= b.oops) return;
      plan[id] = now + b.lo + Math.random() * (b.hi - b.lo);
    });
    return { ...x, v: { ...v, round, item: { round, kind, shownAt: now } }, strikes: {}, firstAt: null, plan };
  }
  // bots strike when their time comes
  for (const [id, t] of Object.entries(x.plan)) if (now >= t && !(id in x.strikes)) x = strikeIn(x, id, v.item.round, Math.round(t - v.item.shownAt), now);
  const it = x.v.item!;
  const done = (x.firstAt !== null && now >= x.firstAt + FRUIT_COLLECT_MS) || now >= it.shownAt + FRUIT_ITEM_MS;
  if (!done) return x;
  // resolve: fastest takes a fruit; a magnet slows everyone who struck it
  const reactions: Record<string, number | null> = Object.fromEntries(Object.keys(x.v.scores).map((id) => [id, x.strikes[id] ?? null]));
  const by = Object.entries(x.strikes).sort((a, b) => a[1] - b[1]);
  const slow = Object.fromEntries(Object.entries(x.v.slow).map(([id, n]) => [id, Math.max(0, n - 1)]));
  const scores = { ...x.v.scores };
  let winner: string | null = null;
  let slowed: string[] = [];
  if (it.kind === 'magnet') {
    slowed = by.map(([id]) => id);
    for (const id of slowed) slow[id] = FRUIT_MAGNET_ROUNDS;
  } else if (by.length) {
    winner = by[0][0];
    scores[winner] += FRUIT_ITEM_POINTS[it.kind];
  }
  return {
    ...x,
    v: { ...x.v, scores, slow, result: { round: it.round, kind: it.kind, winner, reactions, slowed } },
    resultUntil: now + RESULT_MS,
    nextAt: now + RESULT_MS + gap(),
  };
}
