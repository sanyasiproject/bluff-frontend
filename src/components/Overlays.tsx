import type { ReactNode } from 'react';
import { claimText, cx, placeLabel, rankPlural } from '../lib/cards';
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
          {name(reveal.callerId)} called bluff on {name(reveal.playerId)}
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
        <p className="muted small">Tap to close</p>
      </div>
    </Backdrop>
  );
}

export function GameOver({ view, onLobby }: { view: RoomView; onLobby: () => void }) {
  const ranked = [...view.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  const medal = (place: number | null) => (place ? (['🥇', '🥈', '🥉'][place - 1] ?? placeLabel(place)) : '🙈');
  const nameOf = (id: string) => (id === view.meId ? 'You' : (view.players.find((p) => p.id === id)?.name ?? 'Someone'));
  return (
    <Backdrop center>
      <div className="reveal gameover">
        <h3 className="reveal-title">Game over</h3>
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
        <button className="btn primary block" onClick={onLobby}>
          Back to lobby
        </button>
      </div>
    </Backdrop>
  );
}
