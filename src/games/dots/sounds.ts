// Dots and Boxes sounds made with Web Audio (no files): a pen stroke, a box popping shut, go again, the win
import { audio, noise, tone } from '../turnkit/audio';

export const dotsSfx = {
  /** a felt pen drawing a line */
  draw() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.16, 0.22, 'bandpass', 2600, 4200);
    noise(c, 0.05, 0.1, 0.12, 'highpass', 5000);
  },
  /** a box closes: a bright pop, higher for each box in one line */
  box(n = 1) {
    const c = audio();
    if (!c) return;
    for (let i = 0; i < n; i++) {
      tone(c, 520 + i * 180, 0.08 + i * 0.12, 0.14, 'triangle', 0.12, 1040 + i * 260);
      tone(c, 1568 + i * 200, 0.12 + i * 0.12, 0.1, 'sine', 0.05);
    }
  },
  /** my turn again after a box */
  again() {
    const c = audio();
    if (c) [784, 988].forEach((f, i) => tone(c, f, 0.32 + i * 0.08, 0.14, 'sine', 0.07));
  },
  /** someone else took a box */
  lost() {
    const c = audio();
    if (c) tone(c, 330, 0.06, 0.22, 'triangle', 0.07, 220);
  },
};
