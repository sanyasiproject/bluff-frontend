// Dev only (?spikesPreview=1, =over, &n=2..4, &size=5|6, &speed=fast): Spike Attack on a fake room with a tiny local server and bots
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameConfig, PluggedMove, PublicPlayer, RoomView, SpikesView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { botStep, newSpikes, stepIn, tick } from './sim';
import { SpikesTable } from './SpikesTable';

const IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];

const player = (i: number): PublicPlayer =>
  ({ id: IDS[i], name: NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

export function SpikesPreview() {
  const q = new URLSearchParams(location.search);
  const over = q.get('spikesPreview') === 'over';
  const n = Math.min(4, Math.max(2, Number(q.get('n') ?? 4)));
  const size = Number(q.get('size') ?? 5) === 6 ? 6 : 5;
  const fast = q.get('speed') === 'fast';
  const ids = IDS.slice(0, n);
  const [sv, setSv] = useState<SpikesView>(() => {
    const v = newSpikes(ids, size, Date.now());
    return over ? { ...v, phase: 'over', lives: { me: 2, b1: 0, b2: 0, b3: 0 }, places: { me: 1, b1: 2, b2: 3, b3: 3 } } : v;
  });
  const ref = useRef(sv);
  ref.current = sv;

  // the server tick and the bots (Priya normal and sometimes late, the others sharp)
  useEffect(() => {
    if (over) return;
    const t = window.setInterval(() => setSv((v) => tick(v, Date.now(), fast)), 50);
    const b = window.setInterval(() => {
      setSv((v) => {
        let s = v;
        ids.slice(1).forEach((id, i) => {
          const d = botStep(s, id, i === 0 && Math.random() < 0.3);
          if (d) s = stepIn(s, id, d);
        });
        return s;
      });
    }, 260);
    return () => (window.clearInterval(t), window.clearInterval(b));
  }, []);

  const view = useMemo(
    () =>
      ({
        code: 'SPKE', meId: 'me', hostId: 'me', phase: sv.phase === 'over' ? 'over' : 'playing',
        config: { game: 'spikes', opts: { size, speed: fast ? 'fast' : 'normal' }, stake: 0, teams: false, voice: false, turnTimer: false, ranked: false } as unknown as GameConfig,
        players: ids.map((_, i) => player(i)), watchers: [], turnId: null, turnMsLeft: null,
        winnerIds: sv.phase === 'over' ? ids.filter((id) => sv.places[id] === 1) : [], loserIds: [], leftPlayers: [], watchRequests: [], swapAsks: [], teams: null, slots: null,
        awards: [], coinResults: null, stopped: false, secrets: [], secret: null, plugged: { kind: 'spikes', spikes: sv },
      }) as unknown as RoomView,
    [sv],
  );
  const actions = useMemo(
    () =>
      new Proxy({} as Actions, {
        get: (_t, key) => {
          if (key === 'gameMove' || key === 'gameMoveQuiet')
            return async (m: PluggedMove) => {
              if (m.kind !== 'spikes') return false;
              const dir = m.move.dir;
              window.setTimeout(() => setSv((v) => stepIn(v, 'me', dir)), 60);
              return true;
            };
          if (key === 'toast') return (text: string) => console.info('toast', text);
          return async () => null;
        },
      }),
    [],
  );
  const auth = { user: null, token: null, checking: false } as unknown as Auth;
  return <SpikesTable view={view} actions={actions} bubbles={[]} auth={auth} notes={[]} />;
}
