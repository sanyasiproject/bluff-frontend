// Ultimate Tic-Tac-Toe rules in short lines, for the lobby's Help, the Rules page and the rules sheet
export function utttRuleLines(): string[] {
  return [
    '2 players, X and O. The board is nine small tic-tac-toe boards in a big 3 × 3.',
    'X goes first and may play anywhere. The cell you pick sends your opponent to the matching small board (top-right cell → top-right board).',
    'If that board is already won or full, they get a free move: any open board.',
    'Three in a row in a small board wins it (a big X or O). A full small board with no line counts for nobody.',
    'Win three small boards in a line to win the game. If no big line is left, it is a draw.',
  ];
}

export function UtttRules() {
  return (
    <ul>
      {utttRuleLines().map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
