import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { nextTitle, TITLES } from '../lib/progress';
import { MIN_REWARD_GAME_SEC, MISSIONS, SECRET_XP, XP_RULES, xpForLevel, type MissionPeriod } from '../types';
import { Backdrop } from './Overlays';

/** the XP one daily or weekly mission pays, as a range */
function missionXp(period: MissionPeriod): string {
  const xp = MISSIONS.filter((m) => m.period === period).map((m) => m.xp);
  const lo = Math.min(...xp);
  const hi = Math.max(...xp);
  return lo === hi ? `+${lo} XP` : `+${lo}–${hi} XP`;
}

const WAYS: [string, string, string][] = [
  ['🃏', 'Finish a game', `+${XP_RULES.game} XP`],
  ['🥇', 'Win a game (1st place)', `+${XP_RULES.win} XP`],
  ['🕵️', 'Catch a liar (right Bluff call)', `+${XP_RULES.goodCall} XP`],
  ['🤥', 'Each bluff nobody caught', `+${XP_RULES.cleanBluff} XP`],
  ['🎯', 'A daily mission done', missionXp('daily')],
  ['📅', 'A weekly mission done', missionXp('weekly')],
  ['🤫', 'Your secret mission card done', `+${SECRET_XP} XP`],
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
            <b>{points}</b>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Every finished game counts, win or lose. Missions and secret cards need games of {MIN_REWARD_GAME_SEC / 60} min or more. Wrong
        Bluff calls, stopped games and guest games give no XP.
      </p>

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
