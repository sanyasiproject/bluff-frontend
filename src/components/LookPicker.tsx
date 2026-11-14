import { useState } from 'react';
import { cx } from '../lib/cards';
import { BACKS, currentLook, nextUnlock, setLook, TABLES, type LookChoice } from '../lib/look';
import { levelOf } from '../types';
import type { Auth } from '../useAuth';
import { PlayingCard } from './PlayingCard';

/** Profile: pick a table and a card back; higher levels unlock more */
export function LookPicker({ auth }: { auth: Auth }) {
  const user = auth.user;
  const level = user ? levelOf(user.stats) : 1;
  const [pick, setPick] = useState<LookChoice>(() => currentLook(user?.id ?? null, level));
  if (!user) return null;

  const choose = (change: Partial<LookChoice>) => setPick(setLook(user.id, level, change));
  const next = nextUnlock(level);

  return (
    <section className="panel stack-tight look-picker">
      <h3 className="section-title">🎨 Table & cards</h3>

      <p className="label">Table</p>
      <div className="look-row" role="radiogroup" aria-label="Table">
        {TABLES.map((t) => {
          const locked = t.level > level;
          const on = pick.table === t.id;
          return (
            <button
              // re-keyed when picked, so the pop plays each time
              key={`${t.id}${on ? '-on' : ''}`}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={locked ? `${t.name}, unlocks at level ${t.level}` : t.name}
              disabled={locked}
              className={cx('look-swatch', on && 'on', locked && 'locked')}
              onClick={() => !on && choose({ table: t.id })}
            >
              <span
                className={cx('look-felt', t.id)}
                style={{ background: `radial-gradient(120% 90% at 50% 35%, ${t.colors[0]} 0%, ${t.colors[1]} 50%, ${t.colors[2]} 100%)` }}
                aria-hidden
              >
                {locked ? '🔒' : t.emoji}
              </span>
              <span className="look-name">{t.name}</span>
              {locked && <span className="look-lv">Lv {t.level}</span>}
            </button>
          );
        })}
      </div>

      <p className="label">Card back</p>
      <div className="look-row" role="radiogroup" aria-label="Card back">
        {BACKS.map((b) => {
          const locked = b.level > level;
          const on = pick.back === b.id;
          return (
            <button
              key={`${b.id}${on ? '-on' : ''}`}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={locked ? `${b.name}, unlocks at level ${b.level}` : b.name}
              disabled={locked}
              className={cx('look-swatch', on && 'on', locked && 'locked')}
              onClick={() => !on && choose({ back: b.id })}
            >
              <span className="look-back" data-back={b.id} aria-hidden>
                <PlayingCard faceDown size="sm" />
                {locked && <span className="look-lock">🔒</span>}
              </span>
              <span className="look-name">{b.name}</span>
              {locked && <span className="look-lv">Lv {b.level}</span>}
            </button>
          );
        })}
      </div>

      <p className="muted small">
        {next ? `Reach Lv ${next.level} for ${next.name} ${next.emoji}` : 'Every table and card back is yours 🏆'} · only you see your look
      </p>
    </section>
  );
}
