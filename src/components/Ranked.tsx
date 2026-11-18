import type { CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import { divisionOf, RANK_DAILY_CAP, RANK_DIVISIONS, type CoinResult, type PublicProfile, type RankDivisionId, type RankView } from '../types';
import { Rolling } from './Rolling';

type Division = (typeof RANK_DIVISIONS)[number];

/** the division the server named, or the one those points are in */
const divisionFor = (id: RankDivisionId | undefined, points: number): Division =>
  RANK_DIVISIONS.find((d) => d.id === id) ?? divisionOf(points);

/** the division after this one; null at the top */
const nextDivision = (d: Division): Division | null => RANK_DIVISIONS[RANK_DIVISIONS.findIndex((x) => x.id === d.id) + 1] ?? null;

const plural = (n: number, word: string) => `${formatCoins(n)} ${word}${n === 1 ? '' : 's'}`;

/** my ranked standing this season, for my profile */
export function RankCard({ rank }: { rank: RankView | null }) {
  if (!rank) {
    return (
      <section className="panel rank-card rank-card-empty">
        <span className="rank-emoji" aria-hidden>
          🏅
        </span>
        <div className="grow">
          <b>Ranked</b>
          <p className="muted small">
            Play a 🏅 Ranked table to get your division, then climb from {RANK_DIVISIONS[0].emoji} {RANK_DIVISIONS[0].name} to{' '}
            {RANK_DIVISIONS[RANK_DIVISIONS.length - 1].emoji} {RANK_DIVISIONS[RANK_DIVISIONS.length - 1].name}.
          </p>
        </div>
      </section>
    );
  }
  const div = divisionFor(rank.division, rank.points);
  const next = nextDivision(div);
  const progress = next ? Math.min(1, Math.max(0, (rank.points - div.min) / (next.min - div.min))) : 1;
  const floor = divisionOf(rank.floor);
  const firstFloor = RANK_DIVISIONS[1];
  const atCap = Math.abs(rank.today) >= RANK_DAILY_CAP;
  return (
    <section className={cx('panel rank-card', `rank-${div.id}`)}>
      <span className="label">🏅 Ranked · Season {rank.season}</span>
      <div className="rank-card-top">
        <span className="rank-emoji" aria-hidden>
          {div.emoji}
        </span>
        <b className="rank-division grow">{div.name}</b>
        <b className="rank-points">
          <Rolling value={rank.points} format={formatCoins} />
          <small>points</small>
        </b>
      </div>
      <div
        className="rank-bar"
        role="progressbar"
        aria-label={next ? `Progress to ${next.name}` : 'Top division'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <i style={{ '--p': progress } as CSSProperties} />
      </div>
      <p className="muted small">{next ? `${formatCoins(next.min - rank.points)} more for ${next.emoji} ${next.name}` : 'Top division. Stay on top!'}</p>
      <ul className="rank-facts">
        <li>
          🛡️{' '}
          {rank.floor > 0
            ? `You can't drop below ${formatCoins(rank.floor)} (${floor.emoji} ${floor.name}) this season`
            : `Reach ${firstFloor.emoji} ${firstFloor.name} and you can't drop below it this season`}
        </li>
        <li className={cx(atCap && 'at-cap')}>
          📅 Today <b className={cx('rank-change', rank.today > 0 && 'up', rank.today < 0 && 'down')}>{signedCoins(rank.today)}</b>
          {atCap ? ' · daily limit reached' : ` · up to ±${RANK_DAILY_CAP} a day`}
        </li>
        <li>
          🎮 {plural(rank.games, 'game')} · {plural(rank.wins, 'win')}
        </li>
      </ul>
    </section>
  );
}

/** someone's division and rank points, on their player card */
export function RankChip({ rank }: { rank: PublicProfile['rank'] }) {
  if (!rank) return null;
  const div = divisionFor(rank.division, rank.points);
  return (
    <p className="rank-pill-row">
      <span className={cx('rank-pill', `rank-${div.id}`)} aria-label={`Ranked: ${div.name}, ${rank.points} points`}>
        {div.emoji} {div.name} · {formatCoins(rank.points)}
      </span>
    </p>
  );
}

/** a rated game's rank points change, on the game-over screen */
export function RankedLine({ result }: { result: CoinResult }) {
  // older servers send no rank
  const rank = result.rank ?? null;
  if (!rank) return null;
  const change = rank.after - rank.before;
  const div = divisionFor(rank.division, rank.after);
  const promoted = divisionOf(rank.after).min > divisionOf(rank.before).min;
  // older servers sent only "capped": treat it as the daily limit
  const held = rank.held ?? ((rank as { capped?: boolean }).capped ? 'cap' : null);
  const note = !held
    ? null
    : held === 'floor'
      ? div.min === 0
        ? '🛡️ Rank points never go below 0'
        : `🛡️ Your floor held: you stay in ${div.emoji} ${div.name} this season`
      : held === 'debt'
        ? '↩️ This win first paid back points your floor or the daily limit kept you from losing'
        : `📅 Daily limit reached: points move up to ±${RANK_DAILY_CAP} a day`;
  return (
    <div className={cx('daily-line ranked-line', `rank-${div.id}`, promoted && 'promoted')}>
      <p>
        🏅 Ranked{' '}
        <b className={cx('rank-change', change > 0 && 'up', change < 0 && 'down')}>
          <Rolling value={change} format={signedCoins} />
        </b>{' '}
        · {div.emoji} {div.name} {formatCoins(rank.after)}
      </p>
      {promoted && (
        <p className="rank-note">
          🎉 Up to {div.emoji} {div.name}! You can't drop below {formatCoins(div.min)} this season
        </p>
      )}
      {note && <p className="rank-note">{note}</p>}
    </div>
  );
}
