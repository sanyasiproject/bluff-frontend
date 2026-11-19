import { VOICE_MAX_BYTES, VOICE_MAX_MS } from '../types';
import { liveAudio } from './sounds';
import { isSoundOn } from './speech';
import { loadPref, savePref } from './storage';

// Voice notes: recorded with the phone's own recorder, sent once, played with Web Audio, never saved anywhere

/** formats to record in, best first: AAC in mp4 plays on iPhones and Android alike; Opus may not play on older iPhones */
const FORMATS = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

const recordFormat = (): string | null => {
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;
  return FORMATS.find((f) => MediaRecorder.isTypeSupported(f)) ?? null;
};

export const canRecord = () => recordFormat() !== null;

/** a finished recording */
export interface Clip {
  audio: ArrayBuffer;
  mime: string;
  ms: number;
}

/** shorter than this is taken as a tap, not a note */
export const MIN_CLIP_MS = 600;

/** one recording: start on press, stop on release (or at the limit), or cancel */
export class Recording {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private size = 0;
  private startedAt = 0;
  private timer = 0;
  private done: Promise<Clip | null> | null = null;
  private cancelled = false;

  /** asks for the mic (the first time the phone asks the player) and starts; throws when the mic can't be used */
  async start(onLimit: () => void): Promise<void> {
    const format = recordFormat();
    if (!format) throw new Error("This phone can't record voice notes");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      throw new Error(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Allow the mic for this site to send voice notes' : 'Could not use the mic');
    }
    // let go or cancelled while the phone was asking
    if (this.cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: format, audioBitsPerSecond: 32_000 });
    } catch {
      this.release();
      throw new Error("This phone can't record voice notes");
    }
    this.recorder = recorder;
    this.done = new Promise((resolve) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;
        this.chunks.push(e.data);
        this.size += e.data.size;
        // close to the size limit: stop here, like reaching the time limit
        if (this.size > VOICE_MAX_BYTES * 0.9 && recorder.state === 'recording') onLimit();
      };
      recorder.onstop = async () => {
        const ms = Math.min(Date.now() - this.startedAt, VOICE_MAX_MS);
        this.release();
        if (this.cancelled || ms < MIN_CLIP_MS || this.size === 0 || this.size > VOICE_MAX_BYTES) return resolve(null);
        const blob = new Blob(this.chunks, { type: recorder.mimeType || format });
        resolve({ audio: await blob.arrayBuffer(), mime: blob.type || format, ms });
      };
    });
    this.startedAt = Date.now();
    try {
      recorder.start(250);
    } catch {
      this.recorder = null;
      this.release();
      throw new Error('Could not use the mic');
    }
    this.timer = window.setTimeout(onLimit, VOICE_MAX_MS);
  }

  /** went over the size limit, so it can't be sent */
  get tooBig(): boolean {
    return this.size > VOICE_MAX_BYTES;
  }

  /** how long it has been recording */
  elapsed(): number {
    return this.startedAt ? Date.now() - this.startedAt : 0;
  }

  get recording(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** the clip, or null when it was too short, too big or never started */
  async stop(): Promise<Clip | null> {
    if (!this.recorder || !this.done) {
      this.cancelled = true;
      return null;
    }
    if (this.recorder.state !== 'inactive') this.recorder.stop();
    return this.done;
  }

  cancel(): void {
    this.cancelled = true;
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    else this.release();
  }

  /** the mic light goes off as soon as it's done */
  private release(): void {
    window.clearTimeout(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

// ---- hearing other people's notes ----

const HEAR_KEY = 'voiceNotes';
const MUTED_KEY = 'voiceMuted';

/** off: other people's voice notes are not played on this phone */
export const isHearingVoice = () => loadPref(HEAR_KEY) !== 'off';
export const setHearingVoice = (on: boolean) => {
  savePref(HEAR_KEY, on ? 'on' : 'off');
  if (!on) stopVoice();
  emit();
};

function loadMuted(): Set<string> {
  try {
    const list = JSON.parse(loadPref(MUTED_KEY) ?? '[]') as unknown;
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

let muted = loadMuted();

/** muted by username, remembered on this phone across rooms */
export const isMuted = (username: string) => muted.has(username.toLowerCase());

export function setMuted(username: string, on: boolean): void {
  const key = username.toLowerCase();
  muted = loadMuted();
  if (on) muted.add(key);
  else muted.delete(key);
  savePref(MUTED_KEY, JSON.stringify([...muted]));
  if (on) {
    queue = queue.filter((w) => w.username?.toLowerCase() !== key);
    if (playing?.username?.toLowerCase() === key) skipVoice();
  }
  emit();
}

/** the note playing now, for the "🎤 Rahul" pill */
export interface Playing {
  key: number;
  name: string;
  username: string | null;
  ms: number;
  /** 'tap': waiting for the first tap, since phones only play sound after one; 'failed': this phone couldn't play it */
  problem: 'tap' | 'failed' | null;
}

interface Waiting {
  name: string;
  username: string | null;
  audio: ArrayBuffer;
  ms: number;
}

let queue: Waiting[] = [];
let playing: Playing | null = null;
let source: AudioBufferSourceNode | null = null;
let seq = 0;
let failTimer = 0;
/** a note held until the first tap lets sound play */
let held: Waiting | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

/** returns an unsubscribe function */
export function onVoiceChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const nowPlaying = () => playing;

/** plays a note from someone else, after any already waiting; a long backlog drops the newest */
const wanted = (w: Pick<Waiting, 'username'>) => isHearingVoice() && isSoundOn() && !(w.username && isMuted(w.username));

export function playVoice(name: string, username: string | null, audio: ArrayBuffer, ms: number): void {
  if (!wanted({ username }) || queue.length >= 3) return;
  queue.push({ name, username, audio, ms });
  if (!playing) void next();
}

/** after the first tap the held note plays */
function afterTap(): void {
  window.setTimeout(() => {
    if (!held) return;
    queue.unshift(held);
    held = null;
    void next();
  }, 100);
}

async function next(): Promise<void> {
  // switches may have changed since these came in
  queue = queue.filter(wanted);
  const item = queue.shift();
  if (!item) {
    playing = null;
    emit();
    return;
  }
  const key = ++seq;
  const ctx = liveAudio();
  if (!ctx) {
    // nobody has tapped yet: say so, and play it on the first tap
    held = item;
    playing = { key, name: item.name, username: item.username, ms: item.ms, problem: 'tap' };
    window.addEventListener('pointerup', afterTap, { once: true });
    emit();
    return;
  }
  playing = { key, name: item.name, username: item.username, ms: item.ms, problem: null };
  emit();
  try {
    // decodeAudioData takes over the buffer, so it gets a copy
    const buffer = await ctx.decodeAudioData(item.audio.slice(0));
    if (playing?.key !== key) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => {
      if (source === src) source = null;
      if (playing?.key === key) void next();
    };
    source = src;
    src.start();
  } catch {
    if (playing?.key !== key) return;
    // shown for a moment so the player knows a note came
    playing = { ...playing, problem: 'failed' };
    emit();
    window.clearTimeout(failTimer);
    failTimer = window.setTimeout(() => {
      if (playing?.key === key) void next();
    }, 2500);
  }
}

/** stops the note playing and drops the rest */
export function stopVoice(): void {
  queue = [];
  held = null;
  window.removeEventListener('pointerup', afterTap);
  const src = source;
  source = null;
  playing = null;
  try {
    src?.stop();
  } catch {
    // already stopped
  }
  emit();
}

/** skips to the next note */
export function skipVoice(): void {
  held = null;
  window.removeEventListener('pointerup', afterTap);
  const src = source;
  source = null;
  try {
    src?.stop();
  } catch {
    // already stopped
  }
  void next();
}
