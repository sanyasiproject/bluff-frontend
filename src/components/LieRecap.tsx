import { claimText, cx } from '../lib/cards';
import type { RoomView } from '../types';
import { PlayingCard } from './PlayingCard';

/** Bluff's game over: the lies that got away turned face-up, and how much each player lied */
export function LieRecapBox({ view, nameOf }: { view: RoomView; nameOf: (id: string) => string }) {
  const recap = view.lieRecap;
  if (!recap) return null;
  // the room names everyone in the game, even players who have left it since
  const who = (id: string) => (id === view.meId ? 'You' : (recap.players.find((p) => p.playerId === id)?.name ?? nameOf(id)));
  const told = recap.players.reduce((n, p) => n + p.lies, 0);
  const more = recap.uncaught - recap.lies.length;
  return (
    <div className="lie-recap">
      <p className="label">🤥 Lie reveal</p>
      {told === 0 && <p className="muted small">Nobody lied this game. Really? 😇</p>}
      {told > 0 && recap.uncaught === 0 && <p className="muted small">Every lie got caught. Sharp table! 🕵️</p>}
      {recap.lies.map((l, i) => (
        <div key={i} className="lie-row">
          <p className="lie-claim">
            <b>{who(l.playerId)}</b> said {claimText(l.cards.length, l.rank)}
            {l.survivedCall && <span className="lie-tag">survived a call</span>}
          </p>
          <div className="lie-cards">
            {l.cards.map((c, j) => (
              <div key={c.id} className={cx('reveal-slot', c.rank === l.rank ? 'match' : 'miss')}>
                <PlayingCard card={c} size="sm" className="flip" style={{ animationDelay: `${250 + i * 160 + Math.min(j, 8) * 70}ms` }} />
                <span className="mark">{c.rank === l.rank ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {more > 0 && (
        <p className="muted small">
          +{more} more {more === 1 ? 'lie' : 'lies'} got away
        </p>
      )}
      <div className="lie-report">
        {recap.players.map((p) => (
          <div key={p.playerId} className={cx('lie-player', p.playerId === view.meId && 'me')}>
            <span className="grow">{who(p.playerId)}</span>
            <span>
              {p.lies} {p.lies === 1 ? 'lie' : 'lies'} in {p.plays} {p.plays === 1 ? 'play' : 'plays'}
            </span>
            <span className="muted">· {p.caught} caught</span>
          </div>
        ))}
      </div>
    </div>
  );
}
