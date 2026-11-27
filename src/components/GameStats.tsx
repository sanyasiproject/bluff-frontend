// Profile: a card per game from stats.perGame (older accounts fall back to the old totals), with Ludo's own counts
import type { CSSProperties } from 'react';
import { GAME_CATALOG, type GameKind, type LifetimeStats } from '../types';
import { percent } from '../lib/progress';

/** games played before per-game counts began, from the old totals */
function oldPlayed(s: LifetimeStats, kind: GameKind): number | null {
  const c7 = s.crazy7Games ?? 0;
  const rang = s.rangGames ?? 0;
  if (kind === 'crazy7') return c7;
  if (kind === 'rang') return rang;
  if (kind === 'bluff') return Math.max(0, s.gamesPlayed - c7 - rang);
  return null;
}

export function GameStats({ stats }: { stats: LifetimeStats }) {
  const cards = GAME_CATALOG.map((g) => {
    const t = stats.perGame?.[g.kind];
    const played = t?.played ?? oldPlayed(stats, g.kind) ?? 0;
    const wins = t ? t.wins : null;
    return { g, t, played, wins };
  });
  return (
    <section className="panel stack-tight game-stats">
      <h3 className="section-title">🎮 Games</h3>
      <div className="gs-grid">
        {cards.map(({ g, t, played, wins }) => (
          <div key={g.kind} className="gs-card" style={{ '--c1': g.colors[0], '--c2': g.colors[1] } as CSSProperties}>
            <span className="gs-emoji" aria-hidden>
              {g.emoji}
            </span>
            <b>{g.name}</b>
            <span className="gs-nums">
              {played} played
              {wins !== null && ` · ${wins} won`}
              {wins !== null && played > 0 && ` · ${percent(wins, played)}%`}
            </span>
            {g.kind === 'ludo' && t && (
              <span className="gs-extra">
                ⚔️ {t.kills ?? 0} kills · 🏠 {t.home ?? 0} home · 🎲 {t.sixes ?? 0} sixes
              </span>
            )}
          </div>
        ))}
      </div>
      {!stats.perGame && <p className="muted small">Wins per game count from your next game.</p>}
    </section>
  );
}
