import type { PublicPlayer } from '../types';

/** a seated player's shop aura (seat box, card backs); null when none or unknown */
export const auraOf = (players: readonly Pick<PublicPlayer, 'id' | 'shop'>[], id: string | null | undefined): string | null =>
  players.find((p) => p.id === id)?.shop?.aura ?? null;
