// A real CSS 3D dice: tumbles on every roll (rollSeq) and lands showing the value
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
  const hop = useRef<HTMLSpanElement>(null);
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

  // a new roll: tumble and land on the value
  useLayoutEffect(() => {
    if (rollSeq === seen.current) return;
    seen.current = rollSeq;
    if (reducedMotion() || !cube.current || !hop.current) return;
    spin.current?.cancel();
    const sx = 720 + 90 * Math.floor(Math.random() * 3);
    const sy = 540 + 90 * Math.floor(Math.random() * 3);
    cube.current.animate([{ transform: pose(shown, sx, sy, 200) }, { transform: pose(shown, sx * 0.25, sy * 0.25, 40), offset: 0.7 }, { transform: pose(shown) }], {
      duration: 760,
      easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
    });
    hop.current.animate(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-46%) scale(1.08)', offset: 0.3 },
        { transform: 'translateY(0) scale(1)', offset: 0.62 },
        { transform: 'translateY(-12%) scale(1.02)', offset: 0.8 },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 760, easing: 'ease-out' },
    );
  }, [rollSeq]);

  return (
    <button
      type="button"
      className={cx('lu-dice', `skin-${skin}`, live && 'live', value === null && 'idle')}
      aria-label={live ? 'Roll the dice' : value ? `Dice shows ${value}` : 'Dice'}
      disabled={!live}
      onClick={onRoll}
    >
      <span ref={hop} className="lu-dice-hop">
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
