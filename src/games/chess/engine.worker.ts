// The phone's own chess engine in a Web Worker: game reviews and live best lines, so the screen never stalls
import { ChessGame, Position, reviewGame, search, type ChessVariant, type PvLine } from './lib';
import type { EngineLine, EngineRequest, EngineReply } from './engineTypes';
import { botMove } from '../../chess/engine';
import { seeded } from '../../offline/engine/games/chess/budget';

const post = (m: EngineReply) => (self as unknown as Worker).postMessage(m);

/** a line in white's view, with SAN for showing */
function lineOf(pos: Position, l: PvLine): EngineLine {
  const sans: string[] = [];
  const ucis: string[] = [];
  let p = pos;
  for (const m of l.moves) {
    if (!p.isLegal(m)) break;
    sans.push(p.san(m));
    ucis.push(p.uci(m));
    p = p.play(m);
  }
  const flip = pos.turn === 'b' ? -1 : 1;
  return { sans, ucis, cp: l.scoreCp === undefined ? undefined : l.scoreCp * flip, mate: l.mate === undefined ? undefined : l.mate * flip, depth: l.depth };
}

function gameOf(variant: ChessVariant, initialFen: string, moves: readonly string[]): ChessGame {
  const g = new ChessGame(variant, initialFen);
  for (const u of moves) {
    const m = g.position().parseUci(u);
    if (!m) break;
    g.play(m);
  }
  return g;
}

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  const r = e.data;
  try {
    if (r.type === 'bot') {
      // same as the server's thinkMove: the level's bot with the job's seed and time
      const g = gameOf(r.variant, r.initialFen, r.moves);
      const pos = g.position();
      const level = Math.min(Math.max(Math.round(r.level), 1), 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      post({ id: r.id, type: 'bot', uci: pos.uci(botMove(pos, g.keys(), level, seeded(r.seed), { maxMs: r.maxMs })) });
    } else if (r.type === 'review') {
      const g = gameOf(r.variant, r.initialFen, r.moves);
      const result = reviewGame(g, { msPerMove: r.msPerMove, onProgress: (done, total) => post({ id: r.id, type: 'progress', done, total }) });
      post({ id: r.id, type: 'review', result: JSON.parse(JSON.stringify(result)) });
    } else {
      const g = gameOf(r.variant, r.initialFen, r.moves);
      const pos = g.position();
      if (pos.outcome() || pos.legalMoves().length === 0) return post({ id: r.id, type: 'lines', lines: [], final: true });
      const lines = search(pos, g.keys(), { multiPv: r.multiPv, maxMs: r.maxMs, maxDepth: r.maxDepth }, (info) => post({ id: r.id, type: 'lines', lines: info.map((l) => lineOf(pos, l)), final: false }));
      post({ id: r.id, type: 'lines', lines: lines.map((l) => lineOf(pos, l)), final: true });
    }
  } catch (err) {
    post({ id: r.id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
