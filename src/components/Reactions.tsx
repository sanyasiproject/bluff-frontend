import { useNow } from '../lib/useNow';
import type { Reaction } from '../useBluff';

const VISIBLE_MS = 2400;

/** big emoji floating up the screen with the sender's name */
export function Reactions({ items }: { items: Reaction[] }) {
  const now = useNow(400);
  const live = items.filter((r) => now - r.at < VISIBLE_MS);
  return (
    <div className="reactions" aria-hidden>
      {live.map((r) => (
        <div key={r.key} className="reaction" style={{ left: `${14 + ((r.key * 37) % 72)}%` }}>
          <span>{r.emoji}</span>
          <small>{r.who}</small>
        </div>
      ))}
    </div>
  );
}
