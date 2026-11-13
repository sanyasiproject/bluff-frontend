import { isSoundOn } from './speech';

// Short game sounds made with Web Audio, so there are no sound files to download
type AudioCtor = typeof AudioContext;
const Ctor: AudioCtor | undefined =
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;

let ctx: AudioContext | null = null;

/** phones only allow sound after a tap, so the audio starts (or resumes) on a tap */
export function unlockAudio(): void {
  if (!Ctor) return;
  ctx ??= new Ctor();
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

function audio(): AudioContext | null {
  return isSoundOn() && ctx?.state === 'running' ? ctx : null;
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  /** slide to this pitch by the end */
  to?: number;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, { type = 'sine', gain = 0.16, to }: ToneOptions = {}) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** a short burst of filtered noise, like a card hitting the table */
function slap(c: AudioContext, at: number, gain = 0.55) {
  const t = c.currentTime + at;
  const length = Math.floor(c.sampleRate * 0.07);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1600;
  filter.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
}

const notes = (c: AudioContext, freqs: number[], step: number, dur: number, opts?: ToneOptions) =>
  freqs.forEach((f, i) => tone(c, f, i * step, dur, opts));

export const sfx = {
  /** cards put down; one slap per card, up to four */
  play(count: number) {
    const c = audio();
    if (c) for (let i = 0; i < Math.min(count, 4); i++) slap(c, i * 0.07);
  },
  pass() {
    const c = audio();
    if (c) tone(c, 420, 0, 0.12, { type: 'triangle', gain: 0.08, to: 300 });
  },
  turn() {
    const c = audio();
    if (c) notes(c, [880, 1320], 0.09, 0.16, { gain: 0.12 });
  },
  deal() {
    const c = audio();
    if (c) for (let i = 0; i < 8; i++) slap(c, i * 0.06, 0.35);
  },
  caught() {
    const c = audio();
    if (c) {
      tone(c, 200, 0, 0.22, { type: 'sawtooth', gain: 0.1 });
      tone(c, 150, 0.24, 0.4, { type: 'sawtooth', gain: 0.1, to: 110 });
    }
  },
  truth() {
    const c = audio();
    if (c) notes(c, [660, 990], 0.1, 0.3, { gain: 0.12 });
  },
  win() {
    const c = audio();
    if (c) notes(c, [523, 659, 784, 1047], 0.11, 0.32, { type: 'triangle', gain: 0.14 });
  },
  lose() {
    const c = audio();
    if (c) notes(c, [392, 330, 262], 0.18, 0.4, { type: 'triangle', gain: 0.12 });
  },
  /** Crazy 7: a 7 hits the pile, a short sting */
  seven() {
    const c = audio();
    if (c) {
      slap(c, 0, 0.6);
      notes(c, [784, 1175, 1568], 0.07, 0.22, { type: 'square', gain: 0.07 });
      tone(c, 220, 0.18, 0.3, { type: 'sawtooth', gain: 0.08, to: 140 });
    }
  },
  /** Crazy 7: a card slides off the deck */
  draw() {
    const c = audio();
    if (c) {
      slap(c, 0, 0.3);
      tone(c, 520, 0.02, 0.1, { type: 'triangle', gain: 0.05, to: 700 });
    }
  },
  /** Crazy 7: the pile is shuffled back into the deck, a quick riffle */
  shuffle() {
    const c = audio();
    if (c) for (let i = 0; i < 10; i++) slap(c, i * 0.035, 0.22);
  },
  /** Crazy 7: someone said "last card", a bright bell */
  lastCard() {
    const c = audio();
    if (c) notes(c, [1319, 1760, 2093], 0.09, 0.5, { type: 'sine', gain: 0.11 });
  },
  /** host only: someone is at the door asking to watch */
  knock() {
    const c = audio();
    if (c) notes(c, [988, 1319, 988], 0.12, 0.18, { type: 'sine', gain: 0.1 });
  },
};
