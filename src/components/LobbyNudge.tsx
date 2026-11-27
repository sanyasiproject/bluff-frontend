// The host's get-ready buzz: the 📳 Buzz button by a blocked Start, and the banner the buzzed players see
import { useEffect, useState } from 'react';
import { cx } from '../lib/cards';
import { NUDGE_COOLDOWN_MS } from '../types';
import type { Actions, Nudged } from '../useBluff';

/** host: buzz everyone not ready; shows the cooldown counting down */
export function BuzzButton({ actions, waiting }: { actions: Actions; waiting: number }) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const left = Math.max(0, until - now);
  // tick while cooling down
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [until, left > 0]);

  const buzz = async () => {
    setBusy(true);
    const res = await actions.nudge();
    setBusy(false);
    const at = Date.now();
    setNow(at);
    if (res.ok) {
      setUntil(at + NUDGE_COOLDOWN_MS);
      actions.toast(`📳 Buzzed ${res.count} ${res.count === 1 ? 'player' : 'players'}`);
      return;
    }
    // the server's cooldown wins over ours (another tab, a rejoin)
    const wait = /Wait (\d+)s/.exec(res.error);
    if (wait) setUntil(at + Number(wait[1]) * 1000);
    actions.toast(res.error);
  };

  const secs = Math.ceil(left / 1000);
  return (
    <button
      type="button"
      className={cx('btn buzz-btn', left > 0 && 'cooling')}
      disabled={busy || left > 0}
      aria-label={left > 0 ? `Buzz again in ${secs} seconds` : `Buzz the ${waiting} ${waiting === 1 ? 'player' : 'players'} not ready`}
      onClick={() => void buzz()}
    >
      <span>{left > 0 ? `📳 ${secs}s` : '📳 Buzz'}</span>
      {/* the bar empties over the cooldown */}
      {left > 0 && <i key={until} className="buzz-bar" style={{ animationDuration: `${until - Date.now()}ms` }} aria-hidden />}
    </button>
  );
}

/** a buzzed player: who is waiting, and a nudge towards I'm ready */
export function NudgeBanner({ nudged, onClose }: { nudged: Nudged; onClose: () => void }) {
  return (
    <div className="nudge-banner" role="alert">
      <span className="nudge-icon" aria-hidden>
        📳
      </span>
      <span className="grow">
        <b data-no-translate>{nudged.from}</b> is waiting — tap <b>I'm ready</b>
      </span>
      <button type="button" className="nudge-close" aria-label="Close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
