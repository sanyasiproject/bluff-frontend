import { useState } from 'react';
import { claimText, cx } from '../lib/cards';
import type { Card, PlayerPlays, Rank, RoomView } from '../types';
import { PlayingCard } from './PlayingCard';

/** small face-up cards with a ✓ on each real one and a ✗ on each fake; flipFrom sets when the flip-in starts (ms) */
function MarkedCards({ cards, rank, flipFrom }: { cards: Card[]; rank: Rank; flipFrom?: number }) {
  return (
    <div className="lie-cards">
      {cards.map((c, j) => (
        <div key={c.id} className={cx('reveal-slot', c.rank === rank ? 'match' : 'miss')}>
          <PlayingCard
            card={c}
            size="sm"
            className={flipFrom === undefined ? undefined : 'flip'}
            style={flipFrom === undefined ? undefined : { animationDelay: `${flipFrom + Math.min(j, 8) * 70}ms` }}
          />
          <span className="mark">{c.rank === rank ? '✓' : '✗'}</span>
        </div>
      ))}
    </div>
  );
}

type Loaded = PlayerPlays | { error: string } | 'loading';

/** what became of one play: a lie caught, one that survived a call or got away, or the truth */
function playTag(p: PlayerPlays['plays'][number]): { text: string; kind: 'caught' | 'away' | 'truth' } {
  if (p.cards.every((c) => c.rank === p.rank)) return { text: p.called ? 'truth, called' : 'truth', kind: 'truth' };
  if (p.caught) return { text: 'caught', kind: 'caught' };
  return { text: p.called ? 'survived a call' : 'got away', kind: 'away' };
}

/** one player's every play, in order, and the cards they still held at the end */
function PlayerPlaysView({ data, me }: { data: Loaded; me: boolean }) {
  if (data === 'loading') return <p className="muted small lie-more">Turning the cards over…</p>;
  if ('error' in data) return <p className="muted small lie-more">{data.error}</p>;
  return (
    <div className="lie-more">
      {data.plays.length === 0 && <p className="muted small">{me ? "You didn't" : "They didn't"} put any cards down.</p>}
      {data.plays.map((p, i) => {
        const tag = playTag(p);
        return (
          <div key={i}>
            <p className="lie-claim">
              Said {claimText(p.cards.length, p.rank)}
              <span className={cx('lie-tag', tag.kind)}>{tag.text}</span>
            </p>
            <MarkedCards cards={p.cards} rank={p.rank} />
          </div>
        );
      })}
      <p className="lie-claim">
        {data.hand.length === 0 ? 'No cards left at the end' : `Left in hand: ${data.hand.length} ${data.hand.length === 1 ? 'card' : 'cards'}`}
      </p>
      {data.hand.length > 0 && (
        <div className="lie-cards">
          {data.hand.map((c) => (
            <PlayingCard key={c.id} card={c} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}

interface LieRecapProps {
  view: RoomView;
  nameOf: (id: string) => string;
  /** everything one player put down and still held; without it the names can't be opened */
  onShowPlays?: (playerId: string) => Promise<PlayerPlays>;
}

/** Bluff's game over: the lies that got away turned face-up, and how much each player lied; tap a name for all their cards */
export function LieRecapBox({ view, nameOf, onShowPlays }: LieRecapProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const recap = view.lieRecap;
  if (!recap) return null;
  // the room names everyone in the game, even players who have left it since
  const who = (id: string) => (id === view.meId ? 'You' : (recap.players.find((p) => p.playerId === id)?.name ?? nameOf(id)));
  const told = recap.players.reduce((n, p) => n + p.lies, 0);
  const more = recap.uncaught - recap.lies.length;

  const toggle = (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    const have = loaded[id];
    // fetched once; asked again after an error
    if (!onShowPlays || have === 'loading' || (have && !('error' in have))) return;
    setLoaded((l) => ({ ...l, [id]: 'loading' }));
    onShowPlays(id).then(
      (data) => setLoaded((l) => ({ ...l, [id]: { plays: data.plays, hand: data.hand } })),
      (err: unknown) => setLoaded((l) => ({ ...l, [id]: { error: err instanceof Error ? err.message : 'Something went wrong' } })),
    );
  };

  return (
    <div className="lie-recap">
      <p className="label">🤥 Lie reveal</p>
      {told === 0 && <p className="muted small">Nobody lied this game. Really? 😇</p>}
      {told > 0 && recap.uncaught === 0 && <p className="muted small">Every lie got caught. Sharp table! 🕵️</p>}
      {recap.lies.map((l, i) => (
        <div key={i} className="lie-row">
          <p className="lie-claim">
            <b>{who(l.playerId)}</b> said {claimText(l.cards.length, l.rank)}
            {l.survivedCall && <span className="lie-tag away">survived a call</span>}
          </p>
          <MarkedCards cards={l.cards} rank={l.rank} flipFrom={250 + i * 160} />
        </div>
      ))}
      {more > 0 && (
        <p className="muted small">
          +{more} more {more === 1 ? 'lie' : 'lies'} got away
        </p>
      )}
      {onShowPlays && <p className="muted small">Tap a name to see every card they put down</p>}
      <div className="lie-report">
        {recap.players.map((p) => (
          <div key={p.playerId}>
            <button
              type="button"
              className={cx('lie-player', p.playerId === view.meId && 'me')}
              aria-expanded={onShowPlays ? open === p.playerId : undefined}
              disabled={!onShowPlays}
              onClick={() => toggle(p.playerId)}
            >
              <span className="grow">{who(p.playerId)}</span>
              <span>
                {p.lies} {p.lies === 1 ? 'lie' : 'lies'} in {p.plays} {p.plays === 1 ? 'play' : 'plays'}
              </span>
              <span className="muted">· {p.caught} caught</span>
              {onShowPlays && (
                <span className="lie-chev" aria-hidden>
                  {open === p.playerId ? '▾' : '▸'}
                </span>
              )}
            </button>
            {open === p.playerId && <PlayerPlaysView data={loaded[p.playerId] ?? 'loading'} me={p.playerId === view.meId} />}
          </div>
        ))}
      </div>
    </div>
  );
}
