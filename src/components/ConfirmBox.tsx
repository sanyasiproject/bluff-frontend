import type { ReactNode } from 'react';
import { cx } from '../lib/cards';
import { Backdrop } from './Overlays';

interface Props {
  title: string;
  body?: ReactNode;
  /** the confirm button's words, e.g. "Remove" */
  action: string;
  cancel?: string;
  /** red confirm button for things that can't be undone */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** in-app "are you sure?" for risky actions; the phone's back button cancels it */
export function ConfirmBox({ title, body, action, cancel = 'Cancel', danger = true, onConfirm, onCancel }: Props) {
  return (
    <Backdrop center onClose={onCancel}>
      <div className="confirm-box">
        <h3>{title}</h3>
        {body && <p className="muted">{body}</p>}
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onCancel}>
            {cancel}
          </button>
          <button className={cx('btn', danger ? 'danger' : 'primary')} onClick={onConfirm}>
            {action}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
