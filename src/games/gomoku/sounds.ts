// Five in a Row sounds made with Web Audio: a stone clacking on wood, a threat warning, the winning five
import { audio, noise, tone } from '../turnkit/audio';

export const gomokuSfx = {
  /** a stone set down on the wooden board */
  stone() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.05, 0.5, 'bandpass', 2400, 1800);
    tone(c, 1900, 0, 0.06, 'triangle', 0.08, 1200);
    noise(c, 0.012, 0.09, 0.22, 'lowpass', 600);
  },
  /** someone has four in a row: a short warning */
  threat() {
    const c = audio();
    if (c) [660, 554].forEach((f, i) => tone(c, f, i * 0.12, 0.14, 'square', 0.04));
  },
  /** five in a row */
  five() {
    const c = audio();
    if (c) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.08, 0.22, 'triangle', 0.08));
  },
};
