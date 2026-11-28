// Fruit Slice Duel art: the colours inside each fruit
import type { FruitKind } from '../../types';

/** the colour inside each fruit (its cut face and juice) */
export const FLESH: Record<FruitKind, { face: string; rim: string; juice: string }> = {
  apple: { face: '#fff4c9', rim: '#e53935', juice: '#fff59d' },
  orange: { face: '#ffb74d', rim: '#ef6c00', juice: '#ffa726' },
  melon: { face: '#ff5252', rim: '#2e7d32', juice: '#ff1744' },
  banana: { face: '#fff9c4', rim: '#fdd835', juice: '#fff176' },
  mango: { face: '#ffc107', rim: '#e65100', juice: '#ffb300' },
  grapes: { face: '#c5e1a5', rim: '#6a1b9a', juice: '#ba68c8' },
  bomb: { face: '#ff9100', rim: '#263238', juice: '#ffab00' },
};

