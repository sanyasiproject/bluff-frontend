import { useEffect, useRef, useState } from 'react';
import { cx } from '../lib/cards';
import { confettiAt } from '../lib/motion';
import { secretMissionOf, type RoomView, type SecretMissionDef } from '../types';

/** my secret card above my hand: emoji, title and progress; a tap folds it into 🤫 so nobody reads it over my shoulder */
export function SecretChip({ view }: { view: RoomView }) {
  // older servers don't send it
  const secret = view.secret ?? null;
  const def = secretMissionOf(secret?.id);
  // folded for this card only, so a new card always shows itself first
  const [foldedId, setFoldedId] = useState<string | null>(null);
  const box = useRef<HTMLButtonElement>(null);
  const wasDone = useRef(secret?.done ?? false);
  const done = secret?.done ?? false;
  useEffect(() => {
    // a small burst when it gets done mid-game
    if (done && !wasDone.current && view.phase === 'playing') confettiAt(box.current, { count: 18, spread: 0.5 });
    wasDone.current = done;
  }, [done]);
  if (!secret || !def) return null;

  const folded = foldedId === secret.id;
  const progress = Math.min(secret.progress, def.goal);
  const state = secret.done ? 'done' : def.goal > 1 ? `${progress} of ${def.goal}` : 'not done yet';
  return (
    <button
      ref={box}
      type="button"
      className={cx('secret-chip', folded && 'folded', secret.done && 'done')}
      aria-expanded={!folded}
      aria-label={folded ? 'Show your secret mission' : `Your secret mission: ${def.title}, ${state}. Tap to hide it`}
      title={folded ? 'Your secret mission' : 'Only you see this · tap to hide'}
      onClick={() => setFoldedId(folded ? null : secret.id)}
    >
      {folded ? (
        <span className="secret-emoji" aria-hidden>
          🤫
        </span>
      ) : (
        <>
          <span className="secret-emoji" aria-hidden>
            {def.emoji}
          </span>
          <span className="secret-title">{def.title}</span>
        </>
      )}
      {secret.done ? (
        <span key="done" className="secret-prog yes" aria-hidden>
          ✓
        </span>
      ) : (
        def.goal > 1 && (
          // re-keyed so the number bumps when it changes
          <span key={progress} className="secret-prog bump" aria-hidden>
            {progress}/{def.goal}
          </span>
        )
      )}
    </button>
  );
}

interface CardProps {
  def: SecretMissionDef;
  done: boolean;
  /** the player's name, for cards that aren't mine */
  who: string;
  me: boolean;
  /** my own count at the end; null for everyone else */
  progress: number | null;
  /** XP the card gave in this game */
  xp: number;
}

/** one secret card turned face-up: whose it was, what it asked, and whether they did it */
function SecretCard({ def, done, who, me, progress, xp }: CardProps) {
  // older servers' catalogues have no how-text
  const how = def.how;
  return (
    <div className={cx('secret-card', done && 'done')}>
      <span className="secret-card-emoji" aria-hidden>
        {def.emoji}
      </span>
      <div className="secret-card-body">
        <p className="secret-card-who">{me ? 'Your card' : `${who}'s card`}</p>
        <p className="secret-card-title">{def.title}</p>
        {how && <p className="secret-card-how">{how}</p>}
        <p className={cx('secret-card-state', done ? 'yes' : 'no')}>
          {done ? '✓ Done' : '✗ Not done'}
          {!done && progress !== null && def.goal > 1 && ` · ${Math.min(progress, def.goal)}/${def.goal}`}
          {xp > 0 && ` · +${xp} XP`}
        </p>
      </div>
    </div>
  );
}

interface RevealProps {
  view: RoomView;
  nameOf: (id: string) => string;
}

/** game over: everyone's secret card, ✓ done or ✗ not; tap a name (or Show all) to turn the cards face-up */
export function SecretsReveal({ view, nameOf }: RevealProps) {
  // cards this app doesn't know yet are left out
  const rows = (view.secrets ?? []).flatMap((s) => {
    const def = secretMissionOf(s.id);
    return def ? [{ playerId: s.playerId, name: s.name, done: s.done, def }] : [];
  });
  // a lone card (playing bots) starts face-up
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(rows.length === 1 ? [rows[0].playerId] : []));
  if (view.phase !== 'over' || rows.length === 0) return null;

  const doneCount = rows.filter((r) => r.done).length;
  const allOpen = rows.every((r) => open.has(r.playerId));
  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.playerId)));
  const xpOfPlayer = (id: string) => view.coinResults?.find((r) => r.playerId === id)?.secretXp ?? 0;
  const summary =
    doneCount === rows.length ? 'Everyone did theirs! 🎉' : doneCount === 0 ? 'Nobody did theirs this time' : `${doneCount} of ${rows.length} did theirs`;

  return (
    <div className="secrets-reveal">
      <div className="secrets-head">
        <p className="label">🤫 Secret missions</p>
        {rows.length > 1 && (
          <button type="button" className="link-btn" onClick={toggleAll}>
            {allOpen ? 'Hide all' : 'Show all'}
          </button>
        )}
      </div>
      {rows.length > 1 && <p className="muted small">{summary} · tap a name to see their card</p>}
      <div className="secrets-list">
        {rows.map((r) => {
          const me = r.playerId === view.meId;
          const shown = open.has(r.playerId);
          // the server names everyone, even players who have left the room since
          const who = me ? nameOf(r.playerId) : r.name || nameOf(r.playerId);
          return (
            <div key={r.playerId}>
              <button
                type="button"
                className={cx('secret-row', me && 'me')}
                aria-expanded={shown}
                aria-label={`${who}: ${r.def.title}, ${r.done ? 'done' : 'not done'}`}
                onClick={() => toggle(r.playerId)}
              >
                <span className={cx('secret-mark', r.done ? 'yes' : 'no')} aria-hidden>
                  {r.done ? '✓' : '✗'}
                </span>
                <span className="secret-who">{who}</span>
                <span className="secret-what" aria-hidden>
                  {r.def.emoji} {r.def.title}
                </span>
                <span className="secret-chev" aria-hidden>
                  {shown ? '▾' : '▸'}
                </span>
              </button>
              {shown && (
                <SecretCard
                  def={r.def}
                  done={r.done}
                  who={who}
                  me={me}
                  progress={me && view.secret?.id === r.def.id ? view.secret.progress : null}
                  xp={xpOfPlayer(r.playerId)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
