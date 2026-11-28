// Dev only (?ultimatePreview=1|mid|over|free): Ultimate Tic-Tac-Toe on a fake room with a tiny rule engine and a greedy bot
import { useEffect, useMemo, useRef, useState } from 'react';
import { utttLineOf, utttSendAfter, UTTT_LINES, type UtttBoardState, type UtttMark, type UtttView } from '../../types';
import { fakeActions, fakeAuth, fakeView } from '../turnkit/fakeRoom';
import { UtttTable } from './UtttTable';

const open = (v: UtttView, b: number) => v.boards[b] === null && v.cells.slice(b * 9, b * 9 + 9).includes(null);
const opens = (v: UtttView) => [...Array(9).keys()].filter((b) => open(v, b));

function play(v: UtttView, board: number, cell: number): UtttView {
  const who = v.turnId;
  if (!who || v.cells[board * 9 + cell] || !v.active.includes(board)) return v;
  const mark: UtttMark = who === v.x ? 'X' : 'O';
  const send = utttSendAfter(v.cells, v.boards, board, cell, mark);
  const cells = [...v.cells];
  cells[board * 9 + cell] = mark;
  const boards: UtttBoardState[] = [...v.boards];
  const small = cells.slice(board * 9, board * 9 + 9);
  const took = utttLineOf(small)?.mark === mark;
  if (took) boards[board] = mark;
  else if (!small.includes(null)) boards[board] = 'draw';
  const big = utttLineOf(boards);
  const next: UtttView = { ...v, cells, boards, moves: v.moves + 1, last: { seq: (v.last?.seq ?? 0) + 1, playerId: who, board, cell, mark, won: took } };
  const left = opens(next);
  const done = !!big || !left.length;
  return { ...next, line: big?.line ?? null, winner: big ? who : null, draw: done && !big, turnId: done ? null : who === v.x ? v.o : v.x, active: done ? [] : send !== null ? [send] : left };
}

/** win a small board when it can, else block one, else avoid sending to a free move */
function botMove(v: UtttView): [number, number] {
  const mark: UtttMark = v.turnId === v.x ? 'X' : 'O';
  const opp: UtttMark = mark === 'X' ? 'O' : 'X';
  const moves = v.active.flatMap((b) => [...Array(9).keys()].filter((c) => !v.cells[b * 9 + c]).map((c) => [b, c] as [number, number]));
  const score = ([b, c]: [number, number]) => {
    const small = v.cells.slice(b * 9, b * 9 + 9);
    let s = Math.random();
    if (utttLineOf(small.map((x, i) => (i === c ? mark : x)))) s += 10;
    if (utttLineOf(small.map((x, i) => (i === c ? opp : x)))) s += 6;
    if (utttSendAfter(v.cells, v.boards, b, c, mark) === null) s -= 4;
    if (UTTT_LINES.some((l) => l.includes(c) && l.filter((k) => v.cells[c * 9 + k] === opp).length === 2)) s -= 3;
    return s;
  };
  return moves.reduce((a, m) => (score(m) > score(a) ? m : a), moves[0]);
}

export function UtttPreview() {
  const mode = new URLSearchParams(location.search).get('ultimatePreview') ?? '1';
  const [v, setV] = useState<UtttView>(() => {
    let s: UtttView = { cells: Array(81).fill(null), boards: Array(9).fill(null), active: [...Array(9).keys()], x: 'me', o: 'b1', turnId: 'me', moves: 0, last: null, line: null, winner: null, draw: false };
    const fill = mode === 'over' ? 200 : mode === 'mid' || mode === 'free' ? 16 : 0;
    for (let i = 0; i < fill && s.turnId; i++) s = play(s, ...botMove(s));
    if (s.turnId && (mode === 'mid' || mode === 'free')) {
      const b = s.active[0];
      s = { ...s, turnId: 'me', active: mode === 'free' ? opens(s) : [b] };
    }
    return s;
  });
  const ref = useRef(v);
  ref.current = v;

  useEffect(() => {
    if (v.turnId !== 'b1') return;
    const t = window.setTimeout(() => setV((s) => play(s, ...botMove(s))), 800 + Math.random() * 500);
    return () => window.clearTimeout(t);
  }, [v.last?.seq, v.turnId]);

  const view = useMemo(() => fakeView('uttt', {}, 2, { kind: 'uttt', uttt: v }, !v.turnId, v.winner ? [v.winner] : [], 25_000), [v]);
  const actions = useMemo(
    () =>
      fakeActions((m) => {
        if (m.kind !== 'uttt' || ref.current.turnId !== 'me') return false;
        setV((s) => play(s, m.move.board, m.move.cell));
        return true;
      }),
    [],
  );
  return <UtttTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}
