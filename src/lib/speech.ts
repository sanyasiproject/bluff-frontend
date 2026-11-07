import { loadPref, savePref } from './storage';

export type VoiceGender = 'female' | 'male';

// Uses the browser's built-in text-to-speech, so no audio files or paid service
const synth: SpeechSynthesis | null = 'speechSynthesis' in window ? window.speechSynthesis : null;

// Browsers don't expose a voice's gender, so match well-known voice names (iPhone, Android, Mac, Windows, Chrome)
const FEMALE =
  /female|woman|samantha|veena|lekha|heera|neerja|swara|kalpana|aditi|raveena|zira|karen|moira|tessa|fiona|serena|victoria|allison|\bava\b|susan|kate|hazel|catherine|libby|sonia|jenny|aria|google us english|google हिन्दी/i;
const MALE =
  /\bmale\b|rishi|\bravi\b|prabhat|hemant|madhur|daniel|\balex\b|fred|david|\bmark\b|james|george|ryan|\bguy\b|\btom\b|aaron|arthur|gordon|oliver|ralph/i;
// Apple's novelty voices sound silly for announcements
const NOVELTY =
  /bad news|good news|bells|boing|bubbles|cellos|wobble|zarvox|trinoids|whisper|jester|organ|superstar|albert|bahh|grandma|grandpa|junior|eddy|\bflo\b|reed|rocko|sandy|shelley/i;
const LANGS = ['en-IN', 'en-GB', 'en-US', 'en', 'hi-IN'];

let gender: VoiceGender = loadPref('voice') === 'male' ? 'male' : 'female';
let voice: SpeechSynthesisVoice | null = null;
let enabled = loadPref('sound') !== 'off';
let unlocked = false;
let queued = 0;
const listeners = new Set<() => void>();

function genderOf(v: SpeechSynthesisVoice): VoiceGender | null {
  if (FEMALE.test(v.name)) return 'female';
  if (MALE.test(v.name)) return 'male';
  return null;
}

function langRank(v: SpeechSynthesisVoice): number {
  const lang = v.lang.replace('_', '-');
  const i = LANGS.findIndex((l) => (l.length === 2 ? lang.startsWith(l) : lang === l));
  return i === -1 ? 99 : i;
}

/** wanted gender first, then unknown, then the other; Indian English before other English */
function pickVoice(): void {
  const genderRank = (v: SpeechSynthesisVoice) => {
    const g = genderOf(v);
    return g === gender ? 0 : g === null ? 1 : 2;
  };
  const voices = (synth?.getVoices() ?? []).filter((v) => langRank(v) < 99 && !NOVELTY.test(v.name));
  voices.sort((a, b) => genderRank(a) - genderRank(b) || langRank(a) - langRank(b));
  voice = voices[0] ?? null;
}

/** nudges pitch when no voice of the wanted gender exists on this phone */
function pitch(): number {
  const g = voice ? genderOf(voice) : null;
  if (g === gender) return 1;
  if (g === null) return gender === 'female' ? 1.1 : 0.9;
  return gender === 'female' ? 1.3 : 0.75;
}

if (synth) {
  pickVoice();
  synth.onvoiceschanged = () => {
    pickVoice();
    listeners.forEach((fn) => fn());
  };
}

export const speechSupported = synth !== null;

export const isSoundOn = () => enabled;

export function setSoundOn(on: boolean): void {
  enabled = on;
  savePref('sound', on ? 'on' : 'off');
  if (!on) synth?.cancel();
}

export const getVoiceGender = () => gender;

export function setVoiceGender(next: VoiceGender): void {
  gender = next;
  savePref('voice', next);
  pickVoice();
}

export const currentVoiceName = () => voice?.name ?? null;

/** returns an unsubscribe function; voices load late on some browsers */
export function onVoicesChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** iPhones only allow speech after a tap, so speak a silent line on the first tap */
export function unlockSpeech(): void {
  if (!synth || unlocked) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

/** force plays even when muted (used by the voice test button) */
export function speak(text: string, force = false): void {
  if (!synth || (!enabled && !force)) return;
  // drop a backlog so the voice never lags far behind the table
  if (queued >= 3) {
    synth.cancel();
    queued = 0;
  }
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-IN';
  u.pitch = pitch();
  u.rate = 1.05;
  u.onend = u.onerror = () => {
    queued = Math.max(0, queued - 1);
  };
  queued++;
  synth.speak(u);
}
