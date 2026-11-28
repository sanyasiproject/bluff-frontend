// The registry games that play offline on one phone: their pure rule modules (no server glue).
import type { PluggedKind } from '../types.js';
import { carromModule } from '../games/carrom/module.js';
import { chessRules } from '../games/chess/rules.js';
import { colorwarModule } from '../games/colorwar/module.js';
import { dartsModule } from '../games/darts/module.js';
import { dotsModule } from '../games/dots/module.js';
import { gomokuModule } from '../games/gomoku/module.js';
import { ludoModule } from '../games/ludo/module.js';
import { snakesModule } from '../games/snakes/module.js';
import { utttModule } from '../games/uttt/module.js';
import type { GameModule, PluggedGame } from '../games/module.js';

/** the offline games, in the order the setup screen lists them */
export const LOCAL_GAMES = ['ludo', 'snakes', 'chess', 'gomoku', 'uttt', 'dots', 'colorwar', 'carrom', 'darts'] as const satisfies readonly PluggedKind[];
export type LocalKind = (typeof LOCAL_GAMES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MODULES: Record<LocalKind, GameModule<any>> = {
  ludo: ludoModule,
  snakes: snakesModule,
  chess: chessRules,
  gomoku: gomokuModule,
  uttt: utttModule,
  dots: dotsModule,
  colorwar: colorwarModule,
  carrom: carromModule,
  darts: dartsModule,
};

export const isLocalKind = (k: unknown): k is LocalKind => (LOCAL_GAMES as readonly unknown[]).includes(k);

export const localModuleOf = (kind: LocalKind): GameModule<PluggedGame> => MODULES[kind];
