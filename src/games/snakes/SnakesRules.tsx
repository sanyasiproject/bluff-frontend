// Saanp Seedhi rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, SNAKES_BITE_BACK, type GameConfig } from '../../types';

export function snakesRuleLines(config?: GameConfig): string[] {
  const on = (id: string) => (config ? gameOpt<boolean>(config, id) : null);
  const lines = ['Roll the dice on your turn; your goti walks that many squares by itself, from 1 up to 100.', 'Land on a ladder\'s foot 🪜 and climb to its top. Land on a snake\'s head 🐍 and slide down to its tail.'];
  if (on('six') !== false) lines.push('Need a 6: you roll a 6 to step onto square 1.');
  if (on('six') !== true) lines.push('Go straight: your goti starts moving from the first roll.');
  if (on('exact') !== false) lines.push('Exact roll: land on 100 exactly; roll too much and you bounce back by the extra.');
  if (on('exact') !== true) lines.push('Any roll: reaching 100 or more finishes.');
  if (on('bonus') !== false) lines.push('Sixes roll again: a 6 gives another roll; three 6s in a row lose the turn.');
  if (on('bite') !== false) lines.push(`Bite: land on another player's square and they go back ${SNAKES_BITE_BACK} squares.`);
  lines.push('First to 100 wins; the rest play on for the places.');
  return lines;
}

export function SnakesRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {snakesRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
