// A Raja Mantri chit: a folded paper slip that unfolds into a role card (big emoji, name, points)
import { cx } from '../../lib/cards';
import { RMCS_EMOJI, RMCS_NAMES, RMCS_POINTS, type RmcsRole } from '../../types';

interface Props {
  /** the role on the face, once this viewer may see it */
  role: RmcsRole | null;
  /** unfolded on the table */
  open: boolean;
  /** opened by its owner but still secret to me */
  peeked?: boolean;
  /** points this chit scored this round (result) */
  points?: number | null;
  /** my chit waiting for my tap, or a Chor suspect for the Mantri */
  live?: boolean;
  big?: boolean;
  label: string;
  onTap?: () => void;
  chitRef?: (el: HTMLElement | null) => void;
}

export function Chit({ role, open, peeked, points, live, big, label, onTap, chitRef }: Props) {
  const shown = open && role;
  return (
    <button
      type="button"
      ref={chitRef}
      className={cx('rm-chit', shown && 'open', peeked && !shown && 'peeked', live && 'live', big && 'big', role && `r-${role}`)}
      aria-label={shown ? `${label}: ${RMCS_NAMES[role]}` : label}
      disabled={!onTap}
      onClick={onTap}
    >
      <span className="rm-chit-in">
        <span className="rm-chit-back" aria-hidden>
          <i className="rm-fold" />
          <i className="rm-seal">?</i>
        </span>
        <span className="rm-chit-face">
          {role && (
            <>
              <i className="rm-role-emoji">{RMCS_EMOJI[role]}</i>
              <b className="rm-role-name">{RMCS_NAMES[role]}</b>
              <small className="rm-role-pts">{points ?? RMCS_POINTS[role]}</small>
            </>
          )}
        </span>
      </span>
      {peeked && !shown && <i className="rm-peek-tick" aria-hidden>✓</i>}
    </button>
  );
}
