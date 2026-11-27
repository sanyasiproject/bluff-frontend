// Dev only (?fruitPreview=1, =over, &n=2..4, &time=45|60): Fruit Slice Duel on a fake room with bots slicing as the server's would
import { useEffect, useMemo, useRef, useState } from 'react';
import { FRUIT_POINTS, FRUIT_SLICE_SLACK_MS, fruitAt, fruitWave, type FruitView, type GameConfig, type PluggedMove, type PublicPlayer, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { FruitTable } from './FruitTable';

const IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];
const SKILL = [0, 0.55, 0.72, 0.85];

const player = (i: number): PublicPlayer =>
  ({ id: IDS[i], name: NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

/** a slice as the server checks it: on screen, close to now, once per player */
function applySlice(v: FruitView, id: string, ids: number[], at: number, now: number): FruitView {
  const wave = fruitWave(v.seed, v.seconds);
  if (v.phase !== 'play' || Math.abs(now - v.startsAt - at) > FRUIT_SLICE_SLACK_MS) return v;
  const done = new Set(v.sliced[id] ?? []);
  const good = ids.filter((x) => {
    const f = wave.find((w) => w.id === x);
    const p = f && fruitAt(f, at);
    return p && p.y > 0 && !done.has(x);
  });
  if (!good.length) return v;
  const kinds = good.map((x) => wave.find((w) => w.id === x)!.kind);
  const fruit = kinds.filter((k) => k !== 'bomb').length;
  const pts = kinds.reduce((s, k) => s + FRUIT_POINTS[k], 0) + Math.max(0, fruit - 2);
  return {
    ...v,
    scores: { ...v.scores, [id]: (v.scores[id] ?? 0) + pts },
    sliced: { ...v.sliced, [id]: [...done, ...good] },
    combo: { ...v.combo, [id]: Math.max(v.combo[id] ?? 0, fruit) },
    bombs: { ...v.bombs, [id]: (v.bombs[id] ?? 0) + kinds.filter((k) => k === 'bomb').length },
  };
}

export function FruitPreview() {
  const q = new URLSearchParams(location.search);
  const over = q.get('fruitPreview') === 'over';
  const n = Math.min(4, Math.max(2, Number(q.get('n') ?? 4)));
  const seconds = Number(q.get('time') ?? 45);
  const ids = IDS.slice(0, n);
  const zero = () => Object.fromEntries(ids.map((id) => [id, 0]));
  const [fv, setFv] = useState<FruitView>(() => {
    const now = Date.now();
    const base: FruitView = { phase: 'countdown', seed: 1 + Math.floor(Math.random() * 1e6), seconds, startsAt: now + 3000, endsAt: now + 3000 + seconds * 1000, scores: zero(), sliced: Object.fromEntries(ids.map((id) => [id, []])), combo: zero(), bombs: zero(), now };
    return over ? { ...base, phase: 'over', scores: { me: 31, b1: 44, b2: 31, b3: 12 }, combo: { me: 4, b1: 3, b2: 5, b3: 2 }, bombs: { me: 1, b1: 0, b2: 2, b3: 1 } } : base;
  });
  const ref = useRef(fv);
  ref.current = fv;

  // phases on the clock, and the bots: each fruit near its peak with a chance by level, mostly avoiding bombs
  useEffect(() => {
    if (over) return;
    const wave = fruitWave(fv.seed, fv.seconds);
    const plan = ids.slice(1).flatMap((id, i) =>
      wave.filter((f) => (f.kind === 'bomb' ? Math.random() < 0.04 : Math.random() < SKILL[i + 1])).map((f) => ({ id, f, at: f.t + ((f.vy / 1.6) * 1000) * (0.6 + Math.random() * 0.6) })),
    );
    const t = window.setInterval(() => {
      const now = Date.now();
      let v = ref.current;
      if (v.phase === 'countdown' && now >= v.startsAt) v = { ...v, phase: 'play' };
      if (v.phase === 'play' && now >= v.endsAt) v = { ...v, phase: 'over' };
      const ms = now - v.startsAt;
      for (const p of plan) {
        if (p.at > ms || p.at < ms - 100) continue;
        v = applySlice(v, p.id, [p.f.id], Math.round(p.at), now);
      }
      if (v !== ref.current) setFv({ ...v, now });
    }, 50);
    return () => window.clearInterval(t);
  }, [fv.seed]);

  const winners = fv.phase === 'over' ? ids.filter((id) => fv.scores[id] === Math.max(...ids.map((x) => fv.scores[x]))) : [];
  const view = useMemo(
    () =>
      ({
        code: 'FRUT', meId: 'me', hostId: 'me', phase: fv.phase === 'over' ? 'over' : 'playing',
        config: { game: 'fruit', opts: { time: seconds }, stake: 0, teams: false, voice: false, turnTimer: false, ranked: false } as unknown as GameConfig,
        players: ids.map((_, i) => player(i)), watchers: [], turnId: null, turnMsLeft: null,
        winnerIds: winners, loserIds: [], leftPlayers: [], watchRequests: [], swapAsks: [], teams: null, slots: null,
        awards: [], coinResults: null, stopped: false, secrets: [], secret: null, plugged: { kind: 'fruit', fruit: fv },
      }) as unknown as RoomView,
    [fv],
  );
  const actions = useMemo(
    () =>
      new Proxy({} as Actions, {
        get: (_t, key) => {
          if (key === 'gameMove' || key === 'gameMoveQuiet')
            return async (m: PluggedMove) => {
              if (m.kind !== 'fruit') return false;
              const { ids: cut, at } = m.move;
              // a little network delay, as live
              window.setTimeout(() => setFv((v) => ({ ...applySlice(v, 'me', cut, at, Date.now()), now: Date.now() })), 60);
              return true;
            };
          if (key === 'toast') return (text: string) => console.info('toast', text);
          return async () => null;
        },
      }),
    [],
  );
  const auth = { user: null, token: null, checking: false } as unknown as Auth;
  return <FruitTable view={view} actions={actions} bubbles={[]} auth={auth} notes={[]} />;
}
