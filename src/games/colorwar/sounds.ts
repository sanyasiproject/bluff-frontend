// Colour Wars sounds made with Web Audio (no files): a blob dropped in, a burst, a cell flipping colour, someone wiped out
import { audio, noise, tone } from '../turnkit/audio';

export const colorwarSfx = {
  /** a dot drops into a cell: a soft bloop */
  drop() {
    const c = audio();
    if (c) tone(c, 420, 0, 0.12, 'sine', 0.12, 760);
  },
  /** a cell bursts; later waves of a chain go higher */
  burst(wave = 0) {
    const c = audio();
    if (!c) return;
    const up = Math.min(wave, 10) * 60;
    noise(c, 0, 0.18, 0.28, 'lowpass', 900 + up * 4, 200);
    tone(c, 180 + up, 0, 0.16, 'square', 0.05, 90 + up);
    tone(c, 880 + up * 2, 0.04, 0.12, 'triangle', 0.05, 1320 + up * 2);
  },
  /** cells taken from someone: a quick bright flip */
  flip(n = 1) {
    const c = audio();
    if (c) for (let i = 0; i < Math.min(n, 4); i++) tone(c, 1046 + i * 132, 0.18 + i * 0.05, 0.08, 'sine', 0.05);
  },
  /** a player is wiped out */
  out() {
    const c = audio();
    if (!c) return;
    tone(c, 523, 0, 0.18, 'sawtooth', 0.05, 392);
    tone(c, 392, 0.18, 0.18, 'sawtooth', 0.05, 262);
    tone(c, 262, 0.36, 0.4, 'sawtooth', 0.05, 131);
  },
};
