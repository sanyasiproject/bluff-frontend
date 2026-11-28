// Sea Battle rules in short lines, for the lobby's Help, the Rules page and the rules sheet
import { gameOpt, type GameConfig } from '../../types';

export function seaRuleLines(config?: GameConfig): string[] {
  const powers = config ? gameOpt<string>(config, 'powers') : null;
  const lines = [
    '2 to 4 players, each with their own 10 × 10 sea and a fleet of 5, 4, 3, 3 and 2.',
    'Placement (60 seconds): drag ships, tap one to turn it, or Shuffle. Ships may not overlap or touch, not even at the corners. Anything not placed in time is placed for you.',
    'On your turn pick any opponent still afloat and fire at one cell of their sea. A hit or a sink lets you fire again; a miss ends your turn. About 20 seconds a shot.',
    "Everyone sees every shot on every sea, and sunk ships are shown. Nobody sees a ship that hasn't been hit.",
    'When all your ships are sunk you are out. The last fleet afloat wins.',
  ];
  const power = [
    'Powers: sinking a ship earns a random power (hold up to 2). Use one instead of a normal shot.',
    'Radar: pick a 3 × 3 area of a sea and see how many ship cells hide there. Salvo: 3 shots at once on one sea. Torpedo: pick a row; it runs from the left until it hits a ship.',
  ];
  return powers === 'off' ? lines : [...lines, ...power];
}

export function SeaRules({ config }: { config?: GameConfig }) {
  return (
    <ul>
      {seaRuleLines(config).map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  );
}
