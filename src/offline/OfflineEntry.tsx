// Home's way into offline play: a chip, or a big card when there's no connection
import '../styles/land-offline.css';
import { cx } from '../lib/cards';
import { loadGame } from './store';

export function OfflineEntry({ big, onOpen }: { big: boolean; onOpen: () => void }) {
  const resume = loadGame() !== null;
  const noNet = big || (typeof navigator !== 'undefined' && navigator.onLine === false);
  return (
    <button className={cx('off-entry', noNet && 'big')} onClick={onOpen}>
      {noNet && <span className="off-entry-lead">No internet? Play on this phone</span>}
      <span className="off-entry-main">{`📴 ${resume ? 'Resume offline game' : 'Play offline (one phone)'}`}</span>
    </button>
  );
}
