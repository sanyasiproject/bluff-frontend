// Sea Battle sounds made with Web Audio: the gun, a splash, a hit, a ship going down, radar ping and the torpedo run
import { audio, noise, tone } from '../turnkit/audio';

export const seaSfx = {
  gun() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.25, 0.6, 'lowpass', 900, 120);
    tone(c, 110, 0, 0.2, 'sine', 0.2, 50);
  },
  splash(at = 0) {
    const c = audio();
    if (c) noise(c, at, 0.45, 0.35, 'bandpass', 2400, 600);
  },
  hit(at = 0) {
    const c = audio();
    if (!c) return;
    noise(c, at, 0.6, 0.8, 'lowpass', 1600, 90);
    tone(c, 80, at, 0.5, 'sine', 0.3, 40);
  },
  sink() {
    const c = audio();
    if (!c) return;
    tone(c, 300, 0.3, 1.2, 'sawtooth', 0.05, 60);
    noise(c, 0.3, 1.2, 0.3, 'lowpass', 600, 80);
  },
  radar() {
    const c = audio();
    if (c) [0, 0.35].forEach((t) => tone(c, 1400, t, 0.3, 'sine', 0.08, 1100));
  },
  torpedo() {
    const c = audio();
    if (c) noise(c, 0, 0.9, 0.3, 'bandpass', 300, 1500);
  },
  power() {
    const c = audio();
    if (c) [784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.07, 0.16, 'triangle', 0.08));
  },
};
