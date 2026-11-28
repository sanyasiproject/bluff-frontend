// Word Grid Hunt sounds made with Web Audio: a wooden tile click rising along the word, found, nope, the last-10 tick, time up
import { audio, noise, tone } from '../turnkit/audio';

export const wordSfx = {
  /** a tile joins the word: each one a little higher */
  tile(n: number) {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.03, 0.18, 'bandpass', 1800 + n * 120);
    tone(c, 392 * 2 ** (Math.min(n, 12) / 12), 0, 0.09, 'triangle', 0.06);
  },
  /** a new word: a bright pop, bigger for long words */
  found(points: number) {
    const c = audio();
    if (!c) return;
    const notes = points >= 5 ? [659, 784, 988, 1319] : points >= 2 ? [659, 880, 1175] : [784, 1047];
    notes.forEach((f, i) => tone(c, f, i * 0.06, 0.16, 'sine', 0.08));
  },
  /** not a word, or too short */
  nope() {
    const c = audio();
    if (c) tone(c, 196, 0, 0.18, 'square', 0.04, 150);
  },
  /** already found */
  again() {
    const c = audio();
    if (c) tone(c, 440, 0, 0.1, 'sine', 0.04);
  },
  /** each of the last 10 seconds */
  tick(last: boolean) {
    const c = audio();
    if (c) noise(c, 0, 0.04, last ? 0.35 : 0.22, 'bandpass', last ? 3000 : 2200);
  },
  /** time up: a gong */
  gong() {
    const c = audio();
    if (!c) return;
    tone(c, 196, 0, 1.2, 'sine', 0.12, 180);
    tone(c, 392, 0, 0.8, 'triangle', 0.04);
  },
};
