// Messages between the screens and the engine worker
import type { ChessVariant, MoveReview } from './lib';

export interface EngineLine { sans: string[]; ucis: string[]; cp?: number; mate?: number; depth: number }
export interface ReviewResult {
  moves: MoveReview[];
  accuracy: { w: number; b: number };
  acpl: { w: number; b: number };
  opening?: { eco: string; name: string };
}

export type EngineRequest =
  | { id: number; type: 'review'; variant: ChessVariant; initialFen: string; moves: string[]; msPerMove: number }
  | { id: number; type: 'search'; variant: ChessVariant; initialFen: string; moves: string[]; multiPv: number; maxMs: number; maxDepth?: number }
  // offline play: a computer seat's move at its level, as the server's bot thinks it
  | { id: number; type: 'bot'; variant: ChessVariant; initialFen: string; moves: string[]; level: number; maxMs: number; seed: number };

export type EngineReply =
  | { id: number; type: 'progress'; done: number; total: number }
  | { id: number; type: 'review'; result: ReviewResult }
  | { id: number; type: 'lines'; lines: EngineLine[]; final: boolean }
  | { id: number; type: 'bot'; uci: string }
  | { id: number; type: 'error'; message: string };

/** an engine score for showing: +1.2, -0.4, #3, #-2 (white's view) */
export function scoreText(l: Pick<EngineLine, 'cp' | 'mate'>): string {
  if (l.mate !== undefined) return `#${l.mate}`;
  const v = (l.cp ?? 0) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
}

/** a white-view score on a −1..1 scale for the eval bar (mates at the ends) */
export function barOf(l: Pick<EngineLine, 'cp' | 'mate'> | null): number {
  if (!l) return 0;
  if (l.mate !== undefined) return l.mate > 0 ? 1 : -1;
  return 2 / (1 + Math.exp(-0.004 * (l.cp ?? 0))) - 1;
}
