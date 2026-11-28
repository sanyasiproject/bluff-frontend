// After-game analysis on the phone's own engine (Web Worker): eval bar and graph, marked moves, better-move arrows, accuracy, PGN
import '../../styles/land-chess-board.css';
import '../../styles/land-chess.css';
import '../../styles/land-chess-analysis.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FullPage } from '../../components/FullPage';
import { cx } from '../../lib/cards';
import type { Arrow } from './BoardLayers';
import { ChessBoard } from './ChessBoard';
import { EngineLines, EvalBar, lineArrows } from './EvalBar';
import { EvalGraph, JUDGE_COLORS } from './EvalGraph';
import { ChessGame, type ChessEndReason, type ChessVariant, type Color } from './lib';
import { useChessLooks } from './looks';
import { MoveList, type MoveMark } from './MoveList';
import { reasonText, resultTitle } from './texts';
import { useLiveLines, useReview } from './useEngine';

interface Props {
  gameId: string;
  variant: ChessVariant;
  initialFen: string;
  moves: string[];
  names: { w: string; b: string };
  result?: { winner: Color | null; reason: ChessEndReason } | null;
  bottom: Color;
  onClose: () => void;
}

const GLYPH: Partial<Record<string, string>> = { inaccuracy: '?!', mistake: '?', blunder: '??', best: '★', book: '📖' };
const BAD = ['inaccuracy', 'mistake', 'blunder'];

export function ChessAnalysis({ gameId, variant, initialFen, moves, names, result, bottom: start, onClose }: Props) {
  const looks = useChessLooks();
  const game = useMemo(() => {
    try {
      return ChessGame.fromUci(variant, initialFen, moves);
    } catch {
      return new ChessGame(variant, initialFen);
    }
  }, [gameId]);
  const n = game.moves.length;
  const [ply, setPly] = useState(n);
  const [bottom, setBottom] = useState(start);
  const [showLine, setShowLine] = useState(false);
  const [copied, setCopied] = useState(false);
  const ucis = useMemo(() => game.uciList(), [game]);
  const sans = useMemo(() => game.sanList(), [game]);
  const { result: review, progress, error } = useReview(gameId, variant, initialFen, ucis);
  const live = useLiveLines(showLine, variant, initialFen, ucis.slice(0, ply), { multiPv: 1, maxMs: 2000 });
  const pos = game.positionAt(ply);
  const mv = ply > 0 ? review?.moves[ply - 1] : undefined;
  const step = (d: number) => setPly((p) => Math.max(0, Math.min(n, p + d)));

  // keyboard: ← → step, Home / End jump
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Home') setPly(0);
      else if (e.key === 'End') setPly(n);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [n]);

  // swipe across the board to step
  const swipe = useRef<number | null>(null);

  const marks: (MoveMark | null)[] = useMemo(
    () => (review ? review.moves.map((m) => (GLYPH[m.judgement] ? { text: GLYPH[m.judgement]!, tone: m.judgement as MoveMark['tone'] } : null)) : []),
    [review],
  );
  const evalCp = review ? (ply === 0 ? (review.moves[0]?.evalBefore ?? 0) : (review.moves[ply - 1]?.evalAfter ?? 0)) : null;
  const barLine = showLine && live.lines[0] ? live.lines[0] : evalCp === null ? null : Math.abs(evalCp) >= 9000 ? { mate: (evalCp > 0 ? 1 : -1) * Math.max(1, 10000 - Math.abs(evalCp)) } : { cp: evalCp };
  const arrows: Arrow[] = [];
  if (mv && BAD.includes(mv.judgement)) arrows.push({ from: mv.best.from, to: mv.best.to, color: '#4aa3ff', width: 0.17 });
  if (showLine) arrows.push(...lineArrows(live.lines, 1));
  const last = ply > 0 ? game.moves[ply - 1] : null;

  const count = (c: Color, j: string) => (review ? review.moves.filter((m, i) => (i % 2 === 0) === (c === (initialFen.split(' ')[1] === 'b' ? 'b' : 'w')) && m.judgement === j).length : 0);
  const pgn = () => game.pgn({ Event: 'Game Baithak', White: names.w, Black: names.b, Variant: variant, Result: !result ? '*' : result.winner === 'w' ? '1-0' : result.winner === 'b' ? '0-1' : '1/2-1/2' });
  const sharePgn = async () => {
    const text = pgn();
    const nav = navigator as Navigator & { share?: (d: { text: string; title?: string }) => Promise<void> };
    try {
      if (nav.share && matchMedia('(pointer: coarse)').matches) await nav.share({ title: 'Chess game', text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // cancelled or blocked: nothing to do
    }
  };

  return (
    <FullPage title="Analysis" onBack={onClose} className="ch-analysis-page">
      <div className="ch-analysis">
        <div
          className="ch-an-stage"
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (s !== null && Math.abs(e.clientX - s) > 40) step(e.clientX < s ? 1 : -1);
          }}
        >
          <EvalBar line={barLine} bottom={bottom} />
          <ChessBoard pos={pos} bottom={bottom} lastMove={last} looks={looks} arrows={arrows} glyph={last && mv && GLYPH[mv.judgement] && mv.judgement !== 'best' ? { sq: last.to, text: GLYPH[mv.judgement]!, color: JUDGE_COLORS[mv.judgement] } : null} />
        </div>
        <section className="ch-an-side">
          {!review && !error && (
            <div className="ch-an-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
              <span>{`🧠 Reviewing the game… ${progress.done} / ${progress.total}`}</span>
              <i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </div>
          )}
          {error && <p className="muted small">The review could not finish here.</p>}
          {review && (
            <div className="ch-an-sum">
              {review.opening && <p className="ch-an-opening" data-no-translate>📖 {review.opening.eco} · {review.opening.name}</p>}
              <table>
                <tbody>
                  {(['w', 'b'] as Color[]).map((c) => (
                    <tr key={c}>
                      <th data-no-translate>{c === 'w' ? '⚪' : '⚫'} {names[c]}</th>
                      <td><b>{Math.round(review.accuracy[c])}%</b><small>accuracy</small></td>
                      <td><b>{Math.round(review.acpl[c])}</b><small>avg loss</small></td>
                      <td className="j-inaccuracy">{count(c, 'inaccuracy')}<small>?!</small></td>
                      <td className="j-mistake">{count(c, 'mistake')}<small>?</small></td>
                      <td className="j-blunder">{count(c, 'blunder')}<small>??</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {review && <EvalGraph moves={review.moves} ply={ply} onPly={setPly} />}
          {mv && BAD.includes(mv.judgement) && (
            <p className={cx('ch-an-note', `j-${mv.judgement}`)}>
              {`${sans[ply - 1]} was ${mv.judgement === 'inaccuracy' ? 'an inaccuracy' : `a ${mv.judgement}`}. Best was ${mv.bestSan}`}
            </p>
          )}
          <MoveList sans={sans} ply={ply} marks={marks} onPly={setPly} blackFirst={initialFen.split(' ')[1] === 'b'} className="ch-an-moves" />
          {showLine && <EngineLines lines={live.lines} busy={live.busy} max={1} error={live.error} />}
          <div className="ch-an-nav">
            <button className="ch-btn" aria-label="First move" onClick={() => setPly(0)}>⏮</button>
            <button className="ch-btn" aria-label="Previous move" onClick={() => step(-1)}>◀</button>
            <button className="ch-btn" aria-label="Next move" onClick={() => step(1)}>▶</button>
            <button className="ch-btn" aria-label="Last move" onClick={() => setPly(n)}>⏭</button>
            <button className={cx('ch-btn', showLine && 'on')} aria-pressed={showLine} onClick={() => setShowLine((s) => !s)}>🧠 Line</button>
            <button className="ch-btn" aria-label="Flip the board" onClick={() => setBottom((b) => (b === 'w' ? 'b' : 'w'))}>🔃</button>
            <button className="ch-btn" onClick={() => void sharePgn()}>{copied ? '✅ Copied' : '📋 PGN'}</button>
          </div>
          {result && <p className="ch-meta muted small">{resultTitle(result)} · {reasonText(result.reason)}</p>}
        </section>
      </div>
    </FullPage>
  );
}
