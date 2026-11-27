// Colour Wars rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { COLORWAR_BURST, COLORWAR_FIRST, gameOpt, type GameConfig } from '../../types';

export function colorwarRuleLines(config?: GameConfig): string[] {
  const size = config ? gameOpt<number>(config, 'size') : null;
  return [
    `2 to 4 players on a ${size ? `${size} × ${size}` : '5 × 5 or 7 × 7 (host picks)'} board. Each player has a colour.`,
    `First move: tap any empty cell. It becomes yours with ${COLORWAR_FIRST} dots.`,
    'After that, tap one of your own cells to add a dot.',
    `At ${COLORWAR_BURST} dots a cell bursts: it empties and throws one dot into each neighbour (up, down, left, right), and those cells become yours. Bursts can chain across the board.`,
    'Lose all your cells after your first move and you are out. The last colour on the board wins.',
  ];
}

export function ColorWarRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {colorwarRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
