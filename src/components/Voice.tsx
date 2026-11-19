import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import { cx } from '../lib/cards';
import {
  canRecord,
  isHearingVoice,
  isMuted,
  MIN_CLIP_MS,
  nowPlaying,
  onVoiceChange,
  Recording,
  setHearingVoice,
  setMuted,
  skipVoice,
  type Clip,
} from '../lib/voice';
import { VOICE_GAP_MS, VOICE_MAX_MS, type RoomView } from '../types';

/** a finger slid this far up while recording means "cancel" */
const CANCEL_PX = 70;

const seconds = (ms: number) => `0:${String(Math.min(99, Math.floor(ms / 1000))).padStart(2, '0')}`;

type Phase = 'idle' | 'asking' | 'recording' | 'sending';

interface Props {
  view: RoomView;
  onSend: (clip: Clip) => Promise<unknown>;
  onToast: (text: string) => void;
}

/** 🎤 hold to record, let go to send; only while the host allows voice notes and the phone can record */
export function VoiceButton({ view, onSend, onToast }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [readyAt, setReadyAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const rec = useRef<Recording | null>(null);
  const startY = useRef(0);
  const cancelRef = useRef(false);
  const ending = useRef(false);
  /** when the mic was asked for: a slow answer means the phone asked the player */
  const askedAt = useRef(0);

  const me = [...view.players, ...view.watchers].find((p) => p.id === view.meId);
  const on = view.config.voice === true;

  // the wait after sending counts down on the button
  const waiting = readyAt > now;
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [waiting]);

  // the recording's clock
  useEffect(() => {
    if (phase !== 'recording') return;
    const t = setInterval(() => setElapsed(rec.current?.elapsed() ?? 0), 100);
    return () => clearInterval(t);
  }, [phase]);

  // leaving the room (or the host turning it off) drops a recording in progress
  useEffect(() => {
    if (on || !rec.current) return;
    rec.current.cancel();
    rec.current = null;
    ending.current = false;
    cancelRef.current = false;
    setCancelling(false);
    setElapsed(0);
    setPhase('idle');
  }, [on]);
  useEffect(() => () => rec.current?.cancel(), []);

  if (!on || !canRecord()) return null;

  const reset = () => {
    rec.current = null;
    ending.current = false;
    cancelRef.current = false;
    setCancelling(false);
    setElapsed(0);
    setPhase('idle');
  };

  /** let go, the time limit, or the size limit */
  const finish = async () => {
    const r = rec.current;
    if (!r || ending.current) return;
    ending.current = true;
    if (cancelRef.current) {
      r.cancel();
      reset();
      return;
    }
    const took = r.elapsed();
    const clip = await r.stop();
    if (!clip) {
      reset();
      if (r.tooBig) onToast('🎤 That note was too big to send. Try a shorter one');
      // a quick tap; a slow first ask is answered when the mic comes on
      else if (took > 0 ? took < MIN_CLIP_MS : Date.now() - askedAt.current < 1000) onToast('🎤 Hold the mic button to record');
      return;
    }
    setPhase('sending');
    try {
      await onSend(clip);
      setReadyAt(Date.now() + VOICE_GAP_MS);
      setNow(Date.now());
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not send the voice note');
    }
    reset();
  };

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || phase !== 'idle') return;
    if (!me?.username) {
      onToast('🎤 Log in to send voice notes');
      return;
    }
    if (waiting) {
      onToast(`🎤 Wait ${Math.ceil((readyAt - Date.now()) / 1000)} s for your next voice note`);
      return;
    }
    // keeps the finger's moves and its lift on this button even when it slides off
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // not a live pointer (some browsers, tests): the button still works
    }
    startY.current = e.clientY;
    const r = new Recording();
    rec.current = r;
    setPhase('asking');
    askedAt.current = Date.now();
    // a limit from an older recording never stops this one
    r.start(() => {
      if (rec.current === r) void finish();
    })
      .then(() => {
        if (rec.current === r && r.recording && !ending.current) setPhase('recording');
        // let go while the phone was asking for the mic: it's ready for next time
        else if (Date.now() - askedAt.current > 1000) onToast('🎤 Mic ready. Hold the mic button and talk');
      })
      .catch((err: unknown) => {
        if (rec.current === r) reset();
        onToast(err instanceof Error ? err.message : 'Could not use the mic');
      });
  };

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!rec.current || ending.current) return;
    const away = startY.current - e.clientY > CANCEL_PX;
    cancelRef.current = away;
    setCancelling(away);
  };

  const up = () => void finish();
  const cancel = () => {
    cancelRef.current = true;
    void finish();
  };

  const left = Math.max(0, VOICE_MAX_MS - elapsed);
  return (
    <>
      <button
        type="button"
        className={cx('icon-btn voice-btn', phase === 'recording' && 'live', waiting && 'waiting')}
        aria-label={phase === 'recording' ? 'Recording. Let go to send' : 'Hold to record a voice note'}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {phase === 'sending' ? '⏳' : '🎤'}
        {waiting && <span className="voice-wait">{Math.ceil((readyAt - now) / 1000)}</span>}
      </button>
      {phase === 'recording' && (
        <div className={cx('voice-recording', cancelling && 'cancelling')} role="status">
          <span className="voice-dot" aria-hidden />
          <b>{seconds(elapsed)}</b>
          <span className="voice-left">{cancelling ? 'Let go to cancel' : `Let go to send · slide up to cancel · ${Math.ceil(left / 1000)} s left`}</span>
          <i className="voice-bar" style={{ width: `${(elapsed / VOICE_MAX_MS) * 100}%` }} aria-hidden />
        </div>
      )}
    </>
  );
}

const subscribe = (fn: () => void) => onVoiceChange(fn);

/** who's talking now, with mute and skip; also says when a note can't play on this phone */
export function VoicePill() {
  const playing = useSyncExternalStore(subscribe, nowPlaying);
  if (!playing) return null;
  return (
    <div className={cx('voice-pill', playing.problem && 'failed')} role="status">
      {playing.problem === 'failed' ? (
        <span className="grow">🎤 {playing.name} sent a voice note this phone can't play</span>
      ) : playing.problem === 'tap' ? (
        <span className="grow">🎤 {playing.name} sent a voice note · tap anywhere to hear it</span>
      ) : (
        <>
          <span className="voice-waves" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="grow voice-who">
            🎤 <b>{playing.name}</b>
          </span>
          {playing.username && (
            <button type="button" className="voice-pill-btn" aria-label={`Mute ${playing.name}'s voice notes`} onClick={() => setMuted(playing.username!, true)}>
              🔇
            </button>
          )}
          <button type="button" className="voice-pill-btn" aria-label="Stop this voice note" onClick={skipVoice}>
            ✕
          </button>
        </>
      )}
    </div>
  );
}

/** mute or unmute one person's voice notes on this phone (their player card) */
export function VoiceMuteRow({ name, username }: { name: string; username: string }) {
  const [muted, setMutedState] = useState(() => isMuted(username));
  useEffect(() => onVoiceChange(() => setMutedState(isMuted(username))), [username]);
  return (
    <button type="button" className="btn ghost block" onClick={() => setMuted(username, !muted)}>
      {muted ? `🔊 Hear ${name}'s voice notes again` : `🔇 Mute ${name}'s voice notes`}
    </button>
  );
}

/** the game menu's switch for hearing everyone's voice notes on this phone */
export function HearVoiceButton() {
  const [on, setOn] = useState(isHearingVoice);
  useEffect(() => onVoiceChange(() => setOn(isHearingVoice())), []);
  return (
    <button className="btn block" onClick={() => setHearingVoice(!on)}>
      {on ? '🎤 Voice notes on · tap to mute all' : '🎤 Voice notes muted · tap to hear them'}
    </button>
  );
}
