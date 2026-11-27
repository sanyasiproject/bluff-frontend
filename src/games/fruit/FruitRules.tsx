// Fruit Slice Duel rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { FRUIT_ITEM_POINTS, FRUIT_MAGNET_ROUNDS, FRUIT_SLOW_MS, gameOpt, type GameConfig } from '../../types';

export function fruitRuleLines(config?: GameConfig): string[] {
  const rounds = config ? gameOpt<number>(config, 'rounds') : null;
  return [
    `A reaction duel for 2 to 4 players: ${rounds ? `${rounds} items` : '15 or 25 items'} pop onto the plate in the middle, one at a time, after a 3-2-1 countdown.`,
    'Everyone has a sword (talwar) and one big Strike button. When a fruit appears, strike as fast as you can: the fastest reaction takes it.',
    `Points: apple, orange and banana ${FRUIT_ITEM_POINTS.apple}, grapes and mango ${FRUIT_ITEM_POINTS.mango}, melon ${FRUIT_ITEM_POINTS.melon}.`,
    `Sometimes a magnet 🧲 comes instead. Don't strike it! Striking a magnet makes your sword slow for the next ${FRUIT_MAGNET_ROUNDS} items (+${(FRUIT_SLOW_MS / 1000).toFixed(2)}s on your reaction). No points are lost.`,
    'Fair on any internet: your reaction is timed on your own phone, from the moment the item shows to your tap. Tapping before it shows does nothing.',
    'The gap before each item changes, so you can’t guess it. Highest score after the last item wins; equal scores share the place.',
  ];
}

export function FruitRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {fruitRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
