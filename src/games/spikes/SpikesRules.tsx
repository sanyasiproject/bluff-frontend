// Spike Attack rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, SPIKES_LIVES, type GameConfig } from '../../types';
import { boxCount } from './shield';

export function spikesRuleLines(config?: GameConfig): string[] {
  const size = config ? gameOpt<number>(config, 'size') : null;
  const fast = config ? gameOpt<string>(config, 'speed') === 'fast' : null;
  return [
    `Everyone plays at once on a ${size ? `${size} × ${size}` : '5 × 5, 6 × 6, 8 × 8 or 10 × 10'} arena, starting in the corner boxes, after a 3-2-1 countdown.`,
    'Run freely, any direction: touch anywhere and drag, and a joystick appears under your thumb; drag further to run faster. On a keyboard, the arrow keys or WASD. Players can pass through each other, not through crates.',
    `Wooden crates stand on a few squares for the whole game (${size ? boxCount(size) : '4 on 5 × 5, 6 on 6 × 6, 10 on 8 × 8, 14 on 10 × 10'}). They are solid: nobody walks through them.`,
    `A whole side lights up red with a big countdown: at 0 a wall of spikes shoots in from that side across every row (or column), stopping at the first crate in its way. Warnings start at ${fast === null ? '3 seconds (Fast: 2)' : fast ? '2 seconds' : '3 seconds'} and get shorter; later two sides can fire at once.`,
    `Hide behind a crate on the far side from the wall: the squares in its shadow stay clear (green). Even half a blob in the red gets hit. A hit costs a ❤️; you have ${SPIKES_LIVES}, and a second of safety after each hit.`,
    ...(size === null || size >= 8 ? ['On 8 × 8 and 10 × 10 the crates move about every 40 seconds: dashed outlines show where they land 2 seconds before, and they never land on a player.'] : []),
    'No spot is safe from every side: wherever you stand, at least one wall reaches you, so keep moving.',
    'At 0 hearts you are out and float round as a ghost 👻. Last one standing wins; players out on the same strike share the place. After 3 minutes, most hearts left wins.',
  ];
}

export function SpikesRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {spikesRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
