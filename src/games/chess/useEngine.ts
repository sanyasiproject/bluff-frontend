// Runs the engine worker for a screen: a review with progress, or live best lines that restart on every new position
import { useEffect, useRef, useState } from 'react';
import type { ChessVariant } from './lib';
import type { EngineLine, EngineReply, EngineRequest, ReviewResult } from './engineTypes';

let seq = 0;
const spawn = () => new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });

/** live engine lines for a position (watchers, analysis); stops while `on` is false or the page is hidden */
export function useLiveLines(on: boolean, variant: ChessVariant, initialFen: string, moves: string[], opts: { multiPv?: number; maxMs?: number } = {}) {
  const [lines, setLines] = useState<EngineLine[]>([]);
  const [busy, setBusy] = useState(false);
  const hidden = usePageHidden();
  const key = moves.join(' ');
  useEffect(() => {
    setLines([]);
    if (!on || hidden) return;
    const w = spawn();
    const id = ++seq;
    setBusy(true);
    w.onmessage = (e: MessageEvent<EngineReply>) => {
      const r = e.data;
      if (r.id !== id) return;
      if (r.type === 'lines') {
        if (r.lines.length) setLines(r.lines);
        if (r.final) (setBusy(false), w.terminate());
      } else if (r.type === 'error') (setBusy(false), w.terminate());
    };
    const req: EngineRequest = { id, type: 'search', variant, initialFen, moves, multiPv: opts.multiPv ?? 3, maxMs: opts.maxMs ?? 2500 };
    w.postMessage(req);
    return () => w.terminate();
  }, [on, hidden, variant, initialFen, key]);
  return { lines, busy };
}

/** reviews a whole game once (cached per game id on this phone); stops if the screen closes */
export function useReview(gameId: string, variant: ChessVariant, initialFen: string, moves: string[], msPerMove = 250) {
  const [result, setResult] = useState<ReviewResult | null>(() => loadReview(gameId));
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: moves.length });
  const [error, setError] = useState<string | null>(null);
  const hidden = usePageHidden();
  const started = useRef(false);
  useEffect(() => {
    if (result || hidden || !moves.length) return;
    const w = spawn();
    const id = ++seq;
    started.current = true;
    w.onmessage = (e: MessageEvent<EngineReply>) => {
      const r = e.data;
      if (r.id !== id) return;
      if (r.type === 'progress') setProgress({ done: r.done, total: r.total });
      else if (r.type === 'review') {
        setResult(r.result);
        saveReview(gameId, r.result);
        w.terminate();
      } else if (r.type === 'error') (setError(r.message), w.terminate());
    };
    const req: EngineRequest = { id, type: 'review', variant, initialFen, moves, msPerMove };
    w.postMessage(req);
    return () => w.terminate();
  }, [gameId, hidden, result]);
  return { result, progress, error };
}

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return hidden;
}

// reviews kept per game id on this phone (the newest 30)
const KEY = 'bluff.chess.reviews';
const V = 1;
function loadAll(): Record<string, { v: number; at: number; r: ReviewResult }> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}
export function loadReview(id: string): ReviewResult | null {
  const e = loadAll()[id];
  return e && e.v === V ? e.r : null;
}
function saveReview(id: string, r: ReviewResult): void {
  try {
    const all = loadAll();
    all[id] = { v: V, at: Date.now(), r };
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch {
    // storage full or blocked: the review is just not kept
  }
}
