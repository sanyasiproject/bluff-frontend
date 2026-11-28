// Five in a Row rules in short lines, for the lobby's Help, the Rules page and the rules sheet
export function gomokuRuleLines(): string[] {
  return [
    '2 to 4 players, one stone colour each. 2 players play on a 15 × 15 board; 3 or 4 players on 19 × 19.',
    'Take turns placing one stone on any empty point. The very first stone goes on the centre point.',
    'Five or more of your stones in a row (across, down or diagonal) wins at once.',
    'With 3 or 4 players the first five wins; the others are placed by their longest line, then by turn order.',
    'If the board fills with no five, it is a draw. Run out of time and a stone is placed next to your best line.',
  ];
}

export function GomokuRules() {
  return (
    <ul>
      {gomokuRuleLines().map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
