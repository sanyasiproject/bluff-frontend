// Dev only (?colorwarPreview=1, =mid, =over; &n=2..4, &size=5|7|8|10): Colour Wars on a fake room with the real rule and simple bots
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColorWarView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { ColorWarTable } from './ColorWarTable';
import { applyTap, neighbours, WAVE_MS } from './sim';

function play(v: ColorWarView, cell: number, ids: string[]): ColorWarView {
  const who = v.turnId;
  if (!who) return v;
  const first = v.firstMove.includes(who);
  if (first ? v.cells[cell].owner !== null : v.cells[cell].owner !== who) return v;
  const cells = v.cells.map((c) => ({ ...c }));
  const firstMove = v.firstMove.filter((id) => id !== who);
  const waves = applyTap(v.size, cells, who, cell, first, firstMove.length > 0);
  const holds = (id: string) => cells.some((c) => c.owner === id);
  const places = { ...v.places };
  const alive = v.alive.filter((id) => firstMove.includes(id) || holds(id));
  // places count from the bottom: the first out is last
  const outSoFar = Object.keys(v.places).length;
  v.alive.filter((id) => !alive.includes(id)).forEach((id, k) => (places[id] = ids.length - outSoFar - k));
  const over = alive.length <= 1;
  if (over && alive[0]) places[alive[0]] = 1;
  const from = ids.indexOf(who);
  const next = over ? null : [...ids.slice(from + 1), ...ids.slice(0, from + 1)].find((id) => alive.includes(id)) ?? null;
  return { ...v, cells, firstMove, alive, places, turnId: next, last: { seq: (v.last?.seq ?? 0) + 1, playerId: who, cell, waves } };
}

function botCell(v: ColorWarView): number {
  const who = v.turnId!;
  const first = v.firstMove.includes(who);
  const legal = v.cells.flatMap((c, i) => ((first ? c.owner === null : c.owner === who) ? [i] : []));
  // grow 3-dot cells next to rivals first, else the fullest cell, else anywhere
  const score = (i: number) => {
    const c = v.cells[i];
    const near = neighbours(v.size, i).filter((j) => v.cells[j].owner && v.cells[j].owner !== who).length;
    return (first ? -near * 2 : c.dots * 3 + near * (c.dots === 3 ? 4 : 1)) + Math.random() * 2;
  };
  return legal.sort((a, b) => score(b) - score(a))[0];
}

export function ColorWarPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('colorwarPreview') ?? '1';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const size = [5, 7, 8, 10].includes(Number(q.get('size'))) ? Number(q.get('size')) : 5;
  const [v, setV] = useState<ColorWarView>(() => {
    let s: ColorWarView = { size, cells: Array.from({ length: size * size }, () => ({ owner: null, dots: 0 })), turnId: 'me', firstMove: [...ids], alive: [...ids], last: null, places: {} };
    const steps = mode === 'over' ? 400 : mode === 'mid' ? n * 4 : 0;
    for (let i = 0; i < steps && s.turnId; i++) s = play(s, botCell(s), ids);
    if (mode === 'mid' && s.turnId && s.alive.includes('me')) s = { ...s, turnId: 'me' };
    return s;
  });
  const ref = useRef(v);
  ref.current = v;

  // bots tap once the last chain has shown
  useEffect(() => {
    if (!v.turnId || v.turnId === 'me') return;
    const t = window.setTimeout(() => setV((s) => play(s, botCell(s), ids)), 900 + (v.last?.waves.length ?? 0) * WAVE_MS + Math.random() * 500);
    return () => window.clearTimeout(t);
  }, [v.last?.seq, v.turnId]);

  const over = !v.turnId;
  const view = useMemo(() => fakeView('colorwar', { size }, n, { kind: 'colorwar', colorwar: v }, over, v.alive.slice(0, 1), 30_000), [v]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        if (m.kind !== 'colorwar' || ref.current.turnId !== 'me') return false;
        setV((s) => play(s, m.move.cell, ids));
        return true;
      }),
    [],
  );
  return <ColorWarTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
