// My striker on my baseline (display bottom): drag it along the line, pull back from it like a slingshot, release to shoot
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CARROM, firstContact, PHYS, strikerFits, strikerSpot, type CarromCoin } from './lib';
import { Coin } from './CarromBoard';

const PULL_MAX = 0.24;

interface Props {
  live: boolean;
  /** coins turned for my view */
  coins: CarromCoin[];
  x: number;
  onX: (x: number) => void;
  /** dx to my right, dy into the board (screen up) */
  onShoot: (dx: number, dy: number, power: number) => void;
  onBad: () => void;
}

type Mode = 'idle' | 'slide' | 'pull';

export function CarromAim({ live, coins, x, onX, onShoot, onBad }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [pull, setPull] = useState<{ vx: number; vy: number; power: number } | null>(null);
  const grab = useRef<number | null>(null);
  const [sx, sy] = strikerSpot(0, x);
  const ok = strikerFits(coins, 0, x);
  const { strikerR: SR, baseFrom, baseTo } = CARROM;

  const toBoard = (e: RPointerEvent<SVGRectElement>): [number, number] => {
    const m = e.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };
  const slideTo = (px: number) => onX(Math.max(0, Math.min(1, (px - baseFrom) / (baseTo - baseFrom))));
  const pullFrom = (px: number, py: number) => {
    let vx = sx - px;
    let vy = sy - py;
    const d = Math.sqrt(vx * vx + vy * vy);
    if (d < 0.012) return setPull(null);
    vx /= d;
    vy /= d;
    // never backward: the shot points into the board (screen up), as the server clamps it
    const fwd = Math.max(PHYS.minForward, 0.08);
    if (-vy < fwd) {
      vy = -fwd;
      vx = (vx < 0 ? -1 : 1) * Math.sqrt(1 - fwd * fwd);
    }
    setPull({ vx, vy, power: Math.max(0, Math.min(1, (d - 0.015) / PULL_MAX)) });
  };

  const down = (e: RPointerEvent<SVGRectElement>) => {
    if (!live) return;
    const [px, py] = toBoard(e);
    const near = (px - sx) ** 2 + (py - sy) ** 2 < (SR * 2.6) ** 2;
    const onLine = Math.abs(py - sy) < 0.07 && px > baseFrom - 0.05 && px < baseTo + 0.05;
    if (!near && !onLine && py < sy) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety
    }
    grab.current = e.pointerId;
    if (!near && onLine) slideTo(px);
    if (!near && !onLine) {
      setMode('pull');
      pullFrom(px, py);
      return;
    }
    setMode('slide');
  };
  const move = (e: RPointerEvent<SVGRectElement>) => {
    if (grab.current !== e.pointerId) return;
    const [px, py] = toBoard(e);
    if (mode === 'slide' && py > sy + 0.045) setMode('pull');
    if (mode === 'pull' || py > sy + 0.045) pullFrom(px, py);
    else slideTo(px);
  };
  const up = (e: RPointerEvent<SVGRectElement>) => {
    if (grab.current !== e.pointerId) return;
    grab.current = null;
    const p = pull;
    const was = mode;
    setMode('idle');
    setPull(null);
    if (was !== 'pull' || !p || p.power < 0.05) return;
    if (!ok) return onBad();
    onShoot(p.vx, -p.vy, p.power);
  };

  const aim = live && pull ? firstContact(coins, sx, sy, pull.vx, pull.vy) : null;
  const hitCoin = aim?.coin ? coins.find((c) => c.id === aim.coin) : null;
  const p = pull?.power ?? 0;
  const ring = p > 0.8 ? '#ff5252' : p > 0.5 ? '#ffab40' : '#ffd54a';
  const tail = 0.02 + p * PULL_MAX;
  return (
    <g className={live ? 'cr-aim live' : 'cr-aim'}>
      {live && <path d={`M${baseFrom} ${sy}H${baseTo}`} stroke="#ffd54a" strokeOpacity={mode === 'slide' ? 0.9 : 0.45} strokeWidth="0.006" strokeLinecap="round" strokeDasharray="0.001 0.016" aria-hidden />}
      {aim && (
        <g aria-hidden>
          <path d={`M${sx} ${sy}L${aim.at[0]} ${aim.at[1]}`} stroke="#3b2414" strokeOpacity="0.45" strokeWidth="0.012" strokeLinecap="round" strokeDasharray="0.001 0.02" />
          <path d={`M${sx} ${sy}L${aim.at[0]} ${aim.at[1]}`} stroke="#fff" strokeWidth="0.008" strokeLinecap="round" strokeDasharray="0.001 0.02" />
          <circle cx={aim.at[0]} cy={aim.at[1]} r={SR} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.003" strokeDasharray="0.008 0.006" />
          <path
            d={`M${hitCoin ? hitCoin.x : aim.at[0]} ${hitCoin ? hitCoin.y : aim.at[1]}l${aim.after[0] * 0.09} ${aim.after[1] * 0.09}`}
            stroke="#ffd54a"
            strokeWidth="0.005"
            strokeLinecap="round"
            strokeDasharray="0.012 0.008"
          />
        </g>
      )}
      {pull && (
        <g aria-hidden>
          <path d={`M${sx} ${sy}L${sx - pull.vx * tail} ${sy - pull.vy * tail}`} stroke={ring} strokeWidth="0.007" strokeLinecap="round" />
          <circle cx={sx} cy={sy} r={SR * (1.25 + p * 1.5)} fill="none" stroke={ring} strokeWidth={0.004 + p * 0.005} opacity="0.9" />
        </g>
      )}
      <g className={ok ? 'cr-striker' : 'cr-striker bad'}>
        {live && !ok && <circle cx={sx} cy={sy} r={SR * 1.35} fill="#ff1744" opacity="0.35" />}
        <Coin kind="s" x={sx} y={sy} r={SR} />
      </g>
      {live && <rect x="-0.085" y="-0.085" width="1.17" height="1.17" fill="transparent" className="cr-hit" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />}
    </g>
  );
}
