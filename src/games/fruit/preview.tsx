// Dev only (?fruitPreview=1, =over, &n=2..4, &rounds=15|25, &lag=ms): Fruit Slice Duel on a fake room with a tiny local server and bots
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FruitView, GameConfig, PluggedMove, PublicPlayer, RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { newDuel, strikeIn, tickDuel, type DuelSim } from './duelSim';
import { FruitTable } from './FruitTable';

const IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];

const player = (i: number): PublicPlayer =>
  ({ id: IDS[i], name: NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

export function FruitPreview() {
  const q = new URLSearchParams(location.search);
  const over = q.get('fruitPreview') === 'over';
  const n = Math.min(4, Math.max(2, Number(q.get('n') ?? 4)));
  const rounds = Number(q.get('rounds') ?? 15) === 25 ? 25 : 15;
  const lag = Math.max(0, Number(q.get('lag') ?? 60));
  const ids = IDS.slice(0, n);
  const sim = useRef<DuelSim>(newDuel(ids, rounds, Date.now()));
  const [fv, setFv] = useState<FruitView>(() =>
    over ? { ...sim.current.v, phase: 'over', round: rounds, scores: { me: 14, b1: 19, b2: 14, b3: 6 } } : sim.current.v,
  );

  // the server tick: pushes a view only when something changed (like the backend)
  useEffect(() => {
    if (over) return;
    const t = window.setInterval(() => {
      const was = sim.current.v;
      sim.current = tickDuel(sim.current, Date.now(), ids.slice(1));
      const v = sim.current.v;
      if (v.phase !== was.phase || v.item !== was.item || v.result !== was.result) window.setTimeout(() => setFv(v), lag);
    }, 20);
    return () => window.clearInterval(t);
  }, []);

  const winners =
    fv.phase === 'over' ? ids.filter((id) => fv.scores[id] === Math.max(...ids.map((x) => fv.scores[x] ?? 0))) : [];
  const view = useMemo(
    () =>
      ({
        code: 'FRUT', meId: 'me', hostId: 'me', phase: fv.phase === 'over' ? 'over' : 'playing',
        config: { game: 'fruit', opts: { rounds }, stake: 0, teams: false, voice: false, turnTimer: false, ranked: false } as unknown as GameConfig,
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
              const { round, reaction } = m.move;
              // a little network delay on the way in
              window.setTimeout(() => (sim.current = strikeIn(sim.current, 'me', round, reaction, Date.now())), lag);
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
