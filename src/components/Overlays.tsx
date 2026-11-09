import { useState, type ReactNode } from 'react';
import { avatarColor, claimText, cx, placeLabel, rankPlural } from '../lib/cards';
import { formatCoins, signedCoins } from '../lib/coins';
import { RANKS, type Card, type Rank, type RevealView, type RoomView } from '../types';
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
        <p className="small">
          Claimed {claimText(reveal.cards.length, reveal.rank)}
          {reveal.pickedIndex !== null && reveal.cards.length > 1 && ' · 1 random card checked'}
        </p>
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
                {p.id === view.meId && <span className="muted"> (you)</span>}
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

/** who won or paid how many coins, plus first-game-of-the-day bonuses */
function CoinSummary({ view, nameOf }: { view: RoomView; nameOf: (id: string) => string }) {
  const stake = view.config.stake;
  if (!view.players.some((p) => p.registered)) return null;
  // nothing to show for a free game without bonuses
  if (stake === 0 && (view.stopped || view.coinResults?.every((r) => r.bonus === 0))) return null;
  let body;
  if (view.stopped) body = <p className="muted small">Stopped early · no coins moved</p>;
  else if (!view.coinResults) body = <p className="muted small">Adding up coins…</p>;
  else {
    const rows = view.coinResults.filter((r) => view.players.some((p) => p.id === r.playerId && p.registered));
    body = (
      <>
        {stake > 0 && <p className="muted small">Pot 🪙 {formatCoins(stake * view.players.length)} goes to the winner</p>}
        {rows.map((r) => (
          <div key={r.playerId} className="coin-row">
            <span className="grow">{nameOf(r.playerId)}</span>
            {stake > 0 && <span className={cx('coin-change', r.change >= 0 ? 'up' : 'down')}>🪙 {signedCoins(r.change)}</span>}
            {r.bonus > 0 && <span className="bonus-chip">🎁 +{r.bonus}</span>}
          </div>
        ))}
        {rows.some((r) => r.bonus > 0) && <p className="muted small">🎁 First game of the day bonus</p>}
      </>
    );
  }
  return (
    <div className="coin-results">
      <p className="label">Coins</p>
      {body}
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
    ...view.players.map((p) => ({ id: p.id, name: p.name, watching: false })),
    ...view.watchers.map((w) => ({ id: w.id, name: w.name, watching: true })),
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
