import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { MIN_REWARD_GAME_SEC, nextRankStep, RANK_DIVISIONS, RANK_PROTECTION, RANK_SEASON_DROP, rankName, SEASON_START_DELAY_DAYS, divisionOf, tierStarts, type RankDivisionId } from '../types';
import { Backdrop } from './Overlays';

const WAYS: [string, string, string][] = [
  ['🏆', 'Win a ranked game', 'points up'],
  ['💔', 'Lose a ranked game', 'fewer points down'],
  ['💪', 'Beat stronger players', 'more points'],
  ['🛡️', 'Rank Shield (coin shop)', 'next loss costs 0'],
];

/** how rank points move and every division on the way to Bluff Badshah; like the XP guide */
export function RankGuide({ points, division, onClose }: { points: number; division?: RankDivisionId; onClose: () => void }) {
  // the division shown, which can be above the points while inside its protection
  const here = RANK_DIVISIONS.find((d) => d.id === division) ?? divisionOf(points);
  const next = nextRankStep(points, here.id);
  return (
    <Backdrop onClose={onClose}>
      <h3>Ranks & divisions</h3>
      <p className="label">How rank points move</p>
      <ul className="xp-ways">
        {WAYS.map(([emoji, text, what]) => (
          <li key={text}>
            <span>{emoji}</span>
            <span className="grow">{text}</span>
            <b>{what}</b>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Only ranked Bluff tables count: logged-in players, no bots, games of {MIN_REWARD_GAME_SEC / 60} min or more. Where you finish
        counts, and so does who you beat. No daily limit. Points never go below 0.
      </p>

      <p className="label">Divisions</p>
      <p className="xp-next">
        {next ? (
          <>
            You're {here.emoji} <b>{rankName(points, here.id)}</b> · next {next.emoji} <b>{next.name}</b> at {formatCoins(next.at)} ({formatCoins(Math.max(0, next.at - points))} to go)
          </>
        ) : (
          <>You're at the top. Stay there!</>
        )}
      </p>
      <ul className="title-list rank-guide-list">
        {RANK_DIVISIONS.map((d) => {
          const reached = d.min <= here.min;
          const current = d.id === here.id;
          return (
            <li key={d.id} className={cx(reached && 'reached', current && 'current', `rank-${d.id}`)}>
              <span className="title-emoji">{d.emoji}</span>
              <span className="grow">
                <b>{d.name}</b>
                {current && <span className="tag">You</span>}
                {d.tiers > 1 && (
                  <small className="rank-guide-tiers">
                    {tierStarts(d.id)
                      .map((at, t) => `${t + 1}: ${formatCoins(at)}`)
                      .join(' · ')}
                  </small>
                )}
              </span>
              <span className="muted small">{formatCoins(d.min)}+</span>
            </li>
          );
        })}
      </ul>
      <p className="muted small">
        Higher divisions climb slower: wins give a little less and losses take a little more, so the top takes real skill to hold.
      </p>

      <p className="label">Keeping your division</p>
      <p className="muted small">
        Drop below a division's start and you still show it until you're {RANK_PROTECTION} points under (Gold starts at 700, so you stay
        🥇 Gold down to 650). Below that you move down one.
      </p>

      <p className="label">Seasons</p>
      <p className="muted small">
        A season runs about a month. When the next one is booked you see "ends in N days" ({SEASON_START_DELAY_DAYS} days' notice). At
        the new season everyone drops {RANK_SEASON_DROP} divisions (Gold 750 starts again at Bronze 180), and the old season goes into
        your past seasons.
      </p>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
