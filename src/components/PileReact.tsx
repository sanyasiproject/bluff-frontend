import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../lib/cards';
import { usePileReactions } from '../lib/pileReactions';
import { loadPref, savePref } from '../lib/storage';
import { REACTIONS } from '../types';

/** the five emoji offered on the pile (indexes into REACTIONS) */
export const PILE_EMOJI = [0, 1, 2, 3, 4];
const HOLD_MS = 450;
const HINT_PREF = 'pileHint';

/** wraps the pile: hold it to drop an emoji on the last play; everyone's emoji pop onto it */
export function PileReact({ onReact, children }: { onReact: (index: number) => void; children: ReactNode }) {
  const [pressing, setPressing] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number>();
  const shown = usePileReactions();
  // a one-time tip on this phone
  const [hint, setHint] = useState(() => loadPref(HINT_PREF) !== '1');

  useEffect(() => {
    if (!hint) return;
    savePref(HINT_PREF, '1');
    const t = window.setTimeout(() => setHint(false), 5000);
    return () => window.clearTimeout(t);
  }, [hint]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const stop = () => {
    window.clearTimeout(timer.current);
    setPressing(false);
  };
  const start = () => {
    stop();
    setPressing(true);
    timer.current = window.setTimeout(() => {
      setPressing(false);
      setOpen(true);
      setHint(false);
      if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(15);
    }, HOLD_MS);
  };

  return (
    <div
      className={cx('pile-react', pressing && 'pressing')}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      // a long press must not open the phone's own menu
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      {pressing && <span className="pile-press-ring" aria-hidden />}
      <div className="pile-pops" aria-live="polite">
        {shown.map((r, i) => (
          <span key={r.key} className="pile-pop" style={{ translate: `${(i % 2 ? 1 : -1) * (8 + i * 6)}px ${-i * 12}px` }}>
            <b>{r.emoji}</b>
            <small>{r.who}</small>
          </span>
        ))}
      </div>
      {hint && !open && <span className="pile-hint">Hold the pile to react</span>}
      {open && (
        <>
          <div className="pile-scrim" onPointerDown={(e) => e.stopPropagation()} onClick={() => setOpen(false)} />
          <div className="pile-tray" role="dialog" aria-label="React to the last play" onPointerDown={(e) => e.stopPropagation()}>
            {PILE_EMOJI.map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`React ${REACTIONS[i]}`}
                onClick={() => {
                  onReact(i);
                  setOpen(false);
                }}
              >
                {REACTIONS[i]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
