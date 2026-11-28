// Small Web Audio helpers for the party games' sounds (no files): tones and noise bursts
import { liveAudio } from '../../lib/sounds';
import { isSoundOn } from '../../lib/speech';

export const audio = () => (isSoundOn() ? liveAudio() : null);

/** one note; attack is the fade-in time in seconds */
export function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = 0.1, to?: number, attack = 0.015) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** tone with a game's own fade-in and default loudness */
export const toneWith =
  (attack: number, defaultGain = 0.1) =>
  (c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = 'sine', gain = defaultGain, to?: number) =>
    tone(c, freq, at, dur, type, gain, to, attack);

/** a burst of filtered noise: thuds (lowpass), scratches and whooshes (bandpass / highpass) */
export function noise(c: AudioContext, at: number, dur: number, gain: number, type: BiquadFilterType, freq: number, toFreq?: number) {
  const t = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (toFreq) f.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}
