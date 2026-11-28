// Chess sounds made with Web Audio (no files): wood on wood, captures, check, castle, low time tick, game end
import { audio, noise, tone } from '../turnkit/audio';

/** a wooden piece set down: a short low knock */
function knock(c: AudioContext, at: number, gain: number, freq = 900) {
  noise(c, at, 0.06, gain, 'bandpass', freq, freq * 0.6);
  tone(c, freq / 4.5, at, 0.07, 'triangle', gain * 0.35);
}

export const chessSfx = {
  move() {
    const c = audio();
    if (c) knock(c, 0, 0.5);
  },
  capture() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 0.55, 1100);
    knock(c, 0.045, 0.45, 700);
  },
  check() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 0.5);
    tone(c, 880, 0.04, 0.16, 'triangle', 0.07, 1175);
  },
  castle() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 0.45);
    knock(c, 0.11, 0.45, 760);
  },
  /** atomic capture: a boom */
  boom() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.5, 0.6, 'lowpass', 900, 80);
    tone(c, 110, 0, 0.4, 'sawtooth', 0.08, 40);
  },
  /** a crazyhouse drop: a soft tap */
  drop() {
    const c = audio();
    if (c) knock(c, 0, 0.4, 1300);
  },
  /** once a second under 10 s (bullet and blitz) */
  tick() {
    const c = audio();
    if (c) tone(c, 1760, 0, 0.04, 'square', 0.025);
  },
  lowTime() {
    const c = audio();
    if (c) [988, 784].forEach((f, i) => tone(c, f, i * 0.12, 0.12, 'triangle', 0.06));
  },
  start() {
    const c = audio();
    if (c) [523, 659, 784].forEach((f, i) => tone(c, f, i * 0.07, 0.16, 'sine', 0.06));
  },
  end(win: boolean | null) {
    const c = audio();
    if (!c) return;
    const notes = win === null ? [523, 523, 523] : win ? [523, 659, 784, 1047] : [440, 392, 330];
    notes.forEach((f, i) => tone(c, f, i * 0.13, 0.26, 'triangle', 0.08));
  },
};
