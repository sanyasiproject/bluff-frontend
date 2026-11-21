import { useState, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import { divisionOf, nextRankStep, RANK_DIVISIONS, RANK_PROTECTION, rankName, rankTier, tierStarts, type CoinResult, type PublicProfile, type RankDivisionId, type RankView, type SeasonResult } from '../types';
import { RankGuide } from './RankGuide';
import { Rolling } from './Rolling';

type Division = (typeof RANK_DIVISIONS)[number];

/** the division the server named, or the one those points are in */
const divisionFor = (id: RankDivisionId | undefined, points: number): Division =>
  RANK_DIVISIONS.find((d) => d.id === id) ?? divisionOf(points);

/** the division before this one; null at the bottom */
const prevDivision = (d: Division): Division | null => RANK_DIVISIONS[RANK_DIVISIONS.findIndex((x) => x.id === d.id) - 1] ?? null;


const plural = (n: number, word: string) => `${formatCoins(n)} ${word}${n === 1 ? '' : 's'}`;

const DAY_MS = 86_400_000;

/** "ends in 5 days" once the next season is booked, else how long this one has run */
function seasonTiming(rank: RankView, now = Date.now()): string | null {
  if (rank.nextAt) {
    const days = Math.max(0, Math.ceil((new Date(rank.nextAt).getTime() - now) / DAY_MS));
    return days <= 1 ? 'ends within a day' : `ends in ${days} days`;
  }
  if (rank.startedAt) return `day ${Math.floor((now - new Date(rank.startedAt).getTime()) / DAY_MS) + 1}`;
  return null;
}

/** past seasons shown before "All N seasons" opens the full list */
const RECENT_SEASONS = 3;

/** earlier seasons, newest first: the best one named, the last few as chips, and the full list folded away */
export function PastSeasons({ seasons }: { seasons: SeasonResult[] | undefined }) {
  const [open, setOpen] = useState(false);
  if (!seasons || seasons.length === 0) return null;
  const best = seasons.reduce((a, b) => (b.points > a.points ? b : a));
  const bestDiv = divisionFor(best.division, best.points);
  return (
    <div className="past-seasons">
      <div className="past-head">
        <span className="label">Past seasons</span>
        {seasons.length > 1 && (
          <span className="past-best">
            Best: S{best.season} {bestDiv.emoji} {rankName(best.points, bestDiv.id)}
          </span>
        )}
      </div>
      {open ? (
        <ol className="past-list">
          {seasons.map((h) => {
            const d = divisionFor(h.division, h.points);
            return (
              <li key={h.season} className={cx(`rank-${d.id}`, h === best && seasons.length > 1 && 'best')}>
                <b>S{h.season}</b>
                <span className="past-div">
                  {d.emoji} {rankName(h.points, d.id)}
                </span>
                <span className="past-points">{formatCoins(h.points)}</span>
                <small>
                  {h.wins}/{h.games} won
                </small>
              </li>
            );
          })}
        </ol>
      ) : (
        <ul className="past-chips">
          {seasons.slice(0, RECENT_SEASONS).map((h) => {
            const d = divisionFor(h.division, h.points);
            return (
              <li key={h.season} className={cx('rank-pill', `rank-${d.id}`)} title={`${plural(h.games, 'game')} · ${plural(h.wins, 'win')}`}>
                S{h.season} {d.emoji} {formatCoins(h.points)}
              </li>
            );
          })}
        </ul>
      )}
      {seasons.length > RECENT_SEASONS && (
        <button type="button" className={cx('fold-btn past-more', open && 'open')} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : `All ${seasons.length} seasons`} <i aria-hidden>▾</i>
        </button>
      )}
    </div>
  );
}

/** my ranked standing this season, for my profile; everyone starts at Bronze */
export function RankCard({ rank: given }: { rank: RankView | null }) {
  const [guide, setGuide] = useState(false);
  // older servers send null before a ranked game: that's Bronze 0
  const rank: RankView = given ?? { season: 1, points: 0, division: 'bronze', floor: 0, games: 0, wins: 0, today: 0 };
  const timing = seasonTiming(rank);
  const div = divisionFor(rank.division, rank.points);
  // the bar fills towards the next tier (or division) from the start of the one you're in
  const step = nextRankStep(rank.points, div.id);
  const from = [...tierStarts(div.id)].reverse().find((at) => at <= rank.points) ?? div.min;
  const progress = step ? Math.min(1, Math.max(0, (rank.points - from) / (step.at - from))) : 1;
  const below = prevDivision(div);
  // under the division's start but within its protection: how many points are left before it drops
  const graceLeft = rank.points < div.min ? rank.points - (div.min - RANK_PROTECTION) : null;
  return (
    <section className={cx('panel rank-card', `rank-${div.id}`)}>
      <span className="label">
        🏅 Ranked · Season {rank.season}
        {timing && <span className={cx('season-timing', rank.nextAt && 'ending')}> · {timing}</span>}
      </span>
      <div className="rank-card-top">
        <span className="rank-emoji" aria-hidden>
          {div.emoji}
        </span>
        <b className="rank-division grow">{rankName(rank.points, div.id)}</b>
        <b className="rank-points">
          <Rolling value={rank.points} format={formatCoins} />
          <small>points</small>
        </b>
      </div>
      <div
        className="rank-bar"
        role="progressbar"
        aria-label={step ? `Progress to ${step.name}` : 'Top division'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <i style={{ '--p': progress } as CSSProperties} />
      </div>
      <p className="muted small">{step ? `${formatCoins(step.at - rank.points)} more for ${step.emoji} ${step.name}` : 'Top division. Stay on top!'}</p>
      <ul className="rank-facts">
        <li>
          🛡️{' '}
          {graceLeft !== null && below
            ? `Protected in ${div.name}: ${formatCoins(graceLeft)} more before ${below.emoji} ${below.name}`
            : below
              ? `You keep ${div.name} down to ${formatCoins(div.min - RANK_PROTECTION)}`
              : `Each division keeps you ${RANK_PROTECTION} points below its start before you drop`}
        </li>
        <li>
          📅 Today <b className={cx('rank-change', rank.today > 0 && 'up', rank.today < 0 && 'down')}>{signedCoins(rank.today)}</b>
        </li>
        <li>
          🎮 {plural(rank.games, 'game')} · {plural(rank.wins, 'win')}
        </li>
      </ul>
      <button type="button" className="link-btn rank-guide-link" onClick={() => setGuide(true)}>
        How ranks work ›
      </button>
      <PastSeasons seasons={rank.history} />
      {guide && <RankGuide points={rank.points} division={rank.division} onClose={() => setGuide(false)} />}
    </section>
  );
}

/** someone's division and rank points, on their player card */
export function RankChip({ rank: given }: { rank: PublicProfile['rank'] }) {
  // older servers send null before a ranked game: that's Bronze 0
  const rank = given ?? { division: 'bronze' as const, points: 0 };
  const div = divisionFor(rank.division, rank.points);
  return (
    <p className="rank-pill-row">
      <span className={cx('rank-pill', `rank-${div.id}`)} aria-label={`Ranked: ${rankName(rank.points, div.id)}, ${rank.points} points`}>
        {div.emoji} {rankName(rank.points, div.id)} · {formatCoins(rank.points)}
      </span>
    </p>
  );
}

/** a seat's division emoji at a ranked table, with its name for screen readers */
export function SeatRank({ rank }: { rank: NonNullable<PublicProfile['rank']> }) {
  const d = divisionFor(rank.division, rank.points);
  return (
    <span className={cx('seat-rank', `rank-${d.id}`)} title={rankName(rank.points, d.id)} aria-label={rankName(rank.points, d.id)}>
      {d.emoji}
    </span>
  );
}

/** a rated game's rank points change, on the game-over screen */
export function RankedLine({ result }: { result: CoinResult }) {
  // older servers send no rank
  const rank = result.rank ?? null;
  if (!rank) return null;
  const change = rank.after - rank.before;
  const div = divisionFor(rank.division, rank.after);
  // a new division: up from below it (not from inside its protection)
  const promoted = change > 0 && div.min > 0 && rank.after >= div.min && rank.before < div.min - RANK_PROTECTION;
  // a higher tier inside the same division
  const tierUp = !promoted && change > 0 && rank.before >= div.min && (rankTier(rank.after, div.id) ?? 0) > (rankTier(rank.before, div.id) ?? 0);
  // older servers sent only "capped": treat it as the daily limit
  const held = rank.held ?? ((rank as { capped?: boolean }).capped ? 'cap' : null);
  const note = !held
    ? null
    : held === 'floor'
      ? '🛡️ Rank points never go below 0'
      : held === 'grace'
        ? `🛡️ Still ${div.emoji} ${div.name}: ${formatCoins(rank.after - (div.min - RANK_PROTECTION))} points of protection left`
        : held === 'shield'
          ? '🛡️ Rank Shield used: this loss cost no points'
          : // older servers: the daily limit or owed points held it back
            held === 'debt'
            ? '↩️ This win first paid back points you were owed'
            : '📅 Daily limit reached';
  return (
    <div className={cx('daily-line ranked-line', `rank-${div.id}`, promoted && 'promoted')}>
      <span className="label ranked-label">🏅 Ranked result</span>
      <p>
        🏅 Ranked{' '}
        <b className={cx('rank-change', change > 0 && 'up', change < 0 && 'down')}>
          <Rolling value={change} format={signedCoins} />
        </b>{' '}
        · {div.emoji} {rankName(rank.after, div.id)} {formatCoins(rank.after)}
      </p>
      {promoted && (
        <p className="rank-note">
          🎉 Up to {div.emoji} {rankName(rank.after, div.id)}! You keep {div.name} down to {formatCoins(div.min - RANK_PROTECTION)}
        </p>
      )}
      {tierUp && (
        <p className="rank-note">
          ⬆️ Up to {div.emoji} {rankName(rank.after, div.id)}
        </p>
      )}
      {note && <p className="rank-note">{note}</p>}
    </div>
  );
}
