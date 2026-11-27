// Saanp Seedhi sounds made with Web Audio (no files): a snake's slide, a ladder climb, a bite and reaching 100
import { liveAudio } from '../../lib/sounds';
import { isSoundOn } from '../../lib/speech';

const ctx = () => (isSoundOn() ? liveAudio() : null);

function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.1, to?: number) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** a soft hiss of filtered noise */
function hiss(c: AudioContext, at: number, dur: number, gain: number) {
  const t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 3500;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const snakesSfx = {
  /** sliding down a snake: a hiss and a falling whistle */
  snake() {
    const c = ctx();
    if (!c) return;
    hiss(c, 0, 0.5, 0.25);
    tone(c, 900, 0.05, 0.8, 'triangle', 0.07, 160);
  },
  /** climbing a ladder: a quick rising run */
  ladder() {
    const c = ctx();
    if (c) [523, 587, 659, 784, 880, 1047].forEach((f, i) => tone(c, f, i * 0.08, 0.14, 'triangle', 0.07));
  },
  /** a bite: a snap and a bump */
  bite() {
    const c = ctx();
    if (!c) return;
    hiss(c, 0, 0.12, 0.4);
    tone(c, 220, 0.02, 0.25, 'sawtooth', 0.08, 90);
  },
  /** bounced off 100: a springy boing */
  bounce() {
    const c = ctx();
    if (c) tone(c, 300, 0, 0.35, 'sine', 0.12, 700);
  },
  /** reached 100 */
  finish() {
    const c = ctx();
    if (c) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.07, 0.45, 'triangle', 0.08));
  },
};
