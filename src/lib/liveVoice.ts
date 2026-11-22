import { useSyncExternalStore } from 'react';
import type { LiveVoiceJoin, RoomView, RtcSignal } from '../types';
import { request, socket } from './socket';
import { mutedMember, onMuteChange } from './mute';

/**
 * Live voice: phones talk to each other directly (WebRTC, one connection per other seated player in voice); the server only
 * passes each pair one offer and one answer. Problems never pop up: a seat shows 🔇, reconnects happen quietly, and at most one
 * short line per room says this network can't connect.
 */

/** a peer still not connected after this long shows 🔇 on its seat */
const STUCK_MS = 8_000;
/** with the mic on and nobody reached after this long, the one quiet line shows (once per room) */
const NOTICE_MS = 10_000;
/** how long to wait for this phone's network routes before sending an offer or answer anyway */
const GATHER_MS = 2_500;
/** quiet retries after a dropped connection: 2 s, 4 s, 8 s … up to 30 s */
const RETRY_MIN_MS = 2_000;
const RETRY_MAX_MS = 30_000;
/** a "disconnected" connection often comes back by itself; give it this long first */
const DISCONNECT_GRACE_MS = 5_000;

type PeerState = 'connecting' | 'connected' | 'failed';

interface Peer {
  pc: RTCPeerConnection | null;
  audio: HTMLAudioElement | null;
  state: PeerState;
  since: number;
  retries: number;
  timer?: number;
}

export interface LiveVoiceSnapshot {
  hear: boolean;
  mic: boolean;
  /** busy turning something on (asking for the mic, joining) */
  busy: boolean;
  /** other players in voice this phone can't hear right now */
  stuck: string[];
  /** the one quiet line, or null */
  notice: string | null;
}

let hear = false;
/** this room: the player turned 🔊 off themselves, so it stays off here (a new room or a new app start turns it on again) */
let hearOffHere = false;
/** this room: 🔊 was already turned on by itself once (it never retries in a loop) */
let autoHeard = false;
let mic = false;
let busy = false;
let joining = false;
let lastRejoin = 0;
let iceServers: RTCIceServer[] = [];
let meId: string | null = null;
let roomCode: string | null = null;
/** the room as last seen, to sync again right after turning on (its state can arrive before the server's answer) */
let lastView: RoomView | null = null;
let micStream: MediaStream | null = null;
/** other players the server says are in voice */
let others: string[] = [];
const peers = new Map<string, Peer>();
let notice: string | null = null;
let noticeUsed = false;
let noticeTimer: number | undefined;
let tick: number | undefined;

const listeners = new Set<() => void>();
let snapshot: LiveVoiceSnapshot = { hear, mic, busy, stuck: [], notice };

const isOn = () => hear || mic;

function emit(): void {
  const now = Date.now();
  const stuck = isOn()
    ? others.filter((id) => {
        const p = peers.get(id);
        return !p || p.state === 'failed' || (p.state === 'connecting' && now - p.since > STUCK_MS);
      })
    : [];
  snapshot = { hear, mic, busy, stuck, notice };
  listeners.forEach((l) => l());
  // stuck marks depend on time, so check again every couple of seconds while voice is on
  if (isOn() && tick === undefined) tick = window.setInterval(emit, 2_000);
  if (!isOn() && tick !== undefined) {
    window.clearInterval(tick);
    tick = undefined;
  }
}

/** the hidden home of the players' audio, kept across screens */
function audioHome(): HTMLElement {
  let el = document.getElementById('live-voice-audio');
  if (!el) {
    el = document.createElement('div');
    el.id = 'live-voice-audio';
    el.hidden = true;
    document.body.appendChild(el);
  }
  return el;
}

function closePeer(id: string): void {
  const p = peers.get(id);
  if (!p) return;
  window.clearTimeout(p.timer);
  p.pc?.close();
  if (p.audio) {
    p.audio.srcObject = null;
    p.audio.remove();
  }
  peers.delete(id);
}

function closeAll(): void {
  for (const id of [...peers.keys()]) closePeer(id);
}

function stopMic(): void {
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
}

/** the side with the smaller id sends the offer, so two phones never offer at once */
const iOffer = (id: string) => meId !== null && meId < id;

/** waits until this phone knows its network routes (or a short time passes), so one message carries them all */
function gathered(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      window.clearTimeout(t);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    const t = window.setTimeout(done, GATHER_MS);
    pc.addEventListener('icegatheringstatechange', check);
  });
}

/** a fresh connection to one player, replacing any old one */
function newPeer(id: string): Peer {
  const old = peers.get(id);
  const retries = old?.retries ?? 0;
  closePeer(id);
  const pc = new RTCPeerConnection({ iceServers });
  const audio = document.createElement('audio');
  audio.autoplay = true;
  audio.setAttribute('playsinline', '');
  audio.muted = !hear || mutedMember(lastView, id);
  audioHome().appendChild(audio);
  const peer: Peer = { pc, audio, state: 'connecting', since: Date.now(), retries };
  peers.set(id, peer);

  pc.ontrack = (e) => {
    audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
    void audio.play().catch(() => undefined);
  };
  pc.onconnectionstatechange = () => {
    if (peers.get(id) !== peer) return;
    const s = pc.connectionState;
    if (s === 'connected') {
      peer.state = 'connected';
      peer.retries = 0;
      window.clearTimeout(peer.timer);
      // someone is reachable: the quiet line can go
      notice = null;
    } else if (s === 'failed') {
      peer.state = 'failed';
      retryLater(id, peer, 0);
    } else if (s === 'disconnected') {
      // often comes back by itself; only then try again
      retryLater(id, peer, DISCONNECT_GRACE_MS);
    }
    emit();
  };
  return peer;
}

/** tries a dropped connection again, quietly, waiting longer each time; only the offering side starts it */
function retryLater(id: string, peer: Peer, extra: number): void {
  if (!iOffer(id)) return;
  window.clearTimeout(peer.timer);
  const wait = extra + Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** peer.retries);
  peer.timer = window.setTimeout(() => {
    if (peers.get(id) !== peer || !isOn() || !others.includes(id)) return;
    if (peer.pc?.connectionState === 'connected') return;
    peer.retries++;
    void offerTo(id);
  }, wait);
}

/** the mic's track on a connection's sender, or silence while the mic is off */
async function sendMic(pc: RTCPeerConnection): Promise<void> {
  const track = micStream?.getAudioTracks()[0] ?? null;
  for (const t of pc.getTransceivers()) await t.sender.replaceTrack(track).catch(() => undefined);
}

async function offerTo(id: string): Promise<void> {
  const peer = newPeer(id);
  const pc = peer.pc!;
  try {
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    await sendMic(pc);
    await pc.setLocalDescription(await pc.createOffer());
    await gathered(pc);
    if (peers.get(id) !== peer || !pc.localDescription) return;
    await request('rtc:signal', { to: id, sdp: { type: 'offer', sdp: pc.localDescription.sdp } });
  } catch {
    if (peers.get(id) === peer) {
      peer.state = 'failed';
      retryLater(id, peer, 0);
      emit();
    }
  }
}

async function onSignal(s: RtcSignal): Promise<void> {
  if (!isOn() || !others.includes(s.from)) return;
  if (s.sdp.type === 'offer') {
    const peer = newPeer(s.from);
    const pc = peer.pc!;
    try {
      await pc.setRemoteDescription(s.sdp);
      for (const t of pc.getTransceivers()) t.direction = 'sendrecv';
      await sendMic(pc);
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      if (peers.get(s.from) !== peer || !pc.localDescription) return;
      await request('rtc:signal', { to: s.from, sdp: { type: 'answer', sdp: pc.localDescription.sdp } });
    } catch {
      if (peers.get(s.from) === peer) peer.state = 'failed';
      emit();
    }
    return;
  }
  const pc = peers.get(s.from)?.pc;
  if (pc && pc.signalingState === 'have-local-offer') await pc.setRemoteDescription(s.sdp).catch(() => undefined);
}

socket.on('rtc:signal', (s: RtcSignal) => void onSignal(s));

/** asks the server to put this player in voice (and says whether the mic is on); how to reach the others comes back */
async function join(withMic = mic): Promise<void> {
  joining = true;
  try {
    const res = await request<LiveVoiceJoin>('voice:live', { on: true, mic: withMic });
    iceServers = res.iceServers;
  } finally {
    joining = false;
  }
}

/** everything off on this phone; tells the server too unless it already knows */
function turnOff(tellServer: boolean): void {
  hear = false;
  mic = false;
  stopMic();
  closeAll();
  others = [];
  notice = null;
  window.clearTimeout(noticeTimer);
  if (tellServer) void request('voice:live', { on: false }).catch(() => undefined);
}

/** after the mic has been on a while with nobody reached, the one quiet line (once per room) */
function watchForNotice(): void {
  window.clearTimeout(noticeTimer);
  if (noticeUsed) return;
  noticeTimer = window.setTimeout(() => {
    const anyone = [...peers.values()].some((p) => p.state === 'connected');
    if (mic && others.length > 0 && !anyone) {
      notice = "Voice can't connect on this network";
      noticeUsed = true;
      emit();
    }
  }, NOTICE_MS);
}

// 🔊 can come on by itself before any tap, and a phone may hold the sound back until one: the first tap starts it
if (typeof document !== 'undefined') {
  const unlock = () => {
    if (!hear) return;
    for (const p of peers.values()) if (p.audio && !p.audio.muted) void p.audio.play().catch(() => undefined);
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
}

// muting or unmuting someone takes effect on their sound at once
onMuteChange(() => {
  for (const [id, p] of peers) if (p.audio) p.audio.muted = !hear || mutedMember(lastView, id);
});

/** 🔊 hearing the others on or off; an error message to show, or null */
export async function setHear(on: boolean, auto = false): Promise<string | null> {
  if (busy) return null;
  // the player's own choice to stop hearing holds for this room
  if (!auto) hearOffHere = !on;
  try {
    busy = on && !isOn();
    emit();
    if (on && !isOn()) await join();
    hear = on;
    for (const [id, p] of peers) {
      if (!p.audio) continue;
      p.audio.muted = !hear || mutedMember(lastView, id);
      // this tap lets the phone start the sound
      if (hear) void p.audio.play().catch(() => undefined);
    }
    if (!isOn()) turnOff(true);
    else syncLiveVoice(lastView);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Could not turn voice on';
  } finally {
    busy = false;
    emit();
  }
}

/** 🎙️ talking on or off; an error message to show, or null */
export async function setMic(on: boolean): Promise<string | null> {
  if (busy) return null;
  try {
    if (on) {
      busy = true;
      emit();
      if (!navigator.mediaDevices?.getUserMedia) return 'This browser can’t use the mic';
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      } catch {
        return 'Allow the microphone to talk';
      }
      // in voice already: just tell everyone the mic is on; otherwise join with it on
      if (!isOn()) await join(true);
      else await request('voice:live', { on: true, mic: true });
      mic = true;
      watchForNotice();
    } else {
      mic = false;
      stopMic();
      window.clearTimeout(noticeTimer);
      notice = null;
      // still listening: everyone sees the mic is off
      if (hear) await request('voice:live', { on: true, mic: false }).catch(() => undefined);
    }
    for (const p of peers.values()) if (p.pc) await sendMic(p.pc);
    if (!isOn()) turnOff(true);
    else syncLiveVoice(lastView);
    return null;
  } catch (err) {
    if (!mic) stopMic();
    return err instanceof Error ? err.message : 'Could not turn the mic on';
  } finally {
    busy = false;
    emit();
  }
}

/** follows the room: connects to players who join voice, drops those who leave it, and turns off when this player can't be in it */
export function syncLiveVoice(view: RoomView | null): void {
  lastView = view;
  if (!view || view.code !== roomCode) {
    // another room, or none: start over
    if (isOn()) turnOff(!!view);
    roomCode = view?.code ?? null;
    noticeUsed = false;
    hearOffHere = false;
    autoHeard = false;
  }
  if (!view) {
    emit();
    return;
  }
  meId = view.meId;
  if (!isOn()) {
    // 🔊 is on by default: once per room for a seated, logged-in player while the room allows voice (the mic stays off)
    const seat = view.players.find((p) => p.id === meId);
    if (!autoHeard && !hearOffHere && !busy && !joining && seat?.registered && view.config.voice) {
      autoHeard = true;
      void setHear(true, true);
    }
    emit();
    return;
  }
  const me = view.players.find((p) => p.id === meId);
  // watching now, logged out, or the host turned voice off: off here too
  if (!me || !me.registered || !view.config.voice) {
    turnOff(false);
    emit();
    return;
  }
  // the server dropped us (a reconnect starts with voice off): ask again, quietly, now and then
  if (!me.live) {
    if (!joining && Date.now() - lastRejoin > 5_000) {
      lastRejoin = Date.now();
      void join().catch(() => undefined);
    }
    closeAll();
    others = [];
    emit();
    return;
  }
  others = view.players.filter((p) => p.live && p.id !== meId).map((p) => p.id);
  for (const id of [...peers.keys()]) if (!others.includes(id)) closePeer(id);
  for (const id of others) {
    if (peers.has(id)) continue;
    if (iOffer(id)) void offerTo(id);
    // the other side offers: wait for it, counting the time from now
    else peers.set(id, { pc: null, audio: null, state: 'connecting', since: Date.now(), retries: 0 });
  }
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useLiveVoice(): LiveVoiceSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
