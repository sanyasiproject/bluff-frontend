// Fruit Slice Duel rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { FRUIT_POINTS, gameOpt, type GameConfig } from '../../types';

export function fruitRuleLines(config?: GameConfig): string[] {
  const time = config ? gameOpt<number>(config, 'time') : null;
  return [
    `Everyone plays at once for ${time ? `${time} seconds` : '45 or 60 seconds'}, after a 3-2-1 countdown.`,
    'Everyone gets exactly the same fruit at the same moment, each on their own screen. Swipe across fruit to slice it.',
    `Points: apple, orange and banana ${FRUIT_POINTS.apple}, grapes and mango ${FRUIT_POINTS.mango}, melon ${FRUIT_POINTS.melon}.`,
    'Slice 3 or more in one swipe for a combo: +1 for each fruit over 2.',
    `Don't slice a bomb 💣: it costs ${-FRUIT_POINTS.bomb} points.`,
    'Highest score when time runs out wins; equal scores share the place.',
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
