// Dev only (?chessPreview=1|watch|over|analysis|rules; &v=variant &me=w|b &time=3+2 &low=1 &mid=1 &seq=Nf3,d5): chess on a fake room, a bot answers with random moves
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoomView } from '../../types';
import { fakeActions, fakeAuth, fakeView } from '../turnkit/fakeRoom';
import { ChessAnalysis } from './ChessAnalysis';
import { ChessRules } from './ChessRules';
import { ChessTable } from './ChessTable';
import { ChessGame, chessPerfOf, chessSpeedOf, type ChessVariant, type ChessView, type Color } from './lib';

const q = new URLSearchParams(location.search);
const MODE = q.get('chessPreview') ?? '1';
const VARIANT = (q.get('v') ?? 'standard') as ChessVariant;
const ME: Color = q.get('me') === 'b' ? 'b' : 'w';
const TIME = q.get('time') ?? '3+2';
const OPENING = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3', 'Nxe4', 'O-O', 'Bxc3', 'd5', 'Bf6', 'Re1', 'Ne7', 'Rxe4', 'd6', 'Bg5', 'Bxg5', 'Nxg5', 'h6'];

function viewOf(g: ChessGame, clock: ChessView['clock'], extra: Partial<ChessView> = {}): ChessView {
  const pos = g.position();
  const out = pos.outcome();
  const ucis = g.uciList();
  return {
    variant: VARIANT, time: TIME, speed: chessSpeedOf(TIME), fen: pos.fen(), initialFen: g.startFen, moves: ucis, sans: g.sanList(), turn: pos.turn,
    lastMove: ucis[ucis.length - 1] ?? null, players: ME === 'w' ? { w: 'me', b: 'b1' } : { w: 'b1', b: 'me' }, bots: { [ME === 'w' ? 'b' : 'w']: 3 },
    clock, abortAt: null, checks: pos.checks() ?? undefined, pockets: pos.pockets() ?? undefined, check: pos.inCheck(),
    status: out ? 'over' : 'playing', result: out ?? undefined, rated: true, perf: chessPerfOf(VARIANT, TIME),
    ratings: { w: { r: 812, rd: 140, prov: true }, b: { r: 1034, rd: 70, prov: false } }, now: Date.now(), opening: { eco: 'C54', name: 'Italian Game: Classical Variation' },
    ...extra,
  };
}

function startGame(): ChessGame {
  const g = new ChessGame(VARIANT);
  if (VARIANT === 'standard' && MODE !== '1') for (const san of OPENING) g.play(g.position().parseSan(san)!);
  if (VARIANT === 'standard' && MODE === '1' && q.has('mid')) for (const san of OPENING.slice(0, 14)) g.play(g.position().parseSan(san)!);
  // &seq=Nf3,d5,Ne5: set up a position in any variant
  for (const san of (q.get('seq') ?? '').split(',').filter(Boolean)) g.play(g.position().parseSan(san)!);
  return g;
}

export function ChessPreview() {
  if (MODE === 'rules') return <RulesPreview />;
  if (MODE === 'analysis') return <AnalysisPreview />;
  return <TablePreview />;
}

function TablePreview() {
  const game = useRef(startGame());
  const [tick, setTick] = useState(0);
  const low = q.has('low');
  const [clock, setClock] = useState<ChessView['clock']>(() =>
    TIME === 'none' ? null : { w: low ? 9_000 : 180_000, b: 175_000, runningSince: Date.now(), inc: 2000 },
  );
  const watch = MODE === 'watch';
  const over = MODE === 'over';
  const g = game.current;
  const cv = useMemo(
    () => viewOf(g, clock, over ? { status: 'over', result: { winner: ME, reason: 'resign' }, ratingDiff: { w: 14, b: -14 }, gameId: 'dev-over' } : {}),
    [tick, clock],
  );

  const apply = (uci: string) => {
    const m = g.position().parseUci(uci);
    if (!m) return false;
    const mover = g.position().turn;
    g.play(m);
    setClock((c) => (c ? { ...c, [mover]: c[mover] - (Date.now() - (c.runningSince ?? Date.now())) + c.inc, runningSince: Date.now() } : c));
    setTick((t) => t + 1);
    return true;
  };

  // the bot (or both bots when watching) answers with a random legal move
  useEffect(() => {
    if (over || cv.status === 'over') return;
    if (!watch && cv.turn === ME) return;
    const t = window.setTimeout(() => {
      const moves = g.position().legalMoves();
      if (!moves.length) return;
      apply(g.position().uci(moves[Math.floor(Math.random() * moves.length)]));
    }, watch ? 7000 : 800);
    return () => window.clearTimeout(t);
  }, [tick]);

  const view = useMemo(() => {
    const v = fakeView('chess', { variant: VARIANT, time: TIME, rated: 'yes' }, 2, { kind: 'chess', chess: cv }, over || cv.status === 'over', cv.result?.winner ? [cv.players[cv.result.winner]] : []);
    return (watch ? { ...v, meId: 'w1', watchers: [{ id: 'w1', name: 'Watcher' }] } : v) as RoomView;
  }, [cv]);
  const actions = useMemo(
    () =>
      fakeActions((mv) => {
        if (mv.kind !== 'chess') return false;
        const m = mv.move;
        if (m.type === 'move') return apply(m.uci);
        console.info('chess move', m);
        return true;
      }),
    [],
  );
  return <ChessTable view={view} actions={actions} bubbles={[]} auth={fakeAuth()} notes={[]} />;
}

function AnalysisPreview() {
  const g = useMemo(startGame, []);
  return (
    <ChessAnalysis
      gameId={`dev-${VARIANT}-${g.moves.length}`}
      variant={VARIANT}
      initialFen={g.startFen}
      moves={g.uciList()}
      names={{ w: 'Meera', b: 'Priya' }}
      result={{ winner: 'w', reason: 'resign' }}
      bottom={ME}
      onClose={() => history.back()}
    />
  );
}

function RulesPreview() {
  return (
    <main className="screen" style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <ChessRules />
    </main>
  );
}
