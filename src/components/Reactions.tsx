import { cx } from '../lib/cards';
import { useNow } from '../lib/useNow';
import type { Reaction } from '../useBluff';

const EMOJI_MS = 2400;
// messages rise, wait about a second at the top, then fade
const MESSAGE_MS = 3600;

/** big emoji and quick messages floating up the screen with the sender's name */
export function Reactions({ items }: { items: Reaction[] }) {
  const now = useNow(400);
  const live = items.filter((r) => now - r.at < (r.text ? MESSAGE_MS : EMOJI_MS));
  return (
    <div className="reactions" aria-hidden>
      {live.map((r) => (
        <div
          key={r.key}
          className={cx('reaction', r.text && 'message')}
          // messages are wider, so they start nearer the middle
          style={{ left: r.text ? `${32 + ((r.key * 23) % 36)}%` : `${14 + ((r.key * 37) % 72)}%` }}
        >
          {r.text ? <b className="float-msg">{r.text}</b> : <span>{r.emoji}</span>}
          <small>{r.who}</small>
        </div>
      ))}
    </div>
  );
}
