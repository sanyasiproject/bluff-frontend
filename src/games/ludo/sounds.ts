// Ludo sounds made with Web Audio (no files): dice roll, goti hop, kill, home
import { audio, toneWith } from '../turnkit/audio';

const tone = toneWith(0.01, 0.12);

/** a short knock of filtered noise: dice on wood */
function knock(c: AudioContext, at: number, gain: number, freq: number) {
  const t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * 0.05);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const ludoSfx = {
  /** dice rattling, then landing */
  roll() {
    const c = audio();
    if (!c) return;
    for (let i = 0; i < 7; i++) knock(c, i * 0.075 + Math.random() * 0.02, 0.5 - i * 0.04, 900 + Math.random() * 900);
    knock(c, 0.62, 0.7, 700);
  },
  /** a six: a bright little lift */
  six() {
    const c = audio();
    if (c) [784, 1047, 1319].forEach((f, i) => tone(c, f, 0.62 + i * 0.07, 0.2, 'triangle', 0.08));
  },
  /** one goti hop; pitch climbs along the path */
  hop(step: number) {
    const c = audio();
    if (!c) return;
    knock(c, 0, 0.35, 1800);
    tone(c, 520 + Math.min(step, 12) * 28, 0, 0.08, 'triangle', 0.05);
  },
  /** a goti knocked back to its base: a thump and a falling whoosh */
  kill() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 0.9, 300);
    tone(c, 180, 0, 0.3, 'sawtooth', 0.09, 70);
    tone(c, 1200, 0.05, 0.5, 'triangle', 0.05, 200);
  },
  /** a goti reached home: a happy chord */
  home() {
    const c = audio();
    if (c) [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.06, 0.4, 'triangle', 0.09));
  },
  /** three sixes: a sad buzz */
  bust() {
    const c = audio();
    if (c) [330, 262, 196].forEach((f, i) => tone(c, f, i * 0.14, 0.26, 'square', 0.05));
  },
};
