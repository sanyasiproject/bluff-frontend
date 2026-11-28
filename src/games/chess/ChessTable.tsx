// The chess table: the board at full height, both players' cards and clocks on the left, moves and buttons on the right
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-chess-board.css';
import '../../styles/land-chess.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { unlockSpeech } from '../../lib/speech';
import type { TableProps } from '../registry';
import { useOverReady, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { ChessBoard } from './ChessBoard';
import { ChessControls } from './ChessControls';
import { ChessOver } from './ChessOver';
import { ChessSeat } from './ChessSeat';
import { useAbortIn, useClocks } from './clock';
import { EngineLines, EvalBar, lineArrows } from './EvalBar';
import { materialDiff, squareAtPoint } from './geometry';
import { CHESS_VARIANTS, ChessGame, Position, type ChessMoveInput, type ChessView, type Color, type Move, type Role } from './lib';
import { useChessLooks } from './looks';
import { MoveList } from './MoveList';
import { PieceSvg } from './pieceArt';
import { Pocket } from './Pocket';
import { chessSfx } from './sounds';
import { PERF_NAMES, reasonText, resultTitle, sanKind, sideName, timeText, uciMove } from './texts';
import { useLiveLines } from './useEngine';

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** the view's position; a finished atomic game can have no king, so fall back to replaying the moves */
function positionOf(cv: ChessView): Position {
  try {
    return Position.fromFen(cv.fen, cv.variant);
  } catch {
    try {
      return ChessGame.fromUci(cv.variant, cv.initialFen, cv.moves).position();
    } catch {
      return Position.start(cv.variant);
    }
  }
}

export function ChessTable(props: TableProps) {
  const pv = props.view.plugged as { kind: string; chess?: ChessView } | null | undefined;
  const cv = pv?.kind === 'chess' ? pv.chess : null;
  if (!cv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Setting up the pieces…</p>
      </main>
    );
  }
  return <ChessTableInner {...props} cv={cv} />;
}

function ChessTableInner({ view, actions, bubbles, auth, notes = [], cv }: TableProps & { cv: ChessView }) {
  const order = [cv.players.w, cv.players.b];
  const base = usePartyBase(view, bubbles, order);
  const { playing, bubbleOf } = base;
  const looks = useChessLooks();
  const myColor: Color | null = cv.players.w === view.meId ? 'w' : cv.players.b === view.meId ? 'b' : null;
  const [flip, setFlip] = useState(false);
  const bottom = flip ? other(myColor ?? 'w') : (myColor ?? 'w');
  const live = playing && cv.status === 'playing';
  const overReady = useOverReady(view, 1200);
  const boardRef = useRef<HTMLDivElement>(null);

  // my move shows at once, until the server's view has it (or refuses it)
  const [sent, setSent] = useState<{ ply: number; pos: Position; move: Move } | null>(null);
  const realPos = useMemo(() => positionOf(cv), [cv.fen, cv.variant]);
  const pos = sent?.pos ?? realPos;
  const lastMove = sent ? sent.move : uciMove(cv.lastMove);
  const [premove, setPremove] = useState<Move | null>(null);
  const [drop, setDrop] = useState<Role | null>(null);
  const clocks = useClocks(cv);
  const abortIn = useAbortIn(cv);
  const lead = useMemo(() => materialDiff(realPos), [realPos]);
  const fast = cv.perf === 'bullet' || cv.perf === 'blitz';
  const variant = CHESS_VARIANTS.find((v) => v.id === cv.variant);

  const sendInput = async (move: ChessMoveInput, quiet = false) => {
    unlockSpeech();
    return quiet ? actions.gameMoveQuiet({ kind: 'chess', move }) : actions.gameMove({ kind: 'chess', move });
  };
  const play = async (m: Move, quiet = false) => {
    if (!realPos.isLegal(m)) return;
    const ply = cv.moves.length;
    const san = realPos.san(m);
    setSent({ ply, pos: realPos.play(m), move: m });
    sounded.current = ply + 1;
    moveSound(san);
    const ok = await sendInput({ type: 'move', uci: realPos.uci(m), ply }, quiet);
    if (!ok) setSent(null);
  };

  // each new move from the server: drop my shown move, sound theirs, fire a waiting premove
  const sounded = useRef(cv.moves.length);
  const moveSound = (san: string | undefined) => {
    const k = sanKind(san);
    if (cv.variant === 'atomic' && k === 'capture') return chessSfx.boom();
    chessSfx[k]();
  };
  useEffect(() => {
    const n = cv.moves.length;
    if (sent && n !== sent.ply) setSent(null);
    if (n > sounded.current) moveSound(cv.sans[n - 1]);
    sounded.current = n;
    if (premove && myColor === cv.turn && live) {
      const m = premove;
      setPremove(null);
      if (realPos.isLegal(m)) void play(m, true);
    }
  }, [cv.moves.length, cv.fen]);

  // the end: a sound and a banner
  useEffect(() => {
    if (cv.status !== 'over' || !cv.result) return;
    setPremove(null);
    chessSfx.end(cv.result.winner ? cv.result.winner === myColor : null);
    base.show({ text: resultTitle(cv.result), sub: reasonText(cv.result.reason), tone: cv.result.winner && cv.result.winner === myColor ? 'gold' : 'info' }, 200, 2200);
  }, [cv.status]);
  useEffect(() => {
    if (playing && cv.moves.length === 0) chessSfx.start();
  }, [playing]);

  // under 10 s in bullet and blitz: a tick each second on my clock
  const myLeft = myColor && clocks ? clocks[myColor] : null;
  const tickSec = useRef<number | null>(null);
  useEffect(() => {
    if (!fast || myLeft === null || !live || cv.turn !== myColor || myLeft >= 10_000) return;
    const s = Math.ceil(myLeft / 1000);
    if (tickSec.current !== s) {
      if (tickSec.current === null) chessSfx.lowTime();
      else chessSfx.tick();
      tickSec.current = s;
    }
  }, [myLeft === null ? null : Math.ceil(myLeft / 1000)]);

  // watchers: the engine's best lines, live
  const watching = !myColor;
  const hints = useLiveLines(watching, cv.variant, cv.initialFen, cv.moves, { multiPv: 3, maxMs: 2500 });
  const arrows = watching ? lineArrows(hints.lines) : [];

  const pockets = cv.variant === 'crazyhouse' ? pos.pockets() : null;
  const canDrop = live && !!myColor;
  const dropAt = (r: Role, x: number, y: number) => {
    const sq = squareAtPoint(boardRef.current, bottom, x, y);
    if (sq === null || !myColor) return;
    const m = { from: sq, to: sq, drop: r } as Move;
    if (cv.turn === myColor) void play(m);
    else setPremove(m);
  };

  const seat = (c: Color) => {
    const id = cv.players[c];
    const p = view.players.find((x) => x.id === id);
    const gone = [...view.players, ...view.leftPlayers].find((x) => x.id === id);
    const r = cv.ratings?.[c];
    return (
      <ChessSeat
        player={p}
        name={id === view.meId ? 'You' : (gone?.name ?? sideName(c))}
        color={c}
        rating={r ? { r: r.r, prov: r.prov } : null}
        botLevel={cv.bots?.[c] ?? null}
        diff={cv.ratingDiff?.[c] ?? null}
        lead={lead[c]}
        set={looks.set}
        clock={clocks ? clocks[c] : null}
        active={live && cv.turn === c}
        fast={fast}
        mine={id === view.meId}
        bubble={bubbleOf(id)}
        checks={cv.checks ? cv.checks[c] : null}
        onTap={p && p.id !== view.meId ? () => base.setTarget(p.id) : undefined}
      />
    );
  };
  const pocket = (c: Color) =>
    pockets && (
      <Pocket color={c} counts={pockets[c]} set={looks.set} live={canDrop && c === myColor} picked={c === myColor ? drop : null} onPick={setDrop} onDrop={dropAt} />
    );

  let status = '';
  if (live) status = myColor === cv.turn ? 'Your move' : `${watching ? '👀 ' : ''}${sideName(cv.turn)} to move`;
  // the first moves have a deadline (server time) or the game is aborted
  if (live && abortIn !== null && myColor === cv.turn) status = `Your move · ${abortIn}s to start`;
  else if (cv.status === 'over') status = resultTitle(cv.result);
  const timeId = cv.time;
  const infoMine = (
    <p className="tinfo-counts">
      <span>{`♟️ ${variant?.name ?? 'Chess'} · ${PERF_NAMES[cv.perf] ?? cv.perf}`}</span>
      <span>{cv.rated ? '🏆 Rated' : '🤝 Casual'}</span>
      {cv.opening && <span data-no-translate>{`📖 ${cv.opening.eco} ${cv.opening.name}`}</span>}
    </p>
  );
  const tips = ['Tap a piece, then a square; or drag it', 'Tap your piece during their turn to plan a premove', variant?.about ?? ''].filter(Boolean);
  const top = other(bottom);

  return (
    <main className={cx('table lu-table pt-table pr-wide ch-table', live && myColor === cv.turn && 'pt-my-turn', watching && 'ch-watch')} style={{ '--turn-col': cv.turn === 'w' ? '#f4efe3' : '#3a3430' } as CSSProperties}>
      <div className="lu-room ch-room" aria-hidden />
      <section className="ch-left">
        {seat(top)}
        {pocket(top)}
        <span className="grow" />
        {pocket(bottom)}
        {seat(bottom)}
      </section>
      <div className="ch-stage">
        {watching && <EvalBar line={hints.lines[0] ?? null} bottom={bottom} />}
        <ChessBoard
          pos={pos}
          bottom={bottom}
          lastMove={lastMove}
          mover={live ? myColor : null}
          onMove={(m) => void play(m)}
          premove={premove}
          onPremove={setPremove}
          arrows={arrows}
          looks={looks}
          dropRole={drop}
          onDropDone={() => setDrop(null)}
          boardRef={boardRef}
        />
      </div>
      <section className="ch-right">
        {status && <p className={cx('ch-status', live && myColor === cv.turn && 'mine')} role="status">{status}</p>}
        <MoveList sans={cv.sans} blackFirst={cv.initialFen.split(' ')[1] === 'b'} />
        {watching && <EngineLines lines={hints.lines} busy={hints.busy} error={hints.error} />}
        <ChessControls cv={cv} myColor={myColor} live={live} send={(m) => void sendInput(m)} onFlip={() => setFlip((f) => !f)} />
        <p className="ch-meta muted small">
          {variant?.name ?? 'Chess'}
          {timeId && ` · ${timeText(timeId)}`} · {cv.rated ? 'Rated' : 'Casual'}
        </p>
      </section>
      <PartyChrome
        view={view}
        actions={actions}
        auth={auth}
        notes={notes}
        base={base}
        status={status}
        mine={live && myColor === cv.turn}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Leaving resigns the game"
        kickWhat="They lose the game"
        watchNote="👀 Watching · the engine's best move is shown"
        myIcon={myColor ? <span className="ch-you-piece"><PieceSvg role="k" color={myColor} set={looks.set} /></span> : undefined}
        youAre={myColor ? { color: myColor === 'w' ? '#f4efe3' : '#3a3430', name: sideName(myColor) } : undefined}
        over={overReady && <ChessOver view={view} cv={cv} myColor={myColor} onNext={() => base.setOverSeen(true)} onRematch={view.hostId === view.meId ? actions.rematch : undefined} />}
      />
    </main>
  );
}
