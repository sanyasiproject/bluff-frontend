// Saves an offline game to plain JSON and back (the same codec the server uses for live rooms).
import { Board } from '../chess/core/board.js';
import { Position } from '../chess/position.js';
import { CarromSim } from '../carrom/physics.js';
import { CarromGame } from '../games/carrom/game.js';
import { ChessTable } from '../games/chess/game.js';
import { ColorWarGame } from '../games/colorwar/game.js';
import { DartsGame } from '../games/darts/game.js';
import { DotsGame } from '../games/dots/game.js';
import { GomokuGame } from '../games/gomoku/game.js';
import { LudoGame } from '../games/ludo/game.js';
import { SnakesGame } from '../games/snakes/game.js';
import { UtttCore } from '../games/uttt/core.js';
import { UtttGame } from '../games/uttt/game.js';
import { Codec, type ClassSpec } from '../persist/codec.js';
import { chessHistory, plain } from '../persist/specs.js';
import { secureRandom } from '../rand.js';

const LOCAL_CLASSES: ClassSpec[] = [
  plain('LudoGame', LudoGame),
  plain('SnakesGame', SnakesGame),
  plain('DartsGame', DartsGame),
  plain('DotsGame', DotsGame),
  plain('ColorWarGame', ColorWarGame),
  plain('ChessTable', ChessTable),
  plain('CarromGame', CarromGame),
  plain('CarromSim', CarromSim),
  plain('GomokuGame', GomokuGame),
  plain('UtttGame', UtttGame),
  plain('UtttCore', UtttCore),
  plain('Position', Position as unknown as ClassSpec['ctor']),
  plain('Board', Board),
  chessHistory,
];

/** fresh function fields by name: clocks read real time, random sources start anew */
const FIELD_FUNCTIONS: Record<string, () => unknown> = {
  now: () => () => Date.now(),
  rand: () => secureRandom,
  jitter: () => Math.random,
};

export const localCodec = new Codec(LOCAL_CLASSES, FIELD_FUNCTIONS);
