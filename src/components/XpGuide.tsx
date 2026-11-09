import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { nextTitle, TITLES } from '../lib/progress';
import { XP_RULES, xpForLevel } from '../types';
import { Backdrop } from './Overlays';

const WAYS: [string, string, number][] = [
  ['🃏', 'Finish a game', XP_RULES.game],
  ['🥇', 'Win a game (1st place)', XP_RULES.win],
  ['🕵️', 'Catch a liar (right Bluff call)', XP_RULES.goodCall],
  ['🤥', 'Each bluff nobody caught', XP_RULES.cleanBluff],
];

/** how XP is earned and every title on the way to Legend */
export function XpGuide({ level, xp, onClose }: { level: number; xp: number; onClose: () => void }) {
  const next = nextTitle(level);
  return (
    <Backdrop onClose={onClose}>
      <h3>Levels & XP</h3>
      <p className="label">How to earn XP</p>
      <ul className="xp-ways">
        {WAYS.map(([emoji, text, points]) => (
          <li key={text}>
            <span>{emoji}</span>
            <span className="grow">{text}</span>
            <b>+{points} XP</b>
          </li>
        ))}
      </ul>
      <p className="muted small">Every finished game counts, win or lose. Wrong Bluff calls, stopped games and guest games give no XP.</p>

      <p className="label">Titles</p>
      {next && (
        <p className="xp-next">
          Next: {next.emoji} <b>{next.title}</b> at level {next.level} · {formatCoins(xpForLevel(next.level) - xp)} XP to go
        </p>
      )}
      <ul className="title-list">
        {TITLES.map((t) => {
          const reached = level >= t.level;
          const current = reached && (nextTitle(t.level)?.level ?? Infinity) > level;
          return (
            <li key={t.title} className={cx(reached && 'reached', current && 'current')}>
              <span className="title-emoji">{t.emoji}</span>
              <span className="grow">
                <b>{t.title}</b>
                {current && <span className="tag">You</span>}
              </span>
              <span className="muted small">
                Lv {t.level} · {formatCoins(xpForLevel(t.level))} XP
              </span>
            </li>
          );
        })}
      </ul>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
