// Arcade sounds made with Web Audio (no files): Fruit Slice Duel's swoosh, squish, magnet, pop and countdown (Spike Attack reuses the helpers)
import { audio, toneWith } from '../turnkit/audio';

export { audio };

/** Fruit's notes fade in over 10 ms */
export const tone = toneWith(0.01);

/** filtered noise: a swoosh (sweeping band) or a thump (low) */
export function noise(c: AudioContext, at: number, dur: number, gain: number, type: BiquadFilterType, from: number, to?: number) {
  const t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.5);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

let lastSwoosh = 0;

export const fruitSfx = {
  /** the blade through the air (at most every 120 ms) */
  swoosh() {
    const c = audio();
    if (!c || performance.now() - lastSwoosh < 120) return;
    lastSwoosh = performance.now();
    noise(c, 0, 0.16, 0.22, 'bandpass', 900, 4200);
  },
  /** steel meeting the fruit: a bright metallic ring */
  shing() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.08, 0.25, 'highpass', 6000, 9000);
    tone(c, 2400, 0, 0.35, 'sine', 0.05, 2200);
    tone(c, 3600, 0.01, 0.25, 'sine', 0.025, 3400);
  },
  /** a fruit cut: a wet squish and a little pop */
  slice(pitch = 1) {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.12, 0.35, 'bandpass', 2600 * pitch, 700);
    tone(c, 520 * pitch, 0, 0.09, 'triangle', 0.06, 260 * pitch);
  },
  /** a bomb: a low boom and a crackle */
  bomb() {
    const c = audio();
    if (!c) return;
    noise(c, 0, 0.7, 0.9, 'lowpass', 900, 80);
    tone(c, 120, 0, 0.6, 'sawtooth', 0.12, 40);
  },
  /** a combo: a rising sparkle, longer for bigger combos */
  combo(n: number) {
    const c = audio();
    if (!c) return;
    [659, 784, 988, 1175, 1319, 1568].slice(0, Math.min(6, n)).forEach((f, i) => tone(c, f, i * 0.06, 0.18, 'triangle', 0.07));
  },
  /** an item pops onto the plate */
  pop() {
    const c = audio();
    if (c) tone(c, 380, 0, 0.12, 'sine', 0.08, 900);
  },
  /** a magnet struck: a buzzing zap and a sinking slide */
  magnet() {
    const c = audio();
    if (!c) return;
    tone(c, 110, 0, 0.45, 'sawtooth', 0.07, 70);
    tone(c, 900, 0.02, 0.35, 'square', 0.03, 200);
  },
  /** tapped before anything was there */
  early() {
    const c = audio();
    if (c) tone(c, 220, 0, 0.14, 'square', 0.04, 160);
  },
  /** 3-2-1 beeps, and a higher one for go */
  count(go = false) {
    const c = audio();
    if (c) tone(c, go ? 1047 : 660, 0, go ? 0.35 : 0.16, 'square', 0.05);
  },
  /** the last seconds: a quiet tick */
  tick() {
    const c = audio();
    if (c) tone(c, 1400, 0, 0.04, 'square', 0.025);
  },
  /** time's up */
  end() {
    const c = audio();
    if (c) [784, 659, 523].forEach((f, i) => tone(c, f, i * 0.12, 0.3, 'triangle', 0.08));
  },
};
