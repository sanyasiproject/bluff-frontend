// Spike Attack's joystick: it appears where the thumb lands, the knob follows the drag (full speed at 60 px), gone on release
import type { CSSProperties } from 'react';

export const JOY_PX = 60;

export interface JoyState {
  /** where the thumb landed and where it is now, in table pixels */
  ox: number;
  oy: number;
  x: number;
  y: number;
}

/** the move vector (length up to 1) for a drag */
export function joyVector(j: JoyState): { x: number; y: number } {
  const dx = j.x - j.ox;
  const dy = j.y - j.oy;
  const d = Math.hypot(dx, dy);
  if (d < 6) return { x: 0, y: 0 };
  const k = Math.min(1, d / JOY_PX) / d;
  return { x: dx * k, y: dy * k };
}

export function Joystick({ joy }: { joy: JoyState | null }) {
  if (!joy) return null;
  const v = joyVector(joy);
  const style = { left: joy.ox, top: joy.oy, '--kx': `${v.x * JOY_PX}px`, '--ky': `${v.y * JOY_PX}px` } as CSSProperties;
  return (
    <div className="sp-joy on" style={style} aria-hidden>
      <i className="sp-joy-base" />
      <i className="sp-joy-knob" />
    </div>
  );
}
