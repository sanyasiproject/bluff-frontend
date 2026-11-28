// Profile: a card per game from stats.perGame (older accounts fall back to the old totals), with Ludo's own counts
import type { CSSProperties } from 'react';
import { GAME_CATALOG, type GameKind, type LifetimeStats } from '../types';
import { percent } from '../lib/progress';
import { GameArt } from '../art/GameArt';
import { Icon } from '../art/icons';

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
      <h3 className="section-title">
        <Icon name="play" size={20} /> Games
      </h3>
      <div className="gs-grid">
        {cards.map(({ g, t, played, wins }) => (
          <div key={g.kind} className="gs-card" style={{ '--c1': g.colors[0], '--c2': g.colors[1] } as CSSProperties}>
            <span className="gs-art" aria-hidden>
              <GameArt kind={g.kind} />
            </span>
            <b>{g.name}</b>
            <span className="gs-nums">
              {played} played
              {wins !== null && ` · ${wins} won`}
              {wins !== null && played > 0 && ` · ${percent(wins, played)}%`}
            </span>
            {g.kind === 'snakes' && t && (
              <span className="gs-extra">
                🪜 {t.ladders ?? 0} ladders · 🐍 {t.snakes ?? 0} snakes · 🦷 {t.bites ?? 0} bites
              </span>
            )}
            {g.kind === 'rmcs' && t && (
              <span className="gs-extra">
                🧐 {t.caught ?? 0} caught · 🦹 {t.escaped ?? 0} escaped · 👑 {t.raja ?? 0} Raja
              </span>
            )}
            {g.kind === 'darts' && t && (
              <span className="gs-extra">
                🎯 {t.t180 ?? 0} × 180 · 🐂 {t.bulls ?? 0} bulls · ✅ {t.checkouts ?? 0} checkouts
              </span>
            )}
            {g.kind === 'dots' && t && (
              <span className="gs-extra">
                ⬛ {t.boxes ?? 0} boxes closed
              </span>
            )}
            {g.kind === 'chess' && t && (
              <span className="gs-extra">
                {`♟️ ${t.moves ?? 0} moves · 🏁 ${t.mates ?? 0} checkmates`}
              </span>
            )}
            {g.kind === 'colorwar' && t && (
              <span className="gs-extra">
                🎨 {t.captures ?? 0} cells taken · 💥 {t.bursts ?? 0} bursts
              </span>
            )}
            {g.kind === 'fruit' && t && (
              <span className="gs-extra">
                🍉 {t.won ?? 0} fruit won · ⚡ {bestReaction(t)} best · 🧲 {t.magnets ?? 0} magnets
              </span>
            )}
            {g.kind === 'spikes' && t && (
              <span className="gs-extra">
                🏃 {t.dodges ?? 0} dodges · 💥 {t.hits ?? 0} hits
              </span>
            )}
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

/** Fruit Slice Duel's best reaction: the server keeps bestReflex = 1000 − ms (a $max best) */
function bestReaction(t: Partial<Record<string, number>>): string {
  const ms = t.bestReflex ? 1000 - t.bestReflex : null;
  return ms && ms > 0 ? `${(ms / 1000).toFixed(2)}s` : '—';
}
