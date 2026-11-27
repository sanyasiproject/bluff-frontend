import type { CSSProperties } from 'react';
import { cx, placeLabel } from '../lib/cards';
import { compactCoins, formatCoins, signedCoins } from '../lib/coins';
import { dateTime } from '../lib/dates';
import { earnedFromGames, nextGameReward, percent } from '../lib/progress';
import { DAILY_GAME_REWARDS, gameInfo, isPlugged, MIN_REWARD_GAME_SEC, type GameSummary, type LifetimeStats } from '../types';

function result(g: GameSummary): [string, string] {
  if (g.kicked) return ['🚫', 'Removed by host'];
  if (g.status === 'ended_early') return ['⏹', 'Stopped, no coins moved'];
  if (g.won) return ['🥇', 'Won'];
  if (g.lost) return ['🙈', 'Lost'];
  return ['🎖', g.place ? `Finished ${placeLabel(g.place)}` : 'Played'];
}

const minutes = (sec: number) => (sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`);

/** one past game; tap to see the players' details */
function GameCard({ g, onReplay }: { g: GameSummary; onReplay?: (g: GameSummary) => void }) {
  const [icon, text] = result(g);
  // older games have no game name: they're Bluff
  const crazy7 = g.game === 'crazy7';
  const rang = g.game === 'rang';
  // registry games (Ludo, ...): no decks, no bluffs
  const plugged = isPlugged(g.game);
  return (
    <li>
      <details className="game-card">
        <summary className="game-card-top">
          <span className="game-icon">{icon}</span>
          <div className="grow">
            <b>{text}</b>
            <p className="muted small">
              {plugged ? `${gameInfo(g.game).emoji} ${gameInfo(g.game).name}` : crazy7 ? '7️⃣ Crazy 7' : rang ? '🌈 Rang' : '🃏 Bluff'} · {dateTime(g.endedAt)} · {minutes(g.durationSec)}
            </p>
          </div>
          {g.stake > 0 && g.status === 'finished' && !g.kicked && (
            <span className={cx('coin-change', g.coinChange >= 0 ? 'up' : 'down')}>🪙 {signedCoins(g.coinChange)}</span>
          )}
          {onReplay && g.hasReplay && (
            <button
              className="replay-btn"
              aria-label="Replay this game"
              onClick={(e) => {
                // a tap here opens the replay, not the card
                e.preventDefault();
                onReplay(g);
              }}
            >
              ▶ Replay
            </button>
          )}
          <span className="chevron" aria-hidden>
            ›
          </span>
        </summary>
        <p className="game-players">
          {g.players.map((p, i) => (
            <span key={i}>
              {p.name}
              {p.place === 1 ? ' 🥇' : p.loser ? ' 🙈' : p.kicked ? ' 🚫' : p.place ? ` ${placeLabel(p.place)}` : ''}
              {p.guest ? ' (guest)' : ''}
              {p.bot ? ' 🤖' : ''}
              {i < g.players.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
        <p className="game-meta">
          {!rang && !plugged && (
            <span>
              🎴 {g.decks} deck{g.decks > 1 ? 's' : ''}
            </span>
          )}
          <span>{g.stake > 0 ? `🪙 ${formatCoins(g.stake)} stake` : 'Free game'}</span>
          {g.bonus > 0 && <span className="bonus">🎯 +{formatCoins(g.bonus)} daily reward</span>}
        </p>
        {/* Crazy 7 and Rang have no bluffs: just the cards picked from the deck */}
        {g.my && (crazy7 || rang) && (g.my.picks != null || crazy7) && (
          <div className="mini-stats">
            <span>
              🂠 <b>{g.my.picks ?? g.my.pickedUp}</b> picked
            </span>
          </div>
        )}
        {g.my && !crazy7 && !rang && !plugged && (
          <div className="mini-stats">
            <span>
              <b>{g.my.bluffs}</b> bluffs
            </span>
            <span>
              <b>{g.my.caught}</b> caught
            </span>
            <span>
              <b>{g.my.goodCalls}</b> good calls
            </span>
            <span>
              <b>{g.my.wrongCalls}</b> wrong calls
            </span>
            <span>
              <b>{g.my.pickedUp}</b> picked up
            </span>
          </div>
        )}
        {g.myAwards.length > 0 && (
          <p className="game-awards">
            {g.myAwards.map((a) => (
              <span key={a.title}>
                {a.emoji} {a.title}
              </span>
            ))}
          </p>
        )}
      </details>
    </li>
  );
}

export function GameList({ games, empty, onReplay }: { games: GameSummary[] | null; empty: string; onReplay?: (g: GameSummary) => void }) {
  if (games === null) return <p className="muted small">Loading…</p>;
  if (games.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <ul className="game-list">
      {games.map((g) => (
        <GameCard key={g.id} g={g} onReplay={onReplay} />
      ))}
    </ul>
  );
}

/** last results as small chips, newest on the left */
export function FormStrip({ games }: { games: GameSummary[] }) {
  return (
    <div className="form-strip" aria-label="Recent results, newest first">
      {games.map((g) => {
        const stopped = g.status === 'ended_early' || g.kicked;
        const label = stopped ? '–' : g.won ? 'W' : g.lost ? 'L' : g.place ? String(g.place) : '·';
        return (
          <span key={g.id} className={cx('form-dot', stopped ? 'stopped' : g.won ? 'win' : g.lost ? 'loss' : 'mid')}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** a labelled bar from 0 to 100% */
export function Meter({ emoji, label, value, detail }: { emoji: string; label: string; value: number | null; detail: string }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span>
          {emoji} {label}
        </span>
        <b>{value === null ? '–' : `${value}%`}</b>
      </div>
      <div className="meter-bar">
        <i style={{ width: `${value ?? 0}%` }} />
      </div>
      <p className="muted small">{detail}</p>
    </div>
  );
}

export function StatGrid({ stats }: { stats: LifetimeStats }) {
  const s = stats;
  const winRate = percent(s.wins, s.gamesPlayed);
  const items: [string, string | number][] = [
    ['Games', s.gamesPlayed],
    ['Wins', s.wins],
    ['Losses', s.losses],
    ['Win rate', winRate === null ? '–' : `${winRate}%`],
    ['Bluffs', s.bluffs],
    ['Caught lying', s.bluffsCaught],
    ['Good calls', s.goodCalls],
    ['Picked up', s.cardsPickedUp],
  ];
  return (
    <div className="stat-grid">
      {items.map(([label, value], i) => (
        <div key={label} className="stat" style={{ '--i': i } as CSSProperties}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** the daily games ladder: games counted today and the coins each step pays */
export function DailyLadder({ gamesToday }: { gamesToday: number }) {
  const next = nextGameReward(gamesToday);
  return (
    <div className="ladder">
      <div className="ladder-head">
        <span>🎯 Daily games</span>
        <b>
          {gamesToday} today · +{formatCoins(earnedFromGames(gamesToday))}
        </b>
      </div>
      <p className="ladder-next">
        {next ? (
          <>
            Play <b>{next.left}</b> more game{next.left > 1 ? 's' : ''} to get <b className="gold-text">+{formatCoins(next.coins)}</b>
          </>
        ) : (
          'All daily game rewards collected 🎉 Come back tomorrow'
        )}
      </p>
      <div className="ladder-steps">
        {DAILY_GAME_REWARDS.map((r) => (
          <span key={r.games} className={cx('step', gamesToday >= r.games && 'done', next?.games === r.games && 'next')}>
            <b>{gamesToday >= r.games ? '✓' : r.games}</b>
            <small>+{compactCoins(r.coins)}</small>
          </span>
        ))}
      </div>
      <p className="muted small">
        Games of {MIN_REWARD_GAME_SEC / 60} min or more count, win or lose · starts again at midnight
      </p>
    </div>
  );
}
