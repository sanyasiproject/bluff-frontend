import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useBack } from '../lib/back';
import { fireworks } from '../lib/celebrate';
import { unlocksAt } from '../lib/look';
import { titleOf } from '../lib/progress';
import { sfx } from '../lib/sounds';

const AUTO_CLOSE_MS = 4000;
/** a little longer when there's a new table or card back to read about */
const AUTO_CLOSE_UNLOCK_MS = 6000;

/** tables and card backs first unlocked between the two levels */
function unlockedBetween(from: number | null, to: number): string[] {
  const names: string[] = [];
  for (let lv = (from ?? to - 1) + 1; lv <= to; lv++) {
    const { tables, backs } = unlocksAt(lv);
    names.push(...tables.map((t) => `${t.emoji} ${t.name} table`), ...backs.map((b) => `${b.emoji} ${b.name} cards`));
  }
  return names;
}

/** full-screen burst when a game lifts my level; tap anywhere (or wait) to see the results */
export function LevelUp({ level, from, onClose, extra }: { level: number; from: number | null; onClose: () => void; extra?: ReactNode }) {
  useBack(onClose);
  const title = titleOf(level);
  const newTitle = from !== null && titleOf(from).title !== title.title;
  const unlocked = unlockedBetween(from, level);

  useEffect(() => {
    sfx.levelUp();
    fireworks(newTitle ? 6 : 4);
    const t = window.setTimeout(onClose, unlocked.length > 0 ? AUTO_CLOSE_UNLOCK_MS : AUTO_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="levelup" role="dialog" aria-modal aria-label={`Level up: level ${level}`} onClick={onClose}>
      <div className="levelup-box">
        <div className="levelup-ring" aria-hidden>
          <span className="levelup-sweep" />
          <span className="levelup-emoji">{title.emoji}</span>
        </div>
        <p className="levelup-kicker">Level up!</p>
        <h2 className="levelup-level">
          Lv <b>{level}</b>
        </h2>
        <p className="levelup-title">
          {title.emoji} {title.title}
        </p>
        {newTitle && (
          <p className="levelup-new" style={{ '--d': '0.9s' } as CSSProperties}>
            ✨ New title!
          </p>
        )}
        {extra}
        {unlocked.length > 0 && (
          <p className="levelup-unlock" style={{ '--d': '1.1s' } as CSSProperties}>
            🎨 Unlocked: {unlocked.join(' · ')}
            <small>Pick it in Profile → Table &amp; cards</small>
          </p>
        )}
        <p className="levelup-tap">Tap to continue</p>
      </div>
    </div>
  );
}
