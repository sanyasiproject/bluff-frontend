// Word Grid Hunt rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, type GameConfig } from '../../types';

export function wordHuntRuleLines(config?: GameConfig): string[] {
  const grid = config ? gameOpt<number>(config, 'grid') : null;
  const time = config ? gameOpt<number>(config, 'time') : null;
  return [
    `2 to 4 players, everyone at once, English words. 3 rounds; each round everyone gets the same ${grid ? `${grid} × ${grid}` : '4 × 4 or 5 × 5'} letter grid.`,
    `Drag through touching letters (across, down or diagonal) to make words, using each tile once. ${time ? `${time} seconds a round.` : '90, 120 or 180 seconds a round (host picks).'}`,
    'Words need 3+ letters on 4 × 4, 4+ letters on 5 × 5. "Qu" is one tile.',
    'Points: 3–4 letters 1, 5 letters 2, 6 letters 3, 7 letters 5, 8 or more 11.',
    'A word only you found scores double. Words two or more players found score normally.',
    'At the end of each round everyone’s words are shown. Highest total after 3 rounds wins; ties share.',
  ];
}

export function WordHuntRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {wordHuntRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
