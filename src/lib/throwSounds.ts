import { isSoundOn } from './speech';

// Sounds for thrown emoji and coin gifts, made with Web Audio (no sound files)
type AudioCtor = typeof AudioContext;
const Ctor: AudioCtor | undefined =
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;

let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
let hiss: AudioBuffer | null = null;

/** phones only allow sound after a tap; this context starts (or resumes) on any tap, like sounds.ts */
function unlock(): void {
  if (!Ctor) return;
  ctx ??= new Ctor();
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}
window.addEventListener('pointerdown', unlock, { capture: true, passive: true });

function audio(): AudioContext | null {
  if (!isSoundOn() || ctx?.state !== 'running') return null;
  if (!out) {
    // a gentle limiter so stacked hits (several throws at once) don't crackle
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -12;
    limit.knee.value = 8;
    limit.ratio.value = 8;
    limit.attack.value = 0.002;
    limit.release.value = 0.2;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    limit.connect(master).connect(ctx.destination);
    out = limit;
  }
  return ctx;
}

/** left/right position from a point on screen */
const panOf = (x: number) => Math.max(-0.7, Math.min(0.7, (x / Math.max(1, window.innerWidth)) * 2 - 1));

function chain(c: AudioContext, pan: number | undefined, nodes: AudioNode[]): void {
  let last = nodes[0];
  for (const n of nodes.slice(1)) last = last.connect(n);
  if (pan !== undefined && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = pan;
    last = last.connect(p);
  }
  last.connect(out!);
}

interface Env {
  gain?: number;
  attack?: number;
  pan?: number;
}

/** sharp start, smooth fade */
function envelope(c: AudioContext, t: number, dur: number, { gain = 0.2, attack = 0.006 }: Env): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}

interface ToneOptions extends Env {
  type?: OscillatorType;
  /** slide to this pitch by the end */
  to?: number;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, o: ToneOptions = {}): void {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  chain(c, o.pan, [osc, envelope(c, t, dur, o)]);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

interface NoiseOptions extends Env {
  filter?: BiquadFilterType;
  freq?: number;
  /** slide the filter to this frequency by the end */
  to?: number;
  q?: number;
}

/** two seconds of white noise, made once and reused */
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!hiss) {
    hiss = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = hiss.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return hiss;
}

function noise(c: AudioContext, at: number, dur: number, o: NoiseOptions = {}): void {
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = o.filter ?? 'bandpass';
  f.frequency.setValueAtTime(o.freq ?? 1200, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  f.Q.value = o.q ?? 0.8;
  chain(c, o.pan, [src, f, envelope(c, t, dur, o)]);
  src.start(t, Math.random());
  src.stop(t + dur + 0.03);
}

/** the rush of air while something flies */
function whoosh(c: AudioContext, at: number, dur: number, from: number, to: number, gain = 0.22): void {
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.1;
  f.frequency.setValueAtTime(320, t);
  f.frequency.exponentialRampToValueAtTime(1500, t + dur * 0.55);
  f.frequency.exponentialRampToValueAtTime(600, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const nodes: AudioNode[] = [src, f, g];
  if (c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.setValueAtTime(from, t);
    p.pan.linearRampToValueAtTime(to, t + dur);
    nodes.push(p);
  }
  for (let i = 1; i < nodes.length; i++) nodes[i - 1].connect(nodes[i]);
  nodes[nodes.length - 1].connect(out!);
  src.start(t, Math.random());
  src.stop(t + dur + 0.03);
}

/** a short crack of noise plus a low knock: the body of every hit */
function thump(c: AudioContext, at: number, pan: number, weight = 1): void {
  tone(c, 170, at, 0.14, { to: 50, gain: 0.45 * weight, pan });
  noise(c, at, 0.07, { filter: 'lowpass', freq: 900, gain: 0.35 * weight, pan });
}

/** one hand clap: three quick noise bursts, like a drum machine clap */
function clapOnce(c: AudioContext, at: number, pan: number, gain: number): void {
  const freq = 1000 + Math.random() * 500;
  for (let i = 0; i < 3; i++) noise(c, at + i * 0.009, 0.022, { freq, q: 1.3, gain: gain * 0.7, pan });
  noise(c, at + 0.027, 0.09, { freq, q: 1.1, gain, pan });
}

/** a rough buzzing tone, shaken by a fast wobble: growls and flies */
function rumble(c: AudioContext, at: number, dur: number, from: number, to: number, rate: number, gain: number, filter: number, pan: number): void {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.linearRampToValueAtTime(to, t + dur);
  const lfo = c.createOscillator();
  lfo.frequency.value = rate;
  const depth = c.createGain();
  depth.gain.value = 0.5;
  const shake = c.createGain();
  shake.gain.value = 0.5;
  lfo.connect(depth).connect(shake.gain);
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  f.Q.value = 3;
  chain(c, pan, [osc, shake, f, envelope(c, t, dur, { gain, attack: 0.05 })]);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

/** a struck metal or glass ring: a few out-of-tune partials that fade slowly */
function ring(c: AudioContext, at: number, partials: number[], dur: number, gain: number, pan: number): void {
  partials.forEach((f, i) => tone(c, f, at, dur * (1 - i * 0.2), { gain: gain / (i + 1), attack: 0.002, pan }));
}

/** a buzzy voice through a vowel-like filter, with a wobble: screams, whimpers, "nyah"s, honks */
function voice(c: AudioContext, at: number, dur: number, from: number, to: number, vowel: number, gain: number, pan: number, wobble = 6): void {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.linearRampToValueAtTime(to, t + dur);
  const lfo = c.createOscillator();
  lfo.frequency.value = wobble;
  const depth = c.createGain();
  depth.gain.value = wobble ? from * 0.03 : 0;
  lfo.connect(depth).connect(osc.frequency);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = vowel;
  f.Q.value = 2.2;
  chain(c, pan, [osc, f, envelope(c, t, dur, { gain, attack: 0.03 })]);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

/** the sounds for each throw; x is where it lands on screen (for left/right) */
export const throwSfx = {
  launch(ms: number, fromX: number, toX: number) {
    const c = audio();
    if (c) whoosh(c, 0, ms / 1000, panOf(fromX), panOf(toX));
  },
  rose(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    thump(c, 0, pan, 0.4);
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(c, f, 0.04 + i * 0.07, 0.7, { type: 'triangle', gain: 0.07, pan }));
    for (let i = 0; i < 6; i++) tone(c, 2600 + Math.random() * 1800, 0.3 + i * 0.11, 0.09, { gain: 0.03, pan });
  },
  kiss(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // lips part with a smack, a rising "mwa", then a breathy end
    noise(c, 0, 0.03, { freq: 1500, q: 2, gain: 0.5, pan });
    tone(c, 360, 0.02, 0.16, { to: 950, gain: 0.2, pan });
    noise(c, 0.12, 0.12, { filter: 'highpass', freq: 3200, gain: 0.05, pan });
  },
  heart(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    tone(c, 784, 0, 0.3, { gain: 0.1, pan });
    tone(c, 1175, 0.11, 0.42, { gain: 0.1, pan });
  },
  clap(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a little round of applause: louder in the middle, uneven like real hands
    let at = 0;
    for (let i = 0; i < 14; i++) {
      const swell = Math.sin((i / 13) * Math.PI) * 0.6 + 0.4;
      clapOnce(c, at, pan + (Math.random() - 0.5) * 0.3, 0.42 * swell);
      at += 0.075 + Math.random() * 0.06;
    }
  },
  party(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // the popper pops, a party horn toots, confetti tinkles down
    noise(c, 0, 0.06, { filter: 'lowpass', freq: 2600, gain: 0.7, pan });
    tone(c, 240, 0, 0.09, { to: 80, gain: 0.4, pan });
    tone(c, 523, 0.06, 0.32, { type: 'sawtooth', to: 659, gain: 0.06, pan });
    tone(c, 784, 0.06, 0.32, { type: 'square', to: 988, gain: 0.025, pan });
    for (let i = 0; i < 9; i++) tone(c, 2200 + Math.random() * 2600, 0.15 + Math.random() * 0.8, 0.06, { gain: 0.035, pan });
  },
  laugh(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // five "ha"s falling in pitch: a buzzy voice through a vowel-like filter
    [330, 312, 295, 278, 262].forEach((f, i) => {
      const at = c.currentTime + i * 0.15;
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 1.08, at);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, at + 0.12);
      const vowel = c.createBiquadFilter();
      vowel.type = 'bandpass';
      vowel.frequency.value = 850;
      vowel.Q.value = 2.2;
      chain(c, pan, [osc, vowel, envelope(c, at, 0.13, { gain: 0.3, attack: 0.012 })]);
      osc.start(at);
      osc.stop(at + 0.16);
      noise(c, i * 0.15, 0.08, { freq: 1600, q: 1, gain: 0.05, pan });
    });
  },
  tomato(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a wet splat with a squelch, then a few drips
    noise(c, 0, 0.28, { filter: 'lowpass', freq: 1400, to: 260, gain: 0.85, attack: 0.002, pan });
    tone(c, 190, 0, 0.2, { to: 45, gain: 0.5, pan });
    noise(c, 0.03, 0.2, { freq: 700, to: 240, q: 4, gain: 0.3, pan });
    [0.55, 0.85, 1.2].forEach((at) => tone(c, 1300, at, 0.06, { to: 620, gain: 0.07, pan }));
  },
  egg(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // the shell cracks in quick clicks, then the inside splats
    [0, 0.022, 0.041, 0.066].forEach((at) => noise(c, at, 0.014, { filter: 'highpass', freq: 2600, gain: 0.5, attack: 0.001, pan }));
    noise(c, 0.07, 0.18, { filter: 'lowpass', freq: 1000, to: 300, gain: 0.45, pan });
    tone(c, 520, 0.1, 0.1, { to: 170, gain: 0.2, pan });
    [0.6, 0.95].forEach((at) => tone(c, 1200, at, 0.06, { to: 600, gain: 0.06, pan }));
  },
  fuse(x: number, ms: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    const dur = ms / 1000;
    noise(c, 0, dur, { filter: 'highpass', freq: 4500, gain: 0.07, attack: 0.05, pan });
    // three faster and faster beeps before it goes off
    [0.1, 0.55, 0.82].forEach((f) => tone(c, 1250, dur * f, 0.05, { type: 'square', gain: 0.05, pan }));
  },
  boom(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x) * 0.5;
    // a deep punch, a long rumble, a sharp crack and falling bits
    tone(c, 120, 0, 0.9, { to: 28, gain: 1, attack: 0.004, pan });
    noise(c, 0, 1.5, { filter: 'lowpass', freq: 1100, to: 110, gain: 0.95, attack: 0.003, pan });
    noise(c, 0, 0.16, { freq: 2200, q: 0.6, gain: 0.55, attack: 0.001, pan });
    for (let i = 0; i < 7; i++) noise(c, 0.25 + Math.random() * 0.8, 0.03, { filter: 'highpass', freq: 1800, gain: 0.12, pan: pan + (Math.random() - 0.5) });
  },
  /** one coin landing; each one a little higher */
  coin(i: number, x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    const f = 1760 * 2 ** (i / 12);
    tone(c, f, 0, 0.22, { type: 'triangle', gain: 0.1, pan });
    tone(c, f * 1.5, 0.02, 0.2, { gain: 0.05, pan });
  },
  kaching(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    noise(c, 0, 0.05, { freq: 3200, q: 1.2, gain: 0.3, pan });
    [1319, 1760, 2637].forEach((f, i) => tone(c, f, 0.04 + i * 0.03, 0.6, { type: 'triangle', gain: 0.07, pan }));
  },
  angry(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a "hmph", then a growl that rises and falls
    noise(c, 0, 0.09, { freq: 420, q: 1.5, gain: 0.35, pan });
    rumble(c, 0.06, 0.9, 85, 70, 24, 0.4, 750, pan);
    tone(c, 95, 0.06, 0.9, { type: 'square', to: 120, gain: 0.04, pan });
  },
  axe(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // the blade bites into wood with a crack, then the handle hums
    tone(c, 150, 0, 0.18, { to: 50, gain: 0.75, attack: 0.002, pan });
    noise(c, 0, 0.11, { filter: 'lowpass', freq: 650, gain: 0.6, attack: 0.001, pan });
    noise(c, 0, 0.03, { filter: 'highpass', freq: 2200, gain: 0.35, attack: 0.001, pan });
    ring(c, 0.02, [523, 1187, 2213], 0.9, 0.09, pan);
    rumble(c, 0.05, 0.7, 96, 92, 11, 0.06, 500, pan);
  },
  chappal(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a flat, sharp slap, a flap as it bounces off, a soft drop
    noise(c, 0, 0.07, { freq: 2600, q: 0.7, gain: 0.95, attack: 0.001, pan });
    noise(c, 0, 0.03, { filter: 'highpass', freq: 4200, gain: 0.4, attack: 0.001, pan });
    tone(c, 190, 0, 0.09, { to: 70, gain: 0.5, attack: 0.002, pan });
    noise(c, 0.22, 0.04, { freq: 1500, gain: 0.22, pan });
    tone(c, 150, 0.75, 0.08, { to: 60, gain: 0.22, pan });
  },
  punch(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a heavy hit, then cartoon birds tweeting round the head
    tone(c, 115, 0, 0.26, { to: 38, gain: 1, attack: 0.002, pan });
    noise(c, 0, 0.22, { filter: 'lowpass', freq: 1900, to: 200, gain: 0.8, attack: 0.001, pan });
    noise(c, 0, 0.05, { freq: 900, gain: 0.5, attack: 0.001, pan });
    for (let i = 0; i < 4; i++) tone(c, i % 2 ? 2600 : 2200, 0.38 + i * 0.13, 0.08, { to: i % 2 ? 3300 : 2900, gain: 0.05, pan });
  },
  poop(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a squelchy splat, a whiny "ewww", and flies buzzing
    noise(c, 0, 0.3, { filter: 'lowpass', freq: 900, to: 200, gain: 0.7, attack: 0.002, pan });
    noise(c, 0.02, 0.28, { freq: 700, to: 180, q: 7, gain: 0.4, pan });
    tone(c, 150, 0, 0.2, { to: 55, gain: 0.4, pan });
    tone(c, 640, 0.3, 0.55, { type: 'triangle', to: 330, gain: 0.07, pan });
    rumble(c, 0.35, 1.3, 190, 210, 31, 0.05, 520, pan);
  },
  cake(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a soft, creamy splat
    noise(c, 0, 0.26, { filter: 'lowpass', freq: 1200, to: 250, gain: 0.6, attack: 0.002, pan });
    tone(c, 160, 0, 0.15, { to: 60, gain: 0.35, pan });
    noise(c, 0.03, 0.18, { freq: 900, to: 300, q: 4, gain: 0.2, pan });
  },
  /** the candles blown out */
  candles(x: number) {
    const c = audio();
    if (c) noise(c, 0, 0.3, { filter: 'highpass', freq: 1800, to: 900, gain: 0.2, attack: 0.04, pan: panOf(x) });
  },
  clink(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // glass on glass, then the foam fizzing
    ring(c, 0, [2350, 3120, 4410], 0.5, 0.11, pan);
    noise(c, 0, 0.02, { filter: 'highpass', freq: 5000, gain: 0.25, attack: 0.001, pan });
    noise(c, 0.05, 0.55, { filter: 'highpass', freq: 6000, gain: 0.06, attack: 0.05, pan });
  },
  scream(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a sharp gasp, then a shaky "AAAA"
    noise(c, 0, 0.14, { filter: 'highpass', freq: 1800, to: 3600, gain: 0.18, attack: 0.08, pan });
    voice(c, 0.14, 0.62, 560, 650, 1150, 0.24, pan, 8);
    voice(c, 0.14, 0.62, 1120, 1300, 2400, 0.05, pan, 8);
  },
  plead(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a tiny whimper, then a soft "awww"
    voice(c, 0, 0.18, 880, 760, 1400, 0.07, pan, 9);
    voice(c, 0.22, 0.7, 640, 470, 900, 0.1, pan, 6);
    [2093, 2637].forEach((f, i) => tone(c, f, 0.12 + i * 0.1, 0.3, { gain: 0.03, pan }));
  },
  pray(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a soft shimmer, then a temple bell with each bow
    [1568, 2093].forEach((f, i) => tone(c, f, i * 0.06, 0.4, { gain: 0.025, pan }));
    [0.42, 0.92].forEach((at) => {
      ring(c, at, [880, 1763, 2645, 3570], 1.4, 0.08, pan);
      tone(c, 440, at, 1.2, { gain: 0.04, pan });
    });
  },
  tease(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // a raspberry, then "nyah nyah nya-nyah nyah"
    rumble(c, 0, 0.42, 110, 90, 32, 0.3, 900, pan);
    noise(c, 0, 0.4, { freq: 500, q: 1.5, gain: 0.08, pan });
    [784, 659, 880, 784, 659].forEach((f, i) => {
      const at = 0.5 + [0, 0.19, 0.38, 0.52, 0.74][i];
      voice(c, at, [0.16, 0.16, 0.12, 0.2, 0.32][i], f * 0.92, f, 1300, 0.12, pan, 5);
    });
  },
  clown(x: number) {
    const c = audio();
    if (!c) return;
    const pan = panOf(x);
    // honk honk on the red nose, a rubbery squeak, then a springy boing
    voice(c, 0, 0.16, 360, 390, 850, 0.3, pan, 0);
    voice(c, 0.2, 0.16, 410, 440, 900, 0.3, pan, 0);
    tone(c, 1300, 0.42, 0.12, { to: 2100, gain: 0.06, pan });
    voice(c, 0.55, 0.42, 240, 170, 600, 0.12, pan, 14);
  },
};

/** a small buzz on phones that can, for hits on this player */
export function buzz(pattern: number[]): void {
  if (!isSoundOn()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // some browsers throw when vibration is blocked
  }
}
