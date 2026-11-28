// Carrom rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, type GameConfig } from '../../types';

export function carromRuleLines(config?: GameConfig): string[] {
  const mode = config ? gameOpt<string>(config, 'mode') : null;
  const length = config ? gameOpt<string>(config, 'length') : null;
  const classic = [
    'Classic: each side owns a colour; white breaks first. 4 players play 2v2, partners sit opposite (3 players: Freestyle only).',
    'Pocket your own coin or the queen and you shoot again. Pocketing only the other colour ends your turn and the coin stays theirs.',
    "The queen needs a cover: pocket one of your coins on the same or the next shot, or she goes back to the centre. She can't be taken before your first coin.",
    'Fouls: the striker goes in, or it touches nothing. One of your pocketed coins goes back and the turn ends. Your last coin before the queen is covered is a foul too.',
    'A board ends when a side has pocketed all its coins. The winner scores 1 per coin of the other side left, plus 3 for a queen they covered.',
  ];
  const free = [
    'Freestyle: every coin is yours to take. White 20, black 10, queen 50 (she still needs a cover, or she goes back).',
    'Pocket anything and you shoot again. A foul (striker in, or touching nothing) is −10 and ends the turn.',
    'The board ends when all coins are gone. Highest score wins.',
  ];
  return [
    '2 to 4 players, each shooting from their own side; the board always turns so your baseline is at the bottom.',
    'Drag the striker along your baseline (it may not sit on a coin), then pull back from it like a slingshot: the dotted line shows the first coin it meets and the ring shows the power. Let go to shoot. No backward shots.',
    ...(mode === 'freestyle' ? free : mode === 'classic' ? classic : [...classic, ...free]),
    length === 'full' ? (mode === 'freestyle' ? 'Full game: 3 boards.' : 'Full game: first to 25 points, or the leader after 8 boards.') : length === 'quick' ? 'Quick game: one board.' : 'Quick: one board. Full: first to 25 (Classic) or 3 boards (Freestyle).',
    'About 20 seconds a shot; when time runs out a soft straight shot goes for you.',
  ];
}

export function CarromRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {carromRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
