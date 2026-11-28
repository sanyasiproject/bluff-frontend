// The one door to the carrom library (src/carrom, synced from the backend) and Carrom's types, plus display helpers
import { toBoard, toLocal, type CarromCoin, type CarromSide } from '../../carrom';

export * from '../../carrom';
export type { CarromView, CarromShotView, CarromFoul, CarromMoveInput } from '../../types';
export { CARROM_FOUL_TEXT, CARROM_RULES } from '../../types';

/** a board point turned so `mySide` sits at the bottom of the screen */
export function toView(mySide: CarromSide, x: number, y: number): [number, number] {
  const [u, f] = toLocal(mySide, x, y);
  return toBoard(0, u, f);
}

/** coins turned for my view */
export const coinsToView = (mySide: CarromSide, coins: readonly CarromCoin[]): CarromCoin[] =>
  coins.map((c) => {
    const [x, y] = toView(mySide, c.x, c.y);
    return { ...c, x, y };
  });

/** a coin id's colour ('W3' → w, 'B1' → b, 'Q' → q) */
export const colorOfId = (id: string): 'w' | 'b' | 'q' => (id[0] === 'Q' ? 'q' : id[0] === 'B' ? 'b' : 'w');
