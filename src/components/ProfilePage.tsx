import { useEffect, useState, type CSSProperties } from 'react';
import { avatarColor, cx } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import { monthYear } from '../lib/dates';
import { achievementsOf, levelOf, percent, winStreak } from '../lib/progress';
import { FIRST_GAME_BONUS, LOGIN_BONUS, type GameSummary, type ProfileOverview } from '../types';
import type { Auth } from '../useAuth';
import { FriendsSheet } from './FriendsSheet';
import { FullPage } from './FullPage';
import { FormStrip, GameList, Meter } from './ProfileParts';

interface Props {
  auth: Auth;
  onClose: () => void;
  /** shown on the home screen only */
  onOpenAdmin?: () => void;
  /** when in a room, friends can be invited to it */
  roomCode?: string;
  onInvite?: (userId: string) => Promise<boolean>;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** the player's own page: level, coins, record, play style, achievements and recent games */
export function ProfilePage({ auth, onClose, onOpenAdmin, roomCode, onInvite }: Props) {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);

  useEffect(() => {
    void auth.refresh();
    auth
      .myGames()
      .then(setGames)
      .catch(() => setGames([]));
    auth
      .overview()
      .then(setOverview)
      .catch(() => undefined);
  }, []);

  const user = auth.user;
  if (!user) return null;
  const s = user.stats;
  const lvl = levelOf(s);
  const winRate = percent(s.wins, s.gamesPlayed);
  const badges = achievementsOf(s, user.coins);
  const unlocked = badges.filter((b) => b.value >= b.goal).length;
  const net = games?.reduce((sum, g) => sum + g.coinChange + g.bonus, 0) ?? 0;

  return (
    <FullPage title="Profile" onBack={onClose}>
      <section className="profile-hero">
        <div className="level-ring" style={{ '--p': lvl.progress } as CSSProperties}>
          <span className="avatar xl" style={{ background: avatarColor(user.displayName) }}>
            {user.displayName[0]?.toUpperCase()}
          </span>
          <span className="level-badge">Lv {lvl.level}</span>
        </div>
        <h2 className="profile-name">{user.displayName}</h2>
        <p className="muted">
          @{user.username} · Joined {monthYear(user.createdAt)}
          {user.role === 'admin' && <span className="tag">Admin</span>}
        </p>
        <p className="level-title">{lvl.title}</p>
        <div className="xp-bar" aria-label={`${lvl.toNext} XP to level ${lvl.level + 1}`}>
          <i style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
        </div>
        <p className="muted small">
          {lvl.xp} XP · {lvl.toNext} to level {lvl.level + 1}
        </p>
      </section>

      <section className="wallet-card">
        <div className="wallet-top">
          <div>
            <span className="label">Coins</span>
            <b className="wallet-amount">🪙 {formatCoins(user.coins)}</b>
          </div>
          {overview && (
            <span className="rank-chip">
              #{overview.coinRank}
              <small>of {overview.players}</small>
            </span>
          )}
        </div>
        <div className="reward-row">
          <span className={cx('reward', overview?.loginBonusToday && 'done')}>
            🎁 Daily +{LOGIN_BONUS}
            <small>{overview?.loginBonusToday ? '✓ received' : 'open the app'}</small>
          </span>
          <span className={cx('reward', overview?.gameBonusToday && 'done')}>
            🃏 First game +{FIRST_GAME_BONUS}
            <small>{overview?.gameBonusToday ? '✓ received' : 'play today'}</small>
          </span>
        </div>
        {games && games.length > 0 && (
          <p className="muted small">
            Last {games.length} games: <b className={net >= 0 ? 'up' : 'down'}>{signedCoins(net)} coins</b>
          </p>
        )}
      </section>

      <div className="quick-actions">
        <button className="btn" onClick={() => setFriendsOpen(true)}>
          👥 Friends{overview ? ` · ${overview.friends}` : ''}
        </button>
        {user.role === 'admin' && onOpenAdmin && (
          <button
            className="btn"
            onClick={() => {
              onClose();
              onOpenAdmin();
            }}
          >
            🛠 Admin
          </button>
        )}
      </div>

      <section className="panel stack-tight">
        <h3 className="section-title">Record</h3>
        <div className="record-row">
          <div className="win-ring" style={{ '--p': (winRate ?? 0) / 100 } as CSSProperties}>
            <b>{winRate === null ? '–' : `${winRate}%`}</b>
            <span>win rate</span>
          </div>
          <div className="record-numbers">
            <div>
              <b>{s.gamesPlayed}</b>
              <span>games</span>
            </div>
            <div>
              <b>{s.wins}</b>
              <span>wins</span>
            </div>
            <div>
              <b>{s.losses}</b>
              <span>losses</span>
            </div>
            <div>
              <b>{games ? winStreak(games) : '–'}</b>
              <span>win streak</span>
            </div>
          </div>
        </div>
        {games && games.length > 0 && (
          <>
            <p className="label">Recent form</p>
            <FormStrip games={games} />
          </>
        )}
      </section>

      <section className="panel stack-tight">
        <h3 className="section-title">Play style</h3>
        <Meter
          emoji="🤥"
          label="Bluffs that got away"
          value={percent(s.bluffs - s.bluffsCaught, s.bluffs)}
          detail={`${plural(s.bluffs, 'bluff')} · caught ${plural(s.bluffsCaught, 'time')}`}
        />
        <Meter
          emoji="🕵️"
          label="Right bluff calls"
          value={percent(s.goodCalls, s.goodCalls + s.wrongCalls)}
          detail={`${s.goodCalls} right · ${s.wrongCalls} wrong`}
        />
        <p className="muted small">
          🧲 {plural(s.cardsPickedUp, 'card')} picked up
          {s.gamesPlayed > 0 && ` · ${Math.round(s.cardsPickedUp / s.gamesPlayed)} per game`}
        </p>
      </section>

      <section className="panel stack-tight">
        <h3 className="section-title">
          Achievements{' '}
          <span className="muted">
            {unlocked}/{badges.length}
          </span>
        </h3>
        <div className="badge-grid">
          {badges.map((b) => {
            const done = b.value >= b.goal;
            return (
              <div key={b.title} className={cx('badge-tile', done && 'done')}>
                <span className="badge-emoji">{b.emoji}</span>
                <b>{b.title}</b>
                <span className="badge-desc">{b.desc}</span>
                {!done && (
                  <div className="badge-progress" aria-label={`${b.value} of ${b.goal}`}>
                    <i style={{ width: `${Math.min(100, (b.value / b.goal) * 100)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="stack-tight">
        <h3 className="section-title">Recent games</h3>
        <GameList games={games} empty="No games yet. Finish a game while logged in." />
      </section>

      <button
        className="btn ghost block"
        onClick={() => {
          onClose();
          void auth.logout();
        }}
      >
        Log out
      </button>

      {friendsOpen && <FriendsSheet auth={auth} roomCode={roomCode} onInvite={onInvite} onClose={() => setFriendsOpen(false)} />}
    </FullPage>
  );
}
