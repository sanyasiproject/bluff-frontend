// Dev only (?dotsPreview=1, =late, =over; &n=2..4, &size=4..6): Dots and Boxes on a fake room with a tiny rule engine and bots
import { useEffect, useMemo, useRef, useState } from 'react';
import { dotsBoxesOf, dotsBoxLines, dotsLineCount, type DotsView } from '../../types';
import { FAKE_IDS, fakeActions, fakeAuth, fakeCount, fakeView } from '../turnkit/fakeRoom';
import { DotsTable } from './DotsTable';

function play(v: DotsView, line: number, ids: string[]): DotsView {
  if (v.lines[line] !== undefined || !v.turnId) return v;
  const who = v.turnId;
  const lines = { ...v.lines, [line]: who };
  const closed = dotsBoxesOf(v.size, line).filter((b) => dotsBoxLines(v.size, Math.floor(b / v.size), b % v.size).every((l) => lines[l] !== undefined));
  const boxes = { ...v.boxes };
  for (const b of closed) boxes[b] = who;
  const scores = { ...v.scores, [who]: (v.scores[who] ?? 0) + closed.length };
  const done = Object.keys(boxes).length >= v.size * v.size;
  const next = closed.length ? who : ids[(ids.indexOf(who) + 1) % ids.length];
  return { ...v, lines, boxes, scores, turnId: done ? null : next, last: { seq: (v.last?.seq ?? 0) + 1, playerId: who, line, closed } };
}

/** sides already drawn round a box */
const sides = (v: DotsView, b: number) => dotsBoxLines(v.size, Math.floor(b / v.size), b % v.size).filter((l) => v.lines[l] !== undefined).length;

function botLine(v: DotsView): number {
  const free = [...Array(dotsLineCount(v.size)).keys()].filter((l) => v.lines[l] === undefined);
  const closing = free.find((l) => dotsBoxesOf(v.size, l).some((b) => sides(v, b) === 3));
  if (closing !== undefined) return closing;
  const safe = free.filter((l) => dotsBoxesOf(v.size, l).every((b) => sides(v, b) < 2));
  const pool = safe.length ? safe : free;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function DotsPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('dotsPreview') ?? '1';
  const n = fakeCount();
  const ids = FAKE_IDS.slice(0, n);
  const size = Math.min(6, Math.max(4, Number(q.get('size')) || 5));
  const [v, setV] = useState<DotsView>(() => {
    let s: DotsView = { size, lines: {}, boxes: {}, scores: Object.fromEntries(ids.map((id) => [id, 0])), turnId: 'me', last: null };
    const fill = mode === 'over' ? Infinity : mode === 'late' ? Math.floor(dotsLineCount(size) * 0.7) : 0;
    for (let i = 0; i < fill && s.turnId; i++) s = play(s, botLine(s), ids);
    return mode === 'late' ? { ...s, turnId: 'me' } : s;
  });
  const ref = useRef(v);
  ref.current = v;

  // the bots draw after a moment
  useEffect(() => {
    if (!v.turnId || v.turnId === 'me') return;
    const t = window.setTimeout(() => setV((s) => play(s, botLine(s), ids)), 900 + Math.random() * 700);
    return () => window.clearTimeout(t);
  }, [v.last?.seq, v.turnId]);

  const over = !v.turnId;
  const top = Math.max(...ids.map((id) => v.scores[id]));
  const view = useMemo(() => fakeView('dots', { size }, n, { kind: 'dots', dots: v }, over, ids.filter((id) => v.scores[id] === top), 30_000), [v]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        if (m.kind !== 'dots' || ref.current.turnId !== 'me') return false;
        setV((s) => play(s, m.move.line, ids));
        return true;
      }),
    [],
  );
  return <DotsTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
