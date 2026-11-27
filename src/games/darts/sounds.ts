// Darts sounds made with Web Audio (no files): the whoosh, the thud in the board, a miss, bust, 180 and checkout
import { audio, noise, tone } from '../turnkit/audio';

export const dartsSfx = {
  /** the dart leaves the hand */
  whoosh() {
    const c = audio();
    if (c) noise(c, 0, 0.22, 0.25, 'bandpass', 900, 3200);
  },
  /** it lands in the sisal: a thud and a little twang */
  thud() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.09, 0.7, 'lowpass', 700, 160);
    tone(c, 150, 0, 0.12, 'sine', 0.22, 70);
    tone(c, 620, 0.02, 0.22, 'triangle', 0.03, 560);
  },
  /** off the board into the wall */
  miss() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.06, 0.5, 'highpass', 1400);
    tone(c, 300, 0, 0.1, 'square', 0.04, 180);
  },
  /** a treble or the bull: a bright ding */
  good() {
    const c = audio();
    if (c) [1319, 1760].forEach((f, i) => tone(c, f, 0.05 + i * 0.07, 0.18, 'sine', 0.07));
  },
  /** bust: a sad slide */
  bust() {
    const c = audio();
    if (!c) return;
    tone(c, 392, 0, 0.25, 'sawtooth', 0.05, 370);
    tone(c, 349, 0.26, 0.25, 'sawtooth', 0.05, 330);
    tone(c, 311, 0.52, 0.6, 'sawtooth', 0.05, 220);
  },
  /** 180: a fanfare over a roar */
  oneEighty() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 1.6, 0.18, 'bandpass', 700, 1100);
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(c, f, i * 0.12, i === 5 ? 0.7 : 0.14, 'square', 0.05));
  },
  /** a checkout: rising arpeggio */
  checkout() {
    const c = audio();
    if (c) [659, 784, 988, 1319, 1568].forEach((f, i) => tone(c, f, i * 0.08, i === 4 ? 0.6 : 0.12, 'triangle', 0.08));
  },
};
