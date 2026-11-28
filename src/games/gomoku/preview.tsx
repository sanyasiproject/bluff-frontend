// Dev only (?gomokuPreview=1|mid|over&n=2..4): Five in a Row on a fake room with a tiny rule engine and greedy bots
import { useEffect, useMemo, useRef, useState } from 'react';
import { gomokuCentre, gomokuSizeOf, type GomokuView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { GomokuTable } from './GomokuTable';
import { longestOf, nearEmpty, runAt } from './lib';

interface Game { size: number; stones: Record<number, string>; turnId: string | null; last: GomokuView['last']; line: number[] | null; winner: string | null; draw: boolean }

function play(g: Game, at: number, ids: string[]): Game {
  if (g.stones[at] || !g.turnId) return g;
  const who = g.turnId;
  const stones = { ...g.stones, [at]: who };
  const run = runAt(g.size, stones, at);
  const won = run.length >= 5;
  const draw = !won && Object.keys(stones).length >= g.size * g.size;
  return { ...g, stones, line: won ? run : null, winner: won ? who : null, draw, turnId: won || draw ? null : ids[(ids.indexOf(who) + 1) % ids.length], last: { seq: (g.last?.seq ?? 0) + 1, playerId: who, at } };
}

/** greedy: win, else block the longest threat, else grow my line */
function botAt(g: Game, ids: string[]): number {
  let best = -1;
  let score = -1;
  for (const at of nearEmpty(g.size, g.stones)) {
    let s = Math.random() * 3;
    for (const id of ids) {
      const len = runAt(g.size, { ...g.stones, [at]: id }, at).length;
      s += id === g.turnId ? (len >= 5 ? 1e6 : len ** 3) : len >= 5 ? 1e5 : len ** 3 * 0.9;
    }
    if (s > score) [score, best] = [s, at];
  }
  return best;
}

function toView(g: Game, ids: string[]): GomokuView {
  const cells = Array<number>(g.size * g.size).fill(-1);
  for (const [k, id] of Object.entries(g.stones)) cells[+k] = ids.indexOf(id);
  const best = Object.fromEntries(ids.map((id) => [id, longestOf(g.size, g.stones, id)]));
  const over = !g.turnId;
  const places = over ? Object.fromEntries(ids.map((id) => [id, id === g.winner ? 1 : 1 + ids.filter((o) => o === g.winner || best[o] > best[id]).length])) : {};
  return { size: g.size, cells, seats: ids, turnId: g.turnId, moves: Object.keys(g.stones).length, last: g.last, line: g.line, winner: g.winner, draw: g.draw, best, places };
}

export function GomokuPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('gomokuPreview') ?? '1';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const size = gomokuSizeOf(n);
  const [g, setG] = useState<Game>(() => {
    let s: Game = { size, stones: {}, turnId: 'me', last: null, line: null, winner: null, draw: false };
    const fill = mode === 'mid' ? 12 * n : 0;
    if (fill) s = play(s, gomokuCentre(size), ids);
    for (let i = 0; i < fill && s.turnId; i++) s = play(s, botAt(s, ids), ids);
    // over: I make a diagonal five while the bots play nearby
    for (let k = 0; mode === 'over' && s.turnId; ) {
      const c = gomokuCentre(size);
      if (s.turnId === 'me' && k === 4) break;
      if (s.turnId === 'me') s = play(s, c + k++ * (size + 1), ids);
      else s = play(s, c + (k + 1) * size - k - (ids.indexOf(s.turnId) - 1) * 2, ids);
    }
    return mode === 'mid' && s.turnId ? { ...s, turnId: 'me' } : s;
  });
  const ref = useRef(g);
  ref.current = g;

  // over: the winning stone goes down after a moment, so the strike shows
  useEffect(() => {
    if (mode !== 'over') return;
    const t = window.setTimeout(() => setG((s) => play(s, gomokuCentre(size) + 4 * (size + 1), ids)), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!g.turnId || g.turnId === 'me') return;
    const t = window.setTimeout(() => setG((s) => play(s, botAt(s, ids), ids)), 700 + Math.random() * 600);
    return () => window.clearTimeout(t);
  }, [g.last?.seq, g.turnId]);

  const view = useMemo(() => fakeView('gomoku', {}, n, { kind: 'gomoku', gomoku: toView(g, ids) }, !g.turnId, g.winner ? [g.winner] : [], 30_000), [g]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        if (m.kind !== 'gomoku' || ref.current.turnId !== 'me') return false;
        setG((s) => play(s, m.move.at, ids));
        return true;
      }),
    [],
  );
  return <GomokuTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
