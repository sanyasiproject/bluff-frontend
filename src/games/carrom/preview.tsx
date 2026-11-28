// Dev only (?carromPreview=1|queen|over&n=2..4&mode=classic|freestyle): Carrom on a fake room, shots run through the shared library, bots shoot at coins
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PluggedView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { CarromTable } from './CarromTable';
import { CARROM_RULES, CARROM_SIDES, dirToLocal, launchOf, simulate, startCoins, strikerSpot, type CarromShotView, type CarromView } from './lib';

function shoot(v: CarromView, ids: string[], x: number, dx: number, dy: number, power: number): CarromView {
  const who = v.turnId!;
  const side = v.sides[who];
  const r = simulate(v.coins, launchOf(side, x, dx, dy, power));
  const foul = r.striker.pocketed ? 'striker' : r.firstHit ? null : 'miss';
  const mine = v.colors?.[who];
  const kinds = r.pocketed.map((id) => v.coins.find((c) => c.id === id)!.c);
  const again = !foul && kinds.some((k) => v.mode === 'freestyle' || k === mine || k === 'q');
  const points = v.mode === 'freestyle' ? kinds.reduce((a, k) => a + CARROM_RULES.points[k], 0) - (foul ? CARROM_RULES.foul : 0) : 0;
  const next = again ? who : ids[(ids.indexOf(who) + 1) % ids.length];
  const queen = kinds.includes('q') ? { state: 'pending' as const, by: who } : v.queen;
  const last: CarromShotView = {
    seq: (v.last?.seq ?? 0) + 1, playerId: who, side, x, dx, dy, power, before: v.coins, pocketed: r.pocketed, strikerPocketed: r.striker.pocketed,
    foul, queen: kinds.includes('q') ? 'pocketed' : null, returned: [], points, again, ms: r.ms, auto: false,
  };
  const scores = { ...v.scores, [who]: (v.scores[who] ?? 0) + (v.mode === 'freestyle' ? points : kinds.filter((k) => k === mine).length) };
  return { ...v, coins: r.coins, turnId: r.coins.length ? next : null, scores, pocketed: { ...v.pocketed, [who]: [...(v.pocketed[who] ?? []), ...r.pocketed] }, queen, last, now: Date.now(), deadline: Date.now() + r.ms + 20_000 };
}

/** a bot shot: straight at a random coin from a random free spot */
function botShot(v: CarromView): [number, number, number, number] {
  const side = v.sides[v.turnId!];
  const x = 0.25 + Math.random() * 0.5;
  const [sx, sy] = strikerSpot(side, x);
  const c = v.coins[Math.floor(Math.random() * v.coins.length)];
  const [du, df] = dirToLocal(side, c.x - sx, c.y - sy);
  return [x, du, Math.max(0.1, df), 0.45 + Math.random() * 0.4];
}

export function CarromPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('carromPreview') ?? '1';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const game = q.get('mode') === 'freestyle' ? 'freestyle' : 'classic';
  const [v, setV] = useState<CarromView>(() => {
    const sides = CARROM_SIDES[n as 2 | 3 | 4];
    const s: CarromView = {
      mode: game, length: 'quick', board: 1, boards: 1, sides: Object.fromEntries(ids.map((id, i) => [id, sides[i]])),
      colors: game === 'classic' ? Object.fromEntries(ids.map((id, i) => [id, i % 2 ? 'b' : 'w'])) : null,
      teams: game === 'classic' && n === 4 ? [[ids[0], ids[2]], [ids[1], ids[3]]] : null,
      coins: startCoins(), pocketed: Object.fromEntries(ids.map((id) => [id, []])), queen: { state: 'board', by: null },
      scores: Object.fromEntries(ids.map((id) => [id, 0])), results: [], turnId: 'me', settleAt: 0, deadline: Date.now() + 20_000, last: null, places: {}, now: Date.now(),
    };
    if (mode === 'queen') return { ...s, coins: s.coins.filter((c) => c.c !== 'q').slice(4), pocketed: { ...s.pocketed, me: ['Q', 'W1', 'W2'] }, queen: { state: 'pending', by: 'me' } };
    if (mode !== 'over') return s;
    return { ...s, turnId: null, coins: [], scores: Object.fromEntries(ids.map((id, i) => [id, 9 - i * 3])), places: Object.fromEntries(ids.map((id, i) => [id, i + 1])) };
  });
  const ref = useRef(v);
  ref.current = v;

  useEffect(() => {
    if (!v.turnId || v.turnId === 'me') return;
    const t = window.setTimeout(() => setV((s) => (s.turnId && s.turnId !== 'me' ? shoot(s, ids, ...botShot(s)) : s)), (v.last?.ms ?? 0) + 1500);
    return () => window.clearTimeout(t);
  }, [v.last?.seq, v.turnId]);

  const over = !v.turnId;
  const view = useMemo(() => fakeView('carrom', { mode: game, length: 'quick' }, n, { kind: 'carrom', carrom: v } as unknown as PluggedView, over, over ? [ids[0]] : []), [v]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        const mv = m as unknown as { kind: string; move: { x: number; dx: number; dy: number; power: number } };
        if (mv.kind !== 'carrom' || ref.current.turnId !== 'me') return false;
        setV((s) => shoot(s, ids, mv.move.x, mv.move.dx, mv.move.dy, mv.move.power));
        return true;
      }),
    [],
  );
  return <CarromTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
