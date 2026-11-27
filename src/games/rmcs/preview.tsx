// Dev only (?rmcsPreview=1, =mantri, =raja, =chor, =result, =over, =watch): Raja Mantri on a fake room with a tiny rule engine
import { useEffect, useMemo, useRef, useState } from 'react';
import { RMCS_OPEN_SEC, RMCS_POINTS, RMCS_ROLES, type GameConfig, type PluggedMove, type PublicPlayer, type RmcsPhase, type RmcsRole, type RmcsRound, type RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { RmcsTable } from './RmcsTable';

const IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];
const ROUNDS = 5;

const player = (i: number): PublicPlayer =>
  ({ id: IDS[i], name: NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

interface Truth {
  round: number;
  phase: RmcsPhase;
  roles: Record<string, RmcsRole>;
  opened: string[];
  endsAt: number | null;
  scores: Record<string, number>;
  history: RmcsRound[];
  over: boolean;
}

function deal(force: RmcsRole | null): Record<string, RmcsRole> {
  const roles = [...RMCS_ROLES].sort(() => Math.random() - 0.5);
  if (force) {
    const i = roles.indexOf(force);
    [roles[0], roles[i]] = [roles[i], roles[0]];
  }
  return Object.fromEntries(IDS.map((id, i) => [id, roles[i]]));
}

function settle(t: Truth, guess: string | null): Truth {
  const holder = (r: RmcsRole) => IDS.find((id) => t.roles[id] === r)!;
  const correct = guess === holder('chor');
  const points = Object.fromEntries(IDS.map((id) => [id, RMCS_POINTS[t.roles[id]]]));
  if (!correct) [points[holder('mantri')], points[holder('chor')]] = [points[holder('chor')], points[holder('mantri')]];
  const scores = Object.fromEntries(IDS.map((id) => [id, (t.scores[id] ?? 0) + points[id]]));
  return { ...t, phase: 'result', endsAt: null, scores, history: [...t.history, { round: t.round, roles: t.roles, guess, correct, points }] };
}

export function RmcsPreview() {
  const mode = new URLSearchParams(location.search).get('rmcsPreview') ?? '1';
  const force = (['mantri', 'raja', 'chor'] as const).find((r) => r === mode) ?? null;
  const watch = mode === 'watch';
  const [t, setT] = useState<Truth>(() => {
    const base: Truth = { round: 1, phase: 'open', roles: deal(force), opened: [], endsAt: Date.now() + RMCS_OPEN_SEC * 1000, scores: Object.fromEntries(IDS.map((id) => [id, 0])), history: [], over: false };
    if (mode !== 'over' && mode !== 'result') return base;
    let s = base;
    for (let r = 1; r <= (mode === 'over' ? ROUNDS : 2); r++) {
      s = settle({ ...s, round: r, roles: deal(null) }, r % 2 ? IDS.find((id) => s.roles[id] === 'chor') ?? null : null);
      if (r === 1) s = { ...s, roles: s.history[0].roles };
    }
    return { ...s, roles: s.history[s.history.length - 1].roles, opened: [...IDS], over: mode === 'over' };
  });
  const ref = useRef(t);
  ref.current = t;

  // the fake server: bots open, the bot Mantri guesses, time runs out, rounds roll on
  useEffect(() => {
    if (t.over) return;
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (t.phase === 'open') {
      if (t.opened.length === 4) later(600, () => setT((s) => ({ ...s, phase: 'guess', endsAt: Date.now() + 20_000 })));
      else {
        IDS.filter((id) => (id !== 'me' || watch) && !t.opened.includes(id)).forEach((id, i) => later(900 + i * 700 + Math.random() * 600, () => setT((s) => (s.opened.includes(id) ? s : { ...s, opened: [...s.opened, id] }))));
        later(Math.max(0, (t.endsAt ?? 0) - Date.now()), () => setT((s) => ({ ...s, opened: [...IDS] })));
      }
    } else if (t.phase === 'guess') {
      const mantri = IDS.find((id) => t.roles[id] === 'mantri')!;
      const pool = IDS.filter((id) => id !== mantri && t.roles[id] !== 'raja');
      if (mantri !== 'me' || watch) later(2600, () => setT((s) => settle(s, pool[Math.floor(Math.random() * 2)])));
      later(20_000, () => setT((s) => (s.phase === 'guess' ? settle(s, null) : s)));
    } else if (t.phase === 'result') {
      later(4200, () =>
        setT((s) => (s.round >= ROUNDS ? { ...s, over: true } : { ...s, round: s.round + 1, phase: 'open', roles: deal(force), opened: [], endsAt: Date.now() + RMCS_OPEN_SEC * 1000 })),
      );
    }
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [t.phase, t.round, t.opened.length, t.over]);

  const meId = watch ? 'w1' : 'me';
  const view = useMemo(() => {
    const shown: Record<string, RmcsRole> = {};
    for (const id of IDS) {
      const r = t.roles[id];
      if (t.phase === 'result' || t.over || (r === 'raja' && t.opened.includes(id)) || (r === 'mantri' && t.phase === 'guess')) shown[id] = r;
    }
    const top = Math.max(...IDS.map((id) => t.scores[id]));
    const rv = { round: t.round, rounds: ROUNDS, phase: t.phase, myRole: watch ? null : t.roles.me, shown, opened: t.opened, endsAt: t.endsAt, scores: t.scores, history: t.history };
    return {
      code: 'RMCS', meId, hostId: 'me', phase: t.over ? 'over' : 'playing',
      config: { game: 'rmcs', opts: { rounds: ROUNDS }, stake: 0, teams: false, voice: false, turnTimer: false, ranked: false } as unknown as GameConfig,
      players: IDS.map((_, i) => player(i)), watchers: watch ? [{ ...player(0), id: 'w1', name: 'Watcher', bot: false }] : [], turnId: null, turnMsLeft: null,
      winnerIds: t.over ? IDS.filter((id) => t.scores[id] === top) : [], loserIds: [], leftPlayers: [], watchRequests: [], swapAsks: [], teams: null, slots: null,
      awards: [], coinResults: null, stopped: false, secrets: [], secret: null, plugged: { kind: 'rmcs', rmcs: rv },
    } as unknown as RoomView;
  }, [t]);
  const actions = useMemo(
    () =>
      new Proxy({} as Actions, {
        get: (_t, key) => {
          if (key === 'gameMove')
            return async (m: PluggedMove) => {
              if (m.kind !== 'rmcs') return false;
              const mv = m.move;
              if (mv.type === 'open') setT((s) => (s.opened.includes('me') ? s : { ...s, opened: [...s.opened, 'me'] }));
              else setT((s) => (s.phase === 'guess' ? settle(s, mv.target) : s));
              return true;
            };
          if (key === 'toast') return (text: string) => console.info('toast', text);
          return async () => null;
        },
      }),
    [],
  );
  const auth = { user: null, token: null, checking: false } as unknown as Auth;
  return <RmcsTable view={view} actions={actions} bubbles={[]} auth={auth} notes={[]} />;
}
