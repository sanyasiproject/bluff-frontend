import { levelTitle } from '../lib/progress';

/** small "Lv 3" chip; nothing for guests */
export function LevelBadge({ level }: { level: number | null | undefined }) {
  if (!level) return null;
  return (
    <span className="lv" title={`Level ${level} · ${levelTitle(level)}`}>
      Lv {level}
    </span>
  );
}
