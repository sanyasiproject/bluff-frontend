// A real CSS 3D dice: a short tumble in place on every roll (rollSeq), landing on the value
import { useEffect, useLayoutEffect, useRef } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';

/** pips on a 3x3 grid, per face */
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
/** cube turns (x, y) that bring each face to the front */
const REST: Record<number, [number, number]> = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
const VIEW = 'rotateX(-20deg) rotateY(24deg)';
const pose = (v: number, sx = 0, sy = 0, sz = 0) => `${VIEW} rotateX(${REST[v][0] + sx}deg) rotateY(${REST[v][1] + sy}deg) rotateZ(${sz}deg)`;

function Face({ n }: { n: number }) {
  return (
    <span className={`lu-face f${n}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={PIPS[n].includes(i) ? 'pip' : undefined} />
      ))}
    </span>
  );
}

interface Props {
  value: number | null;
  rollSeq: number;
  skin: string;
  /** my turn and I may roll: glows and takes a tap */
  live: boolean;
  /** waiting for the server after my tap: keeps spinning */
  rolling: boolean;
  onRoll: () => void;
  label?: string;
}

export function Dice({ value, rollSeq, skin, live, rolling, onRoll, label }: Props) {
  const cube = useRef<HTMLSpanElement>(null);
  const shown = value ?? 1;
  const seen = useRef(rollSeq);
  const spin = useRef<Animation | null>(null);

  // after my tap: spin until the server's roll comes back
  useEffect(() => {
    if (!rolling || reducedMotion() || !cube.current) return;
    spin.current = cube.current.animate([{ transform: pose(shown) }, { transform: pose(shown, 360, 360, 180) }], { duration: 420, iterations: Infinity });
    return () => {
      spin.current?.cancel();
      spin.current = null;
    };
  }, [rolling]);

  // a new roll: a few small tumbles in place (~0.5 s), no hop, then it settles on the value
  useLayoutEffect(() => {
    if (rollSeq === seen.current) return;
    seen.current = rollSeq;
    if (reducedMotion() || !cube.current) return;
    spin.current?.cancel();
    const sx = 270 + 90 * Math.floor(Math.random() * 2);
    const sy = 180 + 90 * Math.floor(Math.random() * 2);
    cube.current.animate([{ transform: pose(shown, sx, sy, 24) }, { transform: pose(shown, sx * 0.3, sy * 0.3, 8), offset: 0.55 }, { transform: pose(shown) }], {
      duration: 500,
      easing: 'cubic-bezier(0.25, 0.7, 0.35, 1)',
    });
  }, [rollSeq]);

  return (
    <button
      type="button"
      className={cx('lu-dice', `skin-${skin}`, live && 'live', value === null && 'idle')}
      aria-label={live ? 'Roll the dice' : value ? `Dice shows ${value}` : 'Dice'}
      disabled={!live}
      onClick={onRoll}
    >
      <span className="lu-dice-hop">
        <span ref={cube} className="lu-cube" style={{ transform: pose(shown) }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Face key={n} n={n} />
          ))}
        </span>
      </span>
      <i className="lu-dice-shadow" aria-hidden />
      {label && <span className="lu-dice-label">{label}</span>}
    </button>
  );
}
