// Spike Attack's arrow pad, where the right thumb rests: press to step, hold to keep walking
import { useEffect, useRef, type PointerEvent as RPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import type { SpikesMoveInput } from '../../types';

type Dir = SpikesMoveInput['dir'];
const ARROWS: { dir: Dir; label: string; glyph: string }[] = [
  { dir: 'up', label: 'Up', glyph: '▲' },
  { dir: 'left', label: 'Left', glyph: '◀' },
  { dir: 'right', label: 'Right', glyph: '▶' },
  { dir: 'down', label: 'Down', glyph: '▼' },
];
const REPEAT_MS = 170;

export function Pad({ onStep, disabled }: { onStep: (d: Dir) => void; disabled: boolean }) {
  const timer = useRef(0);
  const stop = () => window.clearInterval(timer.current);
  useEffect(() => stop, []);
  const press = (d: Dir) => (e: RPointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    stop();
    onStep(d);
    timer.current = window.setInterval(() => onStep(d), REPEAT_MS);
  };
  return (
    <div className={cx('sp-pad', disabled && 'off')} role="group" aria-label="Move">
      {ARROWS.map((a) => (
        <button key={a.dir} className={cx('sp-pad-btn', `d-${a.dir}`)} aria-label={a.label} onPointerDown={press(a.dir)} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} onContextMenu={(e) => e.preventDefault()}>
          {a.glyph}
        </button>
      ))}
      <i className="sp-pad-hub" aria-hidden />
    </div>
  );
}
