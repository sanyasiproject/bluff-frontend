// Codec specs shared by the server's room saves and the apps' offline saves (pure).
import { ChessGame } from '../chess/game.js';
import type { ClassSpec } from './codec.js';

/** chess history: the start and the moves (UCI), replayed on restore */
export const chessHistory: ClassSpec = {
  name: 'ChessGame',
  ctor: ChessGame,
  encode: (o) => {
    const g = o as unknown as { variant: ChessGame['variant']; startFen: string; ucis: string[] };
    return { variant: g.variant, startFen: g.startFen, ucis: [...g.ucis] };
  },
  decode: (d) => {
    const x = d as { variant: ChessGame['variant']; startFen: string; ucis: string[] };
    return ChessGame.fromUci(x.variant, x.startFen, x.ucis);
  },
};

/** a class saved field by field */
export const plain = (name: string, ctor: ClassSpec['ctor']): ClassSpec => ({ name, ctor });
