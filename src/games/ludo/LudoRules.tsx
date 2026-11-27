// Ludo's rules in short lines, for the lobby's Help, the Rules page and the lesson
import { gameOpt, LUDO_POINTS, LUDO_QUICK_HOME, type GameConfig, type LudoMode } from '../../types';

export function ludoRuleLines(config?: GameConfig): string[] {
  const mode = config ? gameOpt<LudoMode>(config, 'mode') : null;
  const lines = [
    'Roll the dice on your turn and move one goti that many squares round the board, then up your own coloured lane to home in the middle.',
    'A 6 brings a goti out of its base onto your start square.',
    'Land on someone else\'s goti and it goes back to their base. Stars and the coloured start squares are safe: nobody can be knocked off there.',
    'A 6, a kill or a goti reaching home gives you another roll. Three 6s in a row: your turn is lost.',
    'You need the exact number to reach home. No move possible? Your turn passes; with only one move, it is made for you.',
  ];
  if (!mode || mode === 'classic') lines.push('Classic: get all 4 gotis home. The game goes on until one player is left for the places.');
  if (!mode || mode === 'quick') lines.push(`Quick: gotis start out of base, and the first to get ${LUDO_QUICK_HOME} home wins.`);
  if (!mode || mode === 'timed')
    lines.push(
      `Timed${config ? ` (${gameOpt<number>(config, 'time')} min)` : ''}: most points when time runs out. ${LUDO_POINTS.step} a square, ${LUDO_POINTS.kill} a kill, ${LUDO_POINTS.home} a goti home; a goti knocked off loses its squares.`,
    );
  if (!mode || mode === 'master') lines.push('Master: your lane to home stays shut 🔒 until you make your first kill.');
  if (!config || config.teams) lines.push('2 vs 2: partners sit opposite. Once your gotis are home you roll and move for your partner; the team wins together.');
  return lines;
}

export function LudoRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {ludoRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
