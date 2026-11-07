import { useEffect, useState } from 'react';
import { cx } from '../lib/cards';
import type { Note } from '../useBluff';

const VISIBLE_MS = 4000;

export function Toasts({ notes }: { notes: Note[] }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const live = notes.filter((n) => now - n.at < VISIBLE_MS).slice(-3);
  return (
    <div className="toasts" aria-live="polite">
      {live.map((n) => (
        <div key={n.key} className={cx('toast', n.kind)}>
          {n.text}
        </div>
      ))}
    </div>
  );
}
