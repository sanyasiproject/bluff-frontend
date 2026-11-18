import { cx } from '../lib/cards';
import { SAZA_BADGES, sazaOf, type RoomView, type SazaBadge } from '../types';

/** Saza for the loser: the badge someone wears, as a small sticker (nothing when they wear none) */
export function SazaTag({ badge, className }: { badge: SazaBadge | null | undefined; className?: string }) {
  const b = sazaOf(badge);
  if (!b) return null;
  return (
    <span className={className ?? 'saza-tag'} role="img" aria-label={`${b.name} saza`} title={`${b.name} saza`}>
      {b.emoji}
    </span>
  );
}

interface SazaResultProps {
  view: RoomView;
  nameOf: (id: string) => string;
  /** the winner swaps the badge; missing for everyone else */
  onPick?: (badge: SazaBadge) => Promise<unknown>;
}

/** game over with Saza on: what the last player got, and the winner's buttons to swap it */
export function SazaResult({ view, nameOf, onPick }: SazaResultProps) {
  const pick = view.sazaPick;
  const loser = pick ? view.players.find((p) => p.id === pick.loserId) : undefined;
  const badge = sazaOf(loser?.saza);
  if (!pick || !loser || !badge) return null;
  const me = loser.id === view.meId;
  const picker = pick.winnerId === view.meId && onPick;
  const winnerHere = view.players.some((p) => p.id === pick.winnerId && !p.bot);
  return (
    <div className="saza-box">
      <p className="saza-line">
        <span key={badge.id} className="saza-big bump">
          {badge.emoji}
        </span>
        <span>
          {nameOf(loser.id)} {me ? 'wear' : 'wears'} the <b>{badge.name}</b> saza
        </span>
      </p>
      {picker ? (
        <>
          <p className="muted small">You won: pick the one {nameOf(loser.id)} wears</p>
          <div className="saza-picks">
            {SAZA_BADGES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={cx('saza-pick', b.id === badge.id && 'on')}
                aria-pressed={b.id === badge.id}
                onClick={() => void onPick(b.id)}
              >
                <span aria-hidden>{b.emoji}</span>
                <small>{b.name}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small">
          {winnerHere ? `${nameOf(pick.winnerId)} can still swap it. ` : ''}It stays on until {me ? 'you win' : 'they win'} a game in this room
        </p>
      )}
    </div>
  );
}
