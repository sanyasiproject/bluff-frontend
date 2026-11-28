// Wraps the synced offline runner (src/offline/engine, never edited here) as the adapter's LocalGame
import type { EngineReply, EngineRequest } from '../games/chess/engineTypes';
import type { PluggedMove } from '../types';
import { createLocalGame, restoreLocalGame, type LocalRunner, type ThinkJob } from './engine/local/runner';
import type { OfflineSetup } from './games';
import type { LocalGame } from './localRoom';

let worker: Worker | null = null;
let seq = 0;

/** a chess bot move from the phone's engine worker (one worker, reused) */
function chessBot(job: ThinkJob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      worker ??= new Worker(new URL('../games/chess/engine.worker.ts', import.meta.url), { type: 'module' });
    } catch (e) {
      return reject(e);
    }
    const w = worker;
    const id = ++seq;
    const onMsg = (e: MessageEvent<EngineReply>) => {
      if (e.data.id !== id) return;
      w.removeEventListener('message', onMsg);
      if (e.data.type === 'bot') resolve(e.data.uci);
      else if (e.data.type === 'error') reject(new Error(e.data.message));
    };
    w.addEventListener('message', onMsg);
    w.onerror = (e) => {
      e.preventDefault();
      worker?.terminate();
      worker = null;
      reject(new Error('Engine stopped'));
    };
    const req: EngineRequest = { id, type: 'bot', variant: job.variant, initialFen: job.initialFen, moves: job.moves, level: job.level, maxMs: job.maxMs, seed: job.seed };
    w.postMessage(req);
  });
}

/** the host picks the colour: the first seat plays white */
function optsOf(setup: OfflineSetup) {
  if (setup.kind !== 'chess') return setup.opts;
  const host = setup.seats.find((s) => s.bot === undefined)!;
  return { ...setup.opts, rated: 'no', color: setup.seats[0].id === host.id ? 'white' : 'black' };
}

/** why this setup can't start (Classic carrom with 3, teams without 4 ...), or null */
export function checkLocal(setup: OfflineSetup): string | null {
  try {
    createLocalGame(setup.kind, optsOf(setup), setup.seats.map((s) => ({ ...s })), { teams: setup.teams, chessBot });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'This game can not start';
  }
}

/** a new local game for this setup */
export function startLocal(setup: OfflineSetup): LocalGame {
  const r = createLocalGame(setup.kind, optsOf(setup), setup.seats.map((s) => ({ ...s })), { teams: setup.teams, chessBot });
  // chess: seat order is colour order every game (the rules' rematch swap keys on the same two seats)
  if (setup.kind === 'chess') (r.game as unknown as { colors: { w: string; b: string } }).colors = { w: setup.seats[0].id, b: setup.seats[1].id };
  return wrap(r);
}

/** a saved game back in play (its clocks skip the time it was put away); throws for a save this version can't open */
export function restoreLocal(saved: unknown): LocalGame {
  if (typeof saved !== 'string') throw new Error('Old offline save');
  const r = restoreLocalGame(saved, { chessBot });
  r.view();
  return wrap(r);
}

function wrap(r: LocalRunner): LocalGame {
  return {
    view: (seat) => r.view(seat),
    move: (seat, m: PluggedMove) => void r.move(seat, m),
    tick: (now) => r.tick(now).length > 0,
    turnId: () => r.turnId,
    over: () => r.over,
    results: () => {
      const res = r.results();
      return {
        winnerIds: res.filter((x) => x.won).map((x) => x.id),
        loserIds: res.filter((x) => x.lost).map((x) => x.id),
        places: Object.fromEntries(res.map((x) => [x.id, x.place])),
      };
    },
    snapshot: () => r.save(),
  };
}
