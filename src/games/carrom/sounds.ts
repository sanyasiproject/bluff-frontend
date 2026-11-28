// Carrom sounds made with Web Audio: clacks scaled by hit speed, pocket thuds, wall knocks, the flick, foul and queen
import { audio, noise, tone } from '../turnkit/audio';

export const carromSfx = {
  /** coin on coin: a short bright clack, louder when faster */
  clack(speed: number, at = 0) {
    const c = audio();
    if (!c) return;
    const g = Math.max(0.05, Math.min(0.6, speed * 0.35));
    noise(c, at, 0.035, g, 'bandpass', 2600 + speed * 600, 1800);
    tone(c, 1900 + speed * 300, at, 0.04, 'triangle', g * 0.12);
  },
  /** into the net: a soft wooden thud */
  pocket(at = 0) {
    const c = audio();
    if (!c) return;
    noise(c, at, 0.12, 0.6, 'lowpass', 500, 120);
    tone(c, 140, at, 0.18, 'sine', 0.2, 70);
  },
  /** off the frame: a dull knock */
  wall(speed: number, at = 0) {
    const c = audio();
    if (!c) return;
    noise(c, at, 0.05, Math.max(0.05, Math.min(0.5, speed * 0.3)), 'lowpass', 900, 300);
    tone(c, 220, at, 0.06, 'sine', 0.05, 160);
  },
  /** the finger flicks the striker */
  flick() {
    const c = audio();
    if (c) noise(c, 0, 0.05, 0.4, 'highpass', 2400);
  },
  foul() {
    const c = audio();
    if (!c) return;
    tone(c, 330, 0, 0.18, 'sawtooth', 0.05, 300);
    tone(c, 262, 0.2, 0.32, 'sawtooth', 0.05, 200);
  },
  queen() {
    const c = audio();
    if (c) [784, 988, 1319].forEach((f, i) => tone(c, f, i * 0.08, 0.2, 'triangle', 0.08));
  },
  good() {
    const c = audio();
    if (c) [659, 988].forEach((f, i) => tone(c, f, i * 0.07, 0.14, 'sine', 0.07));
  },
};
