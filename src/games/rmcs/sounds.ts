// Raja Mantri sounds made with Web Audio (no files): chits dealt, a chit unfolding, the Raja's fanfare, the siren, the Chor's escape, points
import { audio, toneWith } from '../turnkit/audio';

const tone = toneWith(0.02);

/** a paper flick: a short burst of bright noise */
function flick(c: AudioContext, at: number, gain = 0.3, dur = 0.06) {
  const t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 2400;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const rmcsSfx = {
  /** four chits dealt round the table */
  deal() {
    const c = audio();
    if (c) [0, 0.12, 0.24, 0.36].forEach((t) => flick(c, t, 0.35));
  },
  /** my chit unfolding: a rustle */
  unfold() {
    const c = audio();
    if (!c) return;
    flick(c, 0, 0.3, 0.1);
    flick(c, 0.12, 0.25, 0.14);
  },
  /** the Raja shows himself: a little fanfare */
  raja() {
    const c = audio();
    if (c) [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.1, i === 3 ? 0.6 : 0.16, 'square', 0.05));
  },
  /** caught: a two-tone police siren */
  siren() {
    const c = audio();
    if (c) for (let i = 0; i < 4; i++) tone(c, i % 2 ? 660 : 880, i * 0.28, 0.27, 'sawtooth', 0.045);
  },
  /** the Chor got away: a cheeky falling whistle */
  escape() {
    const c = audio();
    if (!c) return;
    tone(c, 1200, 0, 0.25, 'triangle', 0.08, 1600);
    tone(c, 1500, 0.28, 0.5, 'triangle', 0.08, 300);
  },
  /** points landing on a score */
  points() {
    const c = audio();
    if (c) [1319, 1568].forEach((f, i) => tone(c, f, i * 0.06, 0.12, 'triangle', 0.06));
  },
};
