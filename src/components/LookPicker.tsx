import { useState } from 'react';
import { errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { BACKS, currentLook, nextUnlock, TABLES, type LookChoice } from '../lib/look';
import { levelOf } from '../types';
import type { Auth } from '../useAuth';
import { PlayingCard } from './PlayingCard';

/** Profile: pick a table (your felt, and your seat box for everyone) and a card back (everyone sees it on your cards); higher levels unlock more */
export function LookPicker({ auth }: { auth: Auth }) {
  const user = auth.user;
  const level = user ? levelOf(user.stats) : 1;
  // shown at once; put back if the server says no
  const [trying, setTrying] = useState<Partial<LookChoice>>({});
  const [error, setError] = useState('');
  if (!user) return null;

  const saved = currentLook(level, user.tableTheme, user.cardBack);
  const pick: LookChoice = { ...saved, ...trying };
  const choose = async (change: Partial<LookChoice>) => {
    setTrying(change);
    setError('');
    try {
      if (change.table) await auth.setTableTheme(change.table);
      if (change.back) await auth.setCardBack(change.back);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setTrying({});
    }
  };
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
              onClick={() => !on && void choose({ table: t.id })}
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
              onClick={() => !on && void choose({ back: b.id })}
            >
              <span className="look-back" data-back={b.id} aria-hidden>
                <PlayingCard faceDown size="sm" back={b.id} />
                {locked && <span className="look-lock">🔒</span>}
              </span>
              <span className="look-name">{b.name}</span>
              {locked && <span className="look-lv">Lv {b.level}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="form-error">{error}</p>}
      <p className="muted small">
        Everyone at the table sees your seat in your table style and your cards in your card back.{' '}
        {next ? `Reach Lv ${next.level} for ${next.name} ${next.emoji}` : 'Every table and card back is yours 🏆'}
      </p>
    </section>
  );
}
