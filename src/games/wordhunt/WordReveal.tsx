// The round-end reveal: a column of words per player (unique ones starred), the round's best word with a burst, and long words nobody found
import { useEffect, useRef, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import type { WordHuntView } from '../../types';

interface Props {
  wv: WordHuntView;
  ids: string[];
  meId: string;
  name: (id: string) => string;
  colorOf: (id: string) => string;
  onClose?: () => void;
  /** the last round: move on to the podium */
  onNext?: () => void;
}

export function WordReveal({ wv, ids, meId, name, colorOf, onClose, onNext }: Props) {
  const best = useRef<HTMLDivElement>(null);
  const r = wv.reveal;
  useEffect(() => {
    if (r?.best) window.setTimeout(() => confettiAt(best.current, { count: 50, spread: 1.1 }), 350);
  }, [r?.round]);
  if (!r) return null;
  const sum = (id: string) => r.points[id] ?? 0;
  const cols = [...ids].sort((a, b) => sum(b) - sum(a));
  return (
    <div className="wh-reveal" role="dialog" aria-label={`Round ${r.round} words`}>
      <header className="wh-rv-head">
        <b>{r.round >= wv.rounds ? 'Last round' : `Round ${r.round} of ${wv.rounds}`}</b>
        {r.best && (
          <div ref={best} className="wh-best" style={{ ['--c' as string]: colorOf(r.best.playerId) } as CSSProperties}>
            <small>Best word</small>
            <strong>{r.best.word.toUpperCase()}</strong>
            <span>
              {name(r.best.playerId)} · +{r.best.points}
            </span>
          </div>
        )}
        {onNext && (
          <button className="btn primary small wh-rv-next" onClick={onNext}>
            See final scores
          </button>
        )}
        {onClose && (
          <button className="icon-btn wh-rv-x" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        )}
      </header>
      <div className="wh-cols" style={{ ['--cols' as string]: cols.length } as CSSProperties}>
        {cols.map((id, k) => {
          const words = [...(r.words[id] ?? [])].sort((a, b) => Number(!!b.unique) - Number(!!a.unique) || b.word.length - a.word.length);
          return (
            <section key={id} className={cx('wh-col', id === meId && 'mine')} style={{ ['--c' as string]: colorOf(id), ['--k' as string]: k } as CSSProperties}>
              <h4>
                <span data-no-translate>{name(id)}</span>
                <b>+{sum(id)}</b>
              </h4>
              <ul>
                {words.length === 0 && <li className="muted">No words</li>}
                {words.map((w) => (
                  <li key={w.word} className={cx(w.unique && 'uniq')}>
                    {w.unique && <i aria-label="only you">★</i>}
                    <span data-no-translate>{w.word}</span>
                    <small>+{w.points}</small>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {r.missed.length > 0 && (
        <p className="wh-missed">
          <span>Missed:</span>
          {r.missed.slice(0, 5).map((w) => (
            <b key={w} data-no-translate>
              {w}
            </b>
          ))}
        </p>
      )}
      <p className="wh-rv-note">{`★ only one player found it: double points · ${r.total} words were in the grid`}</p>
    </div>
  );
}
