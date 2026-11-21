import { useEffect } from 'react';
import { cx } from '../lib/cards';
import { setHear, setMic, syncLiveVoice, useLiveVoice } from '../lib/liveVoice';
import type { PublicPlayer, RoomView } from '../types';

/** keeps live voice in step with the room; mounted once in App */
export function LiveVoiceSync({ view }: { view: RoomView | null }) {
  useEffect(() => syncLiveVoice(view), [view]);
  return null;
}

/** 🔊 hear and 🎙️ talk; only for logged-in players with a seat, while the host has voice on */
export function LiveVoiceButtons({ view, onToast }: { view: RoomView; onToast: (text: string) => void }) {
  const v = useLiveVoice();
  const me = view.players.find((p) => p.id === view.meId);
  if (!me || !me.registered || me.bot || !view.config.voice) return null;
  const say = (err: string | null) => err && onToast(`🎙️ ${err}`);
  return (
    <div className="live-voice" role="group" aria-label="Live voice">
      <button
        type="button"
        className={cx('live-btn', v.hear && 'on')}
        aria-pressed={v.hear}
        aria-label={v.hear ? 'Stop hearing live voice' : 'Hear live voice'}
        disabled={v.busy}
        onClick={() => void setHear(!v.hear).then(say)}
      >
        {v.hear ? '🔊' : '🔈'}
      </button>
      <button
        type="button"
        className={cx('live-btn', v.mic && 'on talking')}
        aria-pressed={v.mic}
        aria-label={v.mic ? 'Stop talking' : 'Talk live'}
        disabled={v.busy}
        onClick={() => void setMic(!v.mic).then(say)}
      >
        {v.mic ? '🎙️' : '🎙'}
        {!v.mic && <i className="live-slash" aria-hidden />}
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

/** a seat's small mark: 🎧 in voice, 🔇 in voice but this phone can't hear them yet */
export function LiveMark({ player }: { player: PublicPlayer }) {
  const v = useLiveVoice();
  if (!player.live) return null;
  const stuck = v.stuck.includes(player.id);
  return (
    <span className={cx('seat-live', stuck && 'stuck')} aria-label={stuck ? `Can't hear ${player.name} right now` : `${player.name} is in live voice`}>
      {stuck ? '🔇' : '🎧'}
    </span>
  );
}
