import type { CSSProperties } from 'react';
import { cx, placeLabel } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import { dateTime } from '../lib/dates';
import { percent } from '../lib/progress';
import type { GameSummary, LifetimeStats } from '../types';

function result(g: GameSummary): [string, string] {
  if (g.kicked) return ['🚫', 'Removed by host'];
  if (g.status === 'ended_early') return ['⏹', 'Stopped, no coins moved'];
  if (g.won) return ['🥇', 'Won'];
  if (g.lost) return ['🙈', 'Lost'];
  return ['🎖', g.place ? `Finished ${placeLabel(g.place)}` : 'Played'];
}

const minutes = (sec: number) => (sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`);

/** one past game; tap to see the players' details */
function GameCard({ g }: { g: GameSummary }) {
  const [icon, text] = result(g);
  return (
    <li>
      <details className="game-card">
        <summary className="game-card-top">
          <span className="game-icon">{icon}</span>
          <div className="grow">
            <b>{text}</b>
            <p className="muted small">
              {dateTime(g.endedAt)} · {minutes(g.durationSec)}
            </p>
          </div>
          {g.stake > 0 && g.status === 'finished' && !g.kicked && (
            <span className={cx('coin-change', g.coinChange >= 0 ? 'up' : 'down')}>🪙 {signedCoins(g.coinChange)}</span>
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
          <span>🎴 {g.decks} deck{g.decks > 1 ? 's' : ''}</span>
          <span>{g.stake > 0 ? `🪙 ${formatCoins(g.stake)} stake` : 'Free game'}</span>
          {g.bonus > 0 && <span className="bonus">🎯 +{formatCoins(g.bonus)} daily reward</span>}
        </p>
        {g.my && (
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

export function GameList({ games, empty }: { games: GameSummary[] | null; empty: string }) {
  if (games === null) return <p className="muted small">Loading…</p>;
  if (games.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <ul className="game-list">
      {games.map((g) => (
        <GameCard key={g.id} g={g} />
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
