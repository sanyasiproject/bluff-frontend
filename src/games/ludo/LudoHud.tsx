// Small pieces over the Ludo table: the timed-mode clock and the big banners (bonus roll, three sixes)
import { useEffect, useState } from 'react';
import { cx } from '../../lib/cards';

export interface Banner {
  key: number;
  kind: 'bonus' | 'bust' | 'info';
  text: string;
  sub?: string;
}

/** a banner across the middle of the board; it pops in and fades by itself */
export function LudoBanner({ banner }: { banner: Banner }) {
  return (
    <div key={banner.key} className={cx('lu-banner', `lu-banner-${banner.kind}`)} role="status">
      <b>
        {banner.kind === 'bonus' ? '🎲 ' : banner.kind === 'bust' ? '🎲🎲🎲 ' : ''}
        {banner.text}
      </b>
      {banner.sub && <small>{banner.sub}</small>}
    </div>
  );
}

/** Timed mode: game time left, ticking each second */
export function LudoClock({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const text = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <span className={cx('lu-clock', left <= 30 && 'low')} role="timer" aria-label={`${text} of game time left`}>
      ⏱ {text}
    </span>
  );
}
