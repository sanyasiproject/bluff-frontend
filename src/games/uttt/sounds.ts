// Ultimate Tic-Tac-Toe sounds made with Web Audio: a marker squeak, a small board won, a free move, the big win
import { audio, noise, tone } from '../turnkit/audio';

export const utttSfx = {
  /** a marker stroke */
  mark() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.12, 0.2, 'bandpass', 3200, 5200);
    noise(c, 0.08, 0.08, 0.12, 'bandpass', 4200, 2800);
  },
  /** a small board stamped */
  stamp(mine: boolean) {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.1, 0.5, 'lowpass', 500);
    (mine ? [523, 784] : [392, 330]).forEach((f, i) => tone(c, f, 0.05 + i * 0.09, 0.18, 'triangle', 0.08));
  },
  /** a free move: a rising whoosh */
  free() {
    const c = audio();
    if (c) tone(c, 440, 0, 0.3, 'sine', 0.06, 880);
  },
  /** three boards in a line */
  win() {
    const c = audio();
    if (c) [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.1, 0.26, 'triangle', 0.09));
  },
};
