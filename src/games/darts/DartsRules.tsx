// Darts rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { DARTS_PER_TURN, gameOpt, type GameConfig } from '../../types';

export function dartsRuleLines(config?: GameConfig): string[] {
  const start = config ? gameOpt<number>(config, 'start') : null;
  return [
    `2 to 4 players. Everyone starts on ${start ?? '301 or 501 (host picks)'} and counts down to exactly 0.`,
    `${DARTS_PER_TURN} darts a turn. Hold on the board to aim: your hand shakes, a little at first and more the longer you hold. Let go to throw.`,
    'The thin outer ring scores double, the inner ring treble; the green bull ring is 25 and the red bull 50.',
    "Go below 0 and it's a bust: that turn's darts don't count and the turn ends.",
    'Land exactly on 0 to finish. Play goes on for the places until one player is left.',
  ];
}

export function DartsRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {dartsRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
