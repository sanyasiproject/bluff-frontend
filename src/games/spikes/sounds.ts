// Spike Attack sounds made with Web Audio (no files): steps, the ticking before a strike, the strike, a hit, out and the win
import { audio, noise, tone } from '../fruit/sounds';

export const spikesSfx = {
  /** a soft hop */
  step() {
    const c = audio();
    if (c) tone(c, 420, 0, 0.06, 'triangle', 0.04, 620);
  },
  /** the clock before a strike: higher and louder when the spike is on my line, and in its last second */
  tick(onMe: boolean, last: boolean) {
    const c = audio();
    if (!c) return;
    const f = (onMe ? 1320 : 880) * (last ? 1.25 : 1);
    tone(c, f, 0, 0.05, 'square', onMe ? 0.05 : 0.022);
    if (last && onMe) tone(c, f / 2, 0, 0.08, 'sine', 0.04);
  },
  /** a warning appears: a short two-note alarm */
  warn() {
    const c = audio();
    if (!c) return;
    tone(c, 740, 0, 0.09, 'sawtooth', 0.03);
    tone(c, 990, 0.1, 0.09, 'sawtooth', 0.03);
  },
  /** the spikes shoot across: a metal swish and a clang */
  strike() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.28, 0.45, 'bandpass', 5000, 900);
    tone(c, 1800, 0.05, 0.25, 'square', 0.03, 600);
  },
  /** the wall slams into the crates: a low wooden thud */
  thud() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.18, 0.5, 'lowpass', 420, 80);
    tone(c, 120, 0, 0.16, 'sine', 0.09, 55);
  },
  /** someone is hit: a thud; louder when it's me */
  hit(me: boolean) {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.25, me ? 0.8 : 0.35, 'lowpass', 600, 90);
    tone(c, me ? 200 : 260, 0, 0.3, 'sawtooth', me ? 0.1 : 0.05, 70);
  },
  /** out of lives: a falling ghostly slide */
  out() {
    const c = audio();
    if (c) tone(c, 700, 0, 0.9, 'sine', 0.08, 120);
  },
  /** last one standing */
  win() {
    const c = audio();
    if (c) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.08, 0.45, 'triangle', 0.08));
  },
};
