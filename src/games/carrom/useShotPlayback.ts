// Replays the last shot with the shared simulation at 60 fps (sounds from its events), then lets the server's final state show
import { useEffect, useRef, useState } from 'react';
import { CarromSim, launchOf, type CarromShotView, type CarromView } from './lib';
import { carromSfx } from './sounds';

export interface Piece {
  id: string;
  c: 'w' | 'b' | 'q' | 's';
  x: number;
  y: number;
}

/** pieces in board coords while the last shot rolls, else null */
export function useShotPlayback(dv: CarromView, onDone: (shot: CarromShotView) => void): Piece[] | null {
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const seen = useRef<number | null>(dv.last?.seq ?? null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const shot = dv.last;
    if (!shot || shot.seq === seen.current) return;
    seen.current = shot.seq;
    const sim = new CarromSim(shot.before, launchOf(shot.side, shot.x, shot.dx, shot.dy, shot.power));
    let raf = 0;
    let ev = 0;
    const t0 = performance.now();
    carromSfx.flick();
    const frame = () => {
      const t = performance.now() - t0;
      sim.advance(t);
      setPieces(sim.pieces().filter((p) => p.on));
      // sounds as the events pass
      while (ev < sim.events.length && sim.events[ev].t <= t) {
        const e = sim.events[ev++];
        if (e.kind === 'pocket') carromSfx.pocket();
        else if (e.kind === 'wall') carromSfx.wall(e.v ?? 1);
        else carromSfx.clack(e.v ?? 1);
      }
      if (!sim.done) raf = requestAnimationFrame(frame);
      else {
        setPieces(null);
        done.current(shot);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      setPieces(null);
    };
  }, [dv.last?.seq]);

  return pieces;
}
