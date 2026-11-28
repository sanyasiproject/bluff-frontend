// Placement: my sea with my fleet; drag a ship (it snaps to cells, red when it clashes), tap it to turn it, Shuffle, Ready
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import { SEA_SIZE, seaFleetError, seaShipCells, type SeaShip } from '../../types';
import { SeaGrid } from './SeaGrid';
import { Ship } from './Ship';

const EMPTY = { shots: new Array(SEA_SIZE * SEA_SIZE).fill(0), ships: [], afloat: [] };

/** ships that leave the sea, overlap or touch another */
export function badShips(ships: SeaShip[]): Set<number> {
  const bad = new Set<number>();
  const cells = ships.map((s) => seaShipCells(s));
  cells.forEach((cs, i) => {
    if (cs.some(([x, y]) => x < 0 || y < 0 || x >= SEA_SIZE || y >= SEA_SIZE)) bad.add(i);
    cells.forEach((ot, j) => {
      if (i === j) return;
      if (cs.some(([x, y]) => ot.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1))) bad.add(i);
    });
  });
  return bad;
}

const clampShip = (s: SeaShip): SeaShip => ({ ...s, x: Math.max(0, Math.min(SEA_SIZE - (s.v ? 1 : s.len), s.x)), y: Math.max(0, Math.min(SEA_SIZE - (s.v ? s.len : 1), s.y)) });

interface Props {
  ships: SeaShip[];
  onShips: (ships: SeaShip[]) => void;
  locked: boolean;
}

export function Placement({ ships, onShips, locked }: Props) {
  const [drag, setDrag] = useState<{ i: number; dx: number; dy: number; moved: boolean; id: number; from: SeaShip } | null>(null);
  const live = useRef(ships);
  live.current = ships;
  const bad = badShips(ships);

  const cellAt = (e: RPointerEvent<SVGRectElement>): [number, number] => {
    const m = e.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!m) return [-1, -1];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  const down = (e: RPointerEvent<SVGRectElement>) => {
    if (locked) return;
    const [px, py] = cellAt(e);
    const i = ships.findIndex((s) => seaShipCells(s).some(([x, y]) => Math.floor(px) === x && Math.floor(py) === y));
    if (i < 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety
    }
    setDrag({ i, dx: px - ships[i].x, dy: py - ships[i].y, moved: false, id: e.pointerId, from: ships[i] });
  };
  const move = (e: RPointerEvent<SVGRectElement>) => {
    if (!drag || drag.id !== e.pointerId) return;
    const [px, py] = cellAt(e);
    const s = clampShip({ ...drag.from, x: Math.round(px - drag.dx), y: Math.round(py - drag.dy) });
    if (s.x === live.current[drag.i].x && s.y === live.current[drag.i].y) return;
    setDrag({ ...drag, moved: true });
    onShips(live.current.map((o, k) => (k === drag.i ? s : o)));
  };
  const up = (e: RPointerEvent<SVGRectElement>) => {
    if (!drag || drag.id !== e.pointerId) return;
    // a tap turns the ship round its first cell
    if (!drag.moved) onShips(live.current.map((o, k) => (k === drag.i ? clampShip({ ...o, v: !o.v }) : o)));
    setDrag(null);
  };

  return (
    <SeaGrid
      board={EMPTY}
      ships={[]}
      className={cx('sb-place', drag && 'dragging')}
      overlay={
        <g>
          {ships.map((s, i) => (
            <Ship key={i} ship={s} bad={bad.has(i)} className={drag?.i === i ? 'lifted' : undefined} />
          ))}
          {!locked && <rect x="0" y="0" width={SEA_SIZE} height={SEA_SIZE} fill="transparent" className="sb-drag-area" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />}
        </g>
      }
    />
  );
}

export const fleetOk = (ships: SeaShip[]) => seaFleetError(ships) === null;
