// Raja Mantri Chor Sipahi rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, RMCS_OPEN_SEC, RMCS_POINTS, type GameConfig } from '../../types';

export function rmcsRuleLines(config?: GameConfig): string[] {
  const rounds = config ? gameOpt<number>(config, 'rounds') : null;
  return [
    'Exactly 4 players (add bots to fill). Each round four folded chits are dealt: 👑 Raja, 🧐 Mantri, 🦹 Chor and 👮 Sipahi.',
    `Tap your chit to open it (it opens by itself after ${RMCS_OPEN_SEC} s). Only you see yours; the Raja shows himself to everyone.`,
    'Then the Mantri is shown and has 20 seconds to point at the Chor among the other two.',
    `Points each round: Raja ${RMCS_POINTS.raja}, Mantri ${RMCS_POINTS.mantri}, Sipahi ${RMCS_POINTS.sipahi}, Chor ${RMCS_POINTS.chor}. A wrong guess (or no guess) swaps the Mantri's and the Chor's points.`,
    `${rounds ? `${rounds} rounds` : '5 or 10 rounds (host picks)'}; the highest total wins, ties share the place.`,
  ];
}

export function RmcsRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {rmcsRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
