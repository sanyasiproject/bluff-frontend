// Tells shared screens (game over, chat, chess board) that this table is an offline game on one phone
import { createContext, useContext } from 'react';

export interface OfflinePlay {
  /** chess: keep white at the bottom instead of turning the board to whoever moves */
  fixedBoard: boolean;
}

export const OfflineCtx = createContext<OfflinePlay | null>(null);

/** null at online tables */
export const useOfflinePlay = () => useContext(OfflineCtx);
