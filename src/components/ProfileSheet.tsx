import { useEffect, useState } from 'react';
import { placeLabel } from '../lib/cards';
import type { GameSummary } from '../types';
import type { Auth } from '../useAuth';
import { Backdrop } from './Overlays';

function result(g: GameSummary): [string, string] {
  if (g.status === 'ended_early') return ['⏹', 'ended early'];
  if (g.won) return ['🥇', 'won'];
  if (g.lost) return ['🙈', 'lost'];
  return ['🎖', g.place ? `finished ${placeLabel(g.place)}` : 'played'];
}

/** lifetime stats, coins and the last 10 games of the logged-in account */
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
      <p className="coin-chip big">🪙 {user.coins.toLocaleString()} coins</p>
      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div key={label} className="stat">
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="label">Recent games</p>
      {games === null && <p className="muted small">Loading…</p>}
      {games?.length === 0 && <p className="muted small">No games yet. Finish a game while logged in.</p>}
      {games && games.length > 0 && (
        <ul className="game-list">
          {games.map((g) => {
            const [icon, text] = result(g);
            return (
              <li key={g.id}>
                <span className="game-icon">{icon}</span>
                <span className="grow">
                  {g.players.map((p) => p.name).join(', ')}
                  <small className="muted">
                    {new Date(g.endedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {text}
                  </small>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
