// Dots and Boxes rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, type GameConfig } from '../../types';

export function dotsRuleLines(config?: GameConfig): string[] {
  const size = config ? gameOpt<number>(config, 'size') : null;
  return [
    `2 to 4 players. The board is a grid of dots: ${size ? `${size} × ${size} boxes` : '4 × 4, 5 × 5 or 6 × 6 boxes (host picks)'}.`,
    'On your turn draw one line between two dots next to each other: tap the gap, or drag from dot to dot.',
    'Close the fourth side of a box and it is yours (your colour and initial), and you go again. One line can close two boxes.',
    'Careful: drawing the third side of a box hands it to the next player.',
    'When every box is closed, the most boxes wins; ties share the place.',
  ];
}

export function DotsRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {dotsRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
