// Our own drawn warship in cell units: a grey hull with a pointed bow, deck houses, a gun and a mast; cracked and dark when sunk
import type { SeaShip } from '../../types';

interface Props {
  ship: SeaShip;
  sunk?: boolean;
  bad?: boolean;
  className?: string;
}

/** a ship lying on the grid at its cells (horizontal drawn, vertical turned) */
export function Ship({ ship, sunk, bad, className }: Props) {
  const L = ship.len;
  const turn = ship.v ? `translate(${ship.x + 1} ${ship.y}) rotate(90)` : `translate(${ship.x} ${ship.y})`;
  const hull = `M0.14 0.2H${L - 0.6}Q${L - 0.08} 0.32 ${L - 0.06} 0.5Q${L - 0.08} 0.68 ${L - 0.6} 0.8H0.14Q0.06 0.8 0.06 0.66V0.34Q0.06 0.2 0.14 0.2Z`;
  const houses = [];
  for (let i = 0; i < Math.max(1, L - 2); i++) houses.push(<rect key={i} x={0.5 + i * 0.95} y="0.33" width={0.62} height="0.34" rx="0.06" className="sb-house" />);
  return (
    <g className={['sb-ship', sunk && 'sunk', bad && 'bad', className].filter(Boolean).join(' ')} transform={turn}>
      <path d={hull} className="sb-hull-shadow" transform="translate(0.04 0.06)" />
      <path d={hull} className="sb-hull" />
      <path d={`M0.2 0.5H${L - 0.5}`} className="sb-deckline" />
      {houses}
      <circle cx={L - 0.8} cy="0.5" r="0.14" className="sb-gun" />
      <path d={`M${L - 0.8} 0.5h0.4`} className="sb-barrel" />
      <circle cx="0.3" cy="0.5" r="0.07" className="sb-mast" />
      {sunk && <path d={`M${L * 0.3} 0.2l0.12 0.2l-0.1 0.12l0.14 0.28M${L * 0.7} 0.2l-0.1 0.2l0.12 0.12l-0.08 0.28`} className="sb-crack" />}
    </g>
  );
}
