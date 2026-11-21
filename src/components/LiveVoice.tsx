import { useEffect } from 'react';
import { cx } from '../lib/cards';
import { setHear, setMic, syncLiveVoice, useLiveVoice } from '../lib/liveVoice';
import type { PublicPlayer, RoomView } from '../types';

/** keeps live voice in step with the room; mounted once in App */
export function LiveVoiceSync({ view }: { view: RoomView | null }) {
  useEffect(() => syncLiveVoice(view), [view]);
  return null;
}

/** 🔊 hear and 🎙️ talk, each saying ON or OFF; only for logged-in players with a seat, while the host has voice on. wide: the lobby row, with words */
export function LiveVoiceButtons({ view, onToast, wide = false }: { view: RoomView; onToast: (text: string) => void; wide?: boolean }) {
  const v = useLiveVoice();
  const me = view.players.find((p) => p.id === view.meId);
  if (!me || !me.registered || me.bot || !view.config.voice) return null;
  const say = (err: string | null) => err && onToast(`🎙️ ${err}`);
  return (
    <div className={cx('live-voice', wide && 'wide')} role="group" aria-label="Live voice">
      <button
        type="button"
        className={cx('live-btn', v.hear ? 'on' : 'off')}
        aria-pressed={v.hear}
        aria-label={v.hear ? 'Hearing others: on. Tap to turn off' : 'Hearing others: off. Tap to turn on'}
        disabled={v.busy}
        onClick={() => void setHear(!v.hear).then(say)}
      >
        <span className="live-icon">{v.hear ? '🔊' : '🔇'}</span>
        <small>{wide ? `Hear · ${v.hear ? 'On' : 'Off'}` : v.hear ? 'ON' : 'OFF'}</small>
      </button>
      <button
        type="button"
        className={cx('live-btn', v.mic ? 'on talking' : 'off')}
        aria-pressed={v.mic}
        aria-label={v.mic ? 'Your mic: on. Tap to turn off' : 'Your mic: off. Tap to turn on'}
        disabled={v.busy}
        onClick={() => void setMic(!v.mic).then(say)}
      >
        <span className="live-icon">
          🎙️
          {!v.mic && <i className="live-slash" aria-hidden />}
        </span>
        <small>{wide ? `Mic · ${v.mic ? 'On' : 'Off'}` : v.mic ? 'ON' : 'OFF'}</small>
      </button>
    </div>
  );
}

/** the one quiet line under the game's top bar when this network can't connect; never a popup */
export function LiveVoiceNotice() {
  const v = useLiveVoice();
  if (!v.notice) return null;
  return (
    <p className="live-notice" role="status">
      🔇 {v.notice}
    </p>
  );
}

/** a player's mic on their box: 🎙️ green when talking, crossed out when their mic is off, ⚠️ when this phone can't hear them yet */
export function LiveMark({ player }: { player: PublicPlayer }) {
  const v = useLiveVoice();
  if (!player.live) return null;
  const stuck = v.stuck.includes(player.id);
  // older servers don't say: treat them as talking
  const talking = player.mic !== false;
  const label = stuck ? `Can't hear ${player.name} right now` : talking ? `${player.name}'s mic is on` : `${player.name}'s mic is off`;
  return (
    <span className={cx('seat-live', stuck ? 'stuck' : talking ? 'mic-on' : 'mic-off')} aria-label={label} title={label}>
      {stuck ? '⚠️' : '🎙️'}
      {!stuck && !talking && <i className="live-slash" aria-hidden />}
    </span>
  );
}
