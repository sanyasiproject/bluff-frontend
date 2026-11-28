// Bomb Pass rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, type GameConfig } from '../../types';

export function bombRuleLines(config?: GameConfig): string[] {
  const hearts = config ? gameOpt<number>(config, 'hearts') : null;
  const speed = config ? gameOpt<string>(config, 'speed') : null;
  return [
    `2 to 4 players, everyone at once. Everyone starts with ${hearts ?? '2 or 3'} hearts.`,
    `A lit bomb starts with a random player. Its fuse is secret (${speed === 'fast' ? '8 to 20' : speed === 'normal' ? '12 to 30' : '12 to 30, or 8 to 20 on Fast,'} seconds).`,
    'The holder gets a quick task: a sum, the bigger number, the ink colour, the odd one out, counting dots or an arrow. One tap answers it.',
    'Right: the bomb flies to the next player round the table, who gets a new task at once. Wrong: the bomb shakes for a moment and a new task comes.',
    'When the fuse runs out the holder loses a heart: BOOM! After a short break a new round starts with the next player.',
    'Near the end the bomb ticks faster and glows hotter. Nobody knows exactly when. 0 hearts and you are out; the last one standing wins.',
  ];
}

export function BombRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {bombRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
