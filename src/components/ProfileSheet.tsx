import { useEffect, useState } from 'react';
import { cx, placeLabel } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import type { GameSummary } from '../types';
import type { Auth } from '../useAuth';
import { Backdrop } from './Overlays';

function result(g: GameSummary): [string, string] {
  if (g.kicked) return ['🚫', 'Removed by host'];
  if (g.status === 'ended_early') return ['⏹', 'Stopped, no coins moved'];
  if (g.won) return ['🥇', 'Won'];
  if (g.lost) return ['🙈', 'Lost'];
  return ['🎖', g.place ? `Finished ${placeLabel(g.place)}` : 'Played'];
}

const minutes = (sec: number) => (sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`);

function GameCard({ g }: { g: GameSummary }) {
  const [icon, text] = result(g);
  return (
    <li className="game-card">
      <div className="game-card-top">
        <span className="game-icon">{icon}</span>
        <div className="grow">
          <b>{text}</b>
          <p className="muted small">
            {new Date(g.endedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {minutes(g.durationSec)}
          </p>
        </div>
        {g.stake > 0 && g.status === 'finished' && !g.kicked && (
          <span className={cx('coin-change', g.coinChange >= 0 ? 'up' : 'down')}>🪙 {signedCoins(g.coinChange)}</span>
        )}
      </div>
      <p className="game-players">
        {g.players.map((p, i) => (
          <span key={i}>
            {p.name}
            {p.place === 1 ? ' 🥇' : p.loser ? ' 🙈' : p.kicked ? ' 🚫' : p.place ? ` ${placeLabel(p.place)}` : ''}
            {p.guest ? ' (guest)' : ''}
            {i < g.players.length - 1 ? ', ' : ''}
          </span>
        ))}
      </p>
      <p className="game-meta">
        <span>🎴 {g.decks} deck{g.decks > 1 ? 's' : ''}</span>
        <span>{g.stake > 0 ? `🪙 ${formatCoins(g.stake)} stake` : 'Free game'}</span>
        {g.bonus > 0 && <span className="bonus">🎁 +{g.bonus} first game</span>}
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
    </li>
  );
}

/** lifetime stats, coins and a detailed card for each of the last 10 games */
export function ProfileSheet({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  useEffect(() => {
    auth
      .myGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  const user = auth.user;
  if (!user) return null;
  const s = user.stats;
  const winRate = s.gamesPlayed > 0 ? `${Math.round((s.wins / s.gamesPlayed) * 100)}%` : '–';
  const stats: [string, string | number][] = [
    ['Games', s.gamesPlayed],
    ['Wins', s.wins],
    ['Losses', s.losses],
    ['Win rate', winRate],
    ['Bluffs', s.bluffs],
    ['Caught lying', s.bluffsCaught],
    ['Good calls', s.goodCalls],
    ['Cards picked up', s.cardsPickedUp],
  ];

  return (
    <Backdrop onClose={onClose}>
      <h3>
        {user.displayName} <span className="muted small">@{user.username}</span>
      </h3>
      <p className="coin-chip big">🪙 {formatCoins(user.coins)} coins</p>
      <p className="label">All time</p>
      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div key={label} className="stat">
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="label">Last 10 games</p>
      {games === null && <p className="muted small">Loading…</p>}
      {games?.length === 0 && <p className="muted small">No games yet. Finish a game while logged in.</p>}
      {games && games.length > 0 && (
        <ul className="game-list">
          {games.map((g) => (
            <GameCard key={g.id} g={g} />
          ))}
        </ul>
      )}
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
