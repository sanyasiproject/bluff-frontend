import { useState, type ReactNode } from 'react';
import { avatarColor, claimText, cx, placeLabel, rankPlural } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import { nextGameReward } from '../lib/progress';
import { LevelBadge } from './LevelBadge';
import { MIN_REWARD_GAME_SEC, RANKS, type Card, type CoinResult, type Rank, type RevealView, type RoomView } from '../types';
import { PlayingCard } from './PlayingCard';

export function Backdrop({ center, onClose, children }: { center?: boolean; onClose?: () => void; children: ReactNode }) {
  return (
    <div className={cx('backdrop', center && 'center')} onClick={onClose}>
      <div className={center ? 'modal' : 'sheet'} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

interface RankSheetProps {
  hand: Card[];
  selected: string[];
  busy: boolean;
  onPick: (rank: Rank) => void;
  onClose: () => void;
}

export function RankSheet({ hand, selected, busy, onPick, onClose }: RankSheetProps) {
  const ranks = new Set(hand.filter((c) => selected.includes(c.id)).map((c) => c.rank));
  const honest = ranks.size === 1 ? [...ranks][0] : null;
  return (
    <Backdrop onClose={onClose}>
      <h3>Call a rank for {selected.length} card{selected.length > 1 ? 's' : ''}</h3>
      <p className="muted small">
        {honest ? `Your cards really are ${rankPlural(honest)}, or bluff with any other rank.` : 'Pick any rank: truth or bluff.'}
      </p>
      <div className="rank-grid">
        {RANKS.map((r) => (
          <button key={r} className={cx('rank-btn', r === honest && 'honest')} disabled={busy} onClick={() => onPick(r)}>
            {r}
          </button>
        ))}
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Cancel
      </button>
    </Backdrop>
  );
}

interface PickSheetProps {
  count: number;
  who: string;
  claim: string;
  onPick: (index: number) => void;
  onClose: () => void;
}

export function PickSheet({ count, who, claim, onPick, onClose }: PickSheetProps) {
  return (
    <Backdrop onClose={onClose}>
      <h3>Pick one card to turn over</h3>
      <p className="muted small">
        {who} said {claim}. If your card doesn't match, they pick up the pile. If it matches, you do.
      </p>
      <div className="pick-row">
        {Array.from({ length: count }, (_, i) => (
          <PlayingCard key={i} faceDown size={count > 8 ? 'md' : 'lg'} className="pick-card" onClick={() => onPick(i)} />
        ))}
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Cancel
      </button>
    </Backdrop>
  );
}

interface RevealProps {
  reveal: RevealView;
  name: (id: string) => string;
  onClose: () => void;
}

export function RevealOverlay({ reveal, name, onClose }: RevealProps) {
  return (
    <Backdrop center onClose={onClose}>
      <div className={cx('reveal', reveal.bluff ? 'caught' : 'truth')} onClick={onClose}>
        <p className="muted small">
          {name(reveal.callerId)} called bluff on {name(reveal.playerId) === 'You' ? 'you' : name(reveal.playerId)}
        </p>
        <h3 className="reveal-title">{reveal.bluff ? 'Caught bluffing!' : 'It was the truth!'}</h3>
        <p className="small">Claimed {claimText(reveal.cards.length, reveal.rank)}</p>
        <div className="reveal-cards">
          {reveal.cards.map((c, i) => (
            <div
              key={i}
              className={cx('reveal-slot', c && (c.rank === reveal.rank ? 'match' : 'miss'), reveal.pickedIndex === i && 'picked')}
            >
              <PlayingCard
                card={c}
                size={reveal.cards.length > 8 ? 'sm' : 'md'}
                className={c ? 'flip' : undefined}
                style={{ animationDelay: `${120 + Math.min(i, 10) * 110}ms` }}
              />
              {c && <span className="mark">{c.rank === reveal.rank ? '✓' : '✗'}</span>}
            </div>
          ))}
        </div>
        <p className="reveal-result">
          <b>{name(reveal.loserId)}</b> {name(reveal.loserId) === 'You' ? 'pick' : 'picks'} up {reveal.pileCount} cards
        </p>
      </div>
    </Backdrop>
  );
}

interface GameOverProps {
  view: RoomView;
  onLobby: () => void;
  /** host only: deal again with the same players and settings */
  onRematch?: () => Promise<unknown>;
}

export function GameOver({ view, onLobby, onRematch }: GameOverProps) {
  const [busy, setBusy] = useState(false);
  const ranked = [...view.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  const medal = (place: number | null) => (place ? (['🥇', '🥈', '🥉'][place - 1] ?? placeLabel(place)) : '🙈');
  const nameOf = (id: string) => (id === view.meId ? 'You' : (view.players.find((p) => p.id === id)?.name ?? 'Someone'));
  return (
    <Backdrop center>
      <div className="reveal gameover">
        <h3 className="reveal-title">{view.stopped ? 'Game stopped' : 'Game over'}</h3>
        <ol className="results">
          {ranked.map((p) => (
            <li key={p.id} className={cx(p.id === view.loserId && 'loser')}>
              <span className="medal">{medal(p.place)}</span>
              <span className="grow">
                {p.name}
                {p.id === view.meId && <span className="muted"> (you)</span>} <LevelBadge level={p.level} />
              </span>
              <span className="muted">{p.place ? placeLabel(p.place) : p.id === view.loserId ? 'Loser' : ''}</span>
            </li>
          ))}
        </ol>
        {view.awards.length > 0 && (
          <div className="awards">
            <p className="label">Awards</p>
            {view.awards.map((a) => (
              <div key={a.title} className="award">
                <span className="award-emoji">{a.emoji}</span>
                <div className="grow">
                  <b>{a.title}</b>
                  <p className="muted small">
                    {a.playerIds.map(nameOf).join(' & ')} · {a.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <CoinSummary view={view} nameOf={nameOf} />
        {onRematch ? (
          <button
            className="btn primary block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onRematch();
              setBusy(false);
            }}
          >
            🔁 Play again{view.config.stake > 0 ? ` · 🪙 ${formatCoins(view.config.stake)} each` : ''}
          </button>
        ) : (
          <p className="muted small">Waiting for the host to play again…</p>
        )}
        <button className="btn ghost block" onClick={onLobby}>
          Back to lobby
        </button>
      </div>
    </Backdrop>
  );
}

/** your games today and the next daily reward, or why this game didn't count */
function DailyProgress({ result }: { result: CoinResult }) {
  const games = result.gamesToday ?? 0;
  if (!result.counted) {
    return <p className="daily-line">⏱ Under {MIN_REWARD_GAME_SEC / 60} minute: this game doesn't count for daily rewards</p>;
  }
  const next = nextGameReward(games);
  return (
    <p className="daily-line">
      🎯 {games} game{games === 1 ? '' : 's'} today ·{' '}
      {next ? (
        <>
          {next.left} more for <b className="gold-text">+{formatCoins(next.coins)}</b>
        </>
      ) : (
        'all daily rewards collected'
      )}
    </p>
  );
}

/** who won or paid how many coins, daily game rewards, and your next daily target */
function CoinSummary({ view, nameOf }: { view: RoomView; nameOf: (id: string) => string }) {
  const stake = view.config.stake;
  if (!view.players.some((p) => p.registered)) return null;
  if (view.stopped) {
    return stake > 0 ? <p className="muted small">Stopped early · no coins moved</p> : null;
  }
  if (!view.coinResults) return <p className="muted small">Adding up coins…</p>;

  const rows = view.coinResults.filter((r) => view.players.some((p) => p.id === r.playerId && p.registered));
  const mine = view.coinResults.find((r) => r.playerId === view.meId && r.gamesToday !== null);
  const showRows = stake > 0 || rows.some((r) => r.bonus > 0);
  if (!showRows && !mine) return null;
  return (
    <div className="coin-results">
      <p className="label">Coins</p>
      {stake > 0 && <p className="muted small">Pot 🪙 {formatCoins(stake * view.players.length)} goes to the winner</p>}
      {showRows &&
        rows.map((r) => (
          <div key={r.playerId} className="coin-row">
            <span className="grow">{nameOf(r.playerId)}</span>
            {stake > 0 && <span className={cx('coin-change', r.change >= 0 ? 'up' : 'down')}>🪙 {signedCoins(r.change)}</span>}
            {r.bonus > 0 && <span className="bonus-chip">🎯 +{formatCoins(r.bonus)}</span>}
          </div>
        ))}
      {rows.some((r) => r.bonus > 0) && <p className="muted small">🎯 Daily games reward</p>}
      {mine && <DailyProgress result={mine} />}
    </div>
  );
}

/** host's list of everyone in the room with a Remove button */
export function PlayersSheet({
  view,
  onRemove,
  onClose,
}: {
  view: RoomView;
  onRemove: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const people = [
    ...view.players.map((p) => ({ id: p.id, name: p.name, level: p.level, watching: false })),
    ...view.watchers.map((w) => ({ id: w.id, name: w.name, level: w.level, watching: true })),
  ].filter((p) => p.id !== view.meId);
  return (
    <Backdrop onClose={onClose}>
      <h3>People in this room</h3>
      {people.length === 0 && <p className="muted small">Nobody else is here.</p>}
      <ul className="player-list">
        {people.map((p) => (
          <li key={p.id} className="player-row">
            <span className="avatar sm" style={{ background: avatarColor(p.name) }}>
              {p.name[0]?.toUpperCase()}
            </span>
            <span className="grow">
              {p.name}
              <LevelBadge level={p.level} />
              {p.watching && <span className="muted"> · watching</span>}
            </span>
            <button className="btn small ghost danger-text" onClick={() => onRemove(p.id, p.name)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
