// Bomb Pass sounds made with Web Audio: the tick, the toss, a right and a wrong answer, the BOOM and a heart popping
import { audio, noise, tone } from '../turnkit/audio';

/** ms between ticks for each heat stage */
export const TICK_MS = [900, 620, 400, 230] as const;

export const bombSfx = {
  tick(heat: number) {
    const c = audio();
    if (!c) return;
    tone(c, heat >= 2 ? 1400 : 1150, 0, 0.035, 'square', 0.035 + heat * 0.012);
  },
  toss() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.3, 0.3, 'bandpass', 600, 2600);
    tone(c, 500, 0, 0.25, 'sine', 0.05, 900);
  },
  right() {
    const c = audio();
    if (c) [880, 1320].forEach((f, i) => tone(c, f, i * 0.06, 0.12, 'triangle', 0.08));
  },
  wrong() {
    const c = audio();
    if (!c) return;
    tone(c, 180, 0, 0.22, 'square', 0.06, 120);
  },
  boom() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 1.2, 1, 'lowpass', 1400, 60);
    tone(c, 90, 0, 0.8, 'sine', 0.45, 30);
    noise(c, 0.05, 0.4, 0.5, 'bandpass', 3000, 400);
  },
  heart() {
    const c = audio();
    if (c) tone(c, 700, 0.35, 0.3, 'triangle', 0.07, 260);
  },
  win() {
    const c = audio();
    if (c) [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.09, i === 3 ? 0.5 : 0.12, 'triangle', 0.08));
  },
};
