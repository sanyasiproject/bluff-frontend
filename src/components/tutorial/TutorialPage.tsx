import { useEffect, useRef, useState } from 'react';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { gameName } from '../../lib/tutorial';
import '../../styles/tutorial.css';
import { RANKS, type GameKind, type Rank } from '../../types';
import { BackButton } from '../BackButton';
import { Hand } from '../Hand';
import { BluffBoard, Crazy7Board } from './Boards';
import { LESSONS, START, type ButtonId, type TableState } from './lessons';

interface Props {
  game: GameKind;
  /** finished or skipped */
  onDone: () => void;
  /** closed with the back button */
  onClose: () => void;
}

/** a scripted practice game against Raju 🤖: each step waits for one exact tap */
export function TutorialPage({ game, onDone, onClose }: Props) {
  const steps = LESSONS[game];
  const [i, setI] = useState(0);
  const [t, setT] = useState<TableState>(() => ({ ...START, ...steps[0].set }));
  const [nudge, setNudge] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  /** which face-down card the player turned over */
  const picked = useRef(0);
  const centerRef = useRef<HTMLElement>(null);
  useBack(onClose);

  const step = steps[i];
  const tg = step.target;
  const crazy = game === 'crazy7';

  const advance = () => {
    const next = i + 1;
    if (next >= steps.length) return;
    setT((s) => ({ ...s, ...steps[next].set }));
    setI(next);
    setHint(null);
  };

  // Raju's moves and short pauses go on by themselves
  useEffect(() => {
    if (tg.kind !== 'auto') return;
    const timer = window.setTimeout(advance, tg.ms);
    return () => window.clearTimeout(timer);
  }, [i]);

  // the win
  useEffect(() => {
    if (tg.kind === 'button' && tg.id === 'done') confettiAt(centerRef.current, { count: 70, spread: 1.3 });
  }, [i]);

  const wrong = () => {
    setNudge((n) => n + 1);
    setHint(tg.kind === 'auto' ? 'Wait for Raju…' : (step.hint ?? 'Tap the one that glows'));
  };

  const tapCard = (id: string) => {
    if (tg.kind === 'select' && tg.ids.includes(id)) {
      const sel = t.selected.includes(id) ? t.selected.filter((x) => x !== id) : [...t.selected, id];
      setT((s) => ({ ...s, selected: sel }));
      if (sel.length === tg.ids.length && tg.ids.every((x) => sel.includes(x))) advance();
      return;
    }
    if (tg.kind === 'card' && tg.ids.includes(id)) return advance();
    wrong();
  };

  const tapButton = (id: ButtonId) => {
    if (tg.kind !== 'button' || tg.id !== id) return wrong();
    if (id === 'done') return onDone();
    advance();
  };

  const tapRank = (rank: Rank) => (tg.kind === 'rank' && tg.rank === rank ? advance() : wrong());

  const tapPick = (index: number) => {
    if (tg.kind !== 'pick') return wrong();
    picked.current = index;
    advance();
  };

  const glow = tg.kind === 'select' || tg.kind === 'card' ? tg.ids.filter((id) => !t.selected.includes(id)) : [];
  const isTarget = (id: ButtonId) => tg.kind === 'button' && tg.id === id;
  const label: Record<ButtonId, string> = {
    play: `Put down ${t.selected.length} · call a rank`,
    pass: 'Pass',
    bluff: 'Bluff!',
    pick: t.pickLabel,
    call: '📢 Last card',
    next: 'Next',
    done: "Done · I'm ready",
  };
  const finished = tg.kind === 'button' && tg.id === 'done';

  return (
    <div className="page tut-page" role="dialog" aria-modal aria-label={`How to play ${gameName(game)}`}>
      <header className="page-head">
        <BackButton onClick={onClose} />
        <h2 className="grow">Practice · {gameName(game)}</h2>
        {!finished && (
          <button className="link-btn tut-skip" onClick={onDone}>
            Skip
          </button>
        )}
      </header>
      <div className="tut-progress" aria-hidden>
        <i style={{ transform: `scaleX(${(i + 1) / steps.length})` }} />
      </div>

      <section className="tut-seats">
        <div className={cx('seat', t.botTurn && 'turn', t.botHit && 'c7-hit')}>
          <span className="avatar bot-avatar">🤖</span>
          <span className="seat-name">Raju</span>
          <span className="seat-count">
            <i className="mini-back" />
            <b key={t.bot} className="bump">
              {t.bot}
            </b>
          </span>
          {t.botSays && <span className="seat-action">{t.botSays}</span>}
        </div>
      </section>

      <section className="tut-center" ref={centerRef}>
        {crazy ? (
          <Crazy7Board t={t} deckTarget={isTarget('pick')} onDeck={() => tapButton('pick')} />
        ) : (
          <BluffBoard t={t} picked={picked.current} pickTarget={tg.kind === 'pick'} onPick={tapPick} />
        )}
        {t.banner && (
          <div key={t.banner} className={cx('c7-banner', t.myTurn && 'mine')} role="status">
            {t.banner}
          </div>
        )}
      </section>

      <p key={`${i}-${nudge}`} className={cx('tut-coach', nudge > 0 && hint && 'nudge')} aria-live="polite">
        {step.say}
        {hint && <small>{hint}</small>}
      </p>

      {t.rankSheet && (
        <div className="rank-grid tut-ranks">
          {RANKS.map((r) => (
            <button key={r} className={cx('rank-btn', tg.kind === 'rank' && tg.rank === r && 'tut-target')} onClick={() => tapRank(r)}>
              {r}
            </button>
          ))}
        </div>
      )}

      <section className={cx('hand-area tut-hand', t.myTurn && 'my-turn')}>
        <div className="hand-head">
          {t.myTurn ? <span className="your-turn">YOUR TURN</span> : <span>Your cards · {t.hand.length}</span>}
          {t.status && <span className="turn-hint">{t.status}</span>}
          {t.called && <span className="c7-tag call">📢 Said it</span>}
        </div>
        <Hand cards={t.hand} selected={t.selected} playable={glow} dimRest={crazy && t.myTurn} fresh={t.fresh} onToggle={tapCard} />
      </section>

      <footer className="action-bar tut-actions">
        {t.buttons.length === 0 ? (
          <p className="hint">{t.botTurn ? 'Raju is playing…' : ''}</p>
        ) : (
          t.buttons.map((id) => (
            <button
              key={id}
              className={cx('btn grow', id === 'bluff' ? 'danger' : id === 'pass' ? '' : 'primary', isTarget(id) && 'tut-target')}
              onClick={() => tapButton(id)}
            >
              {label[id]}
            </button>
          ))
        )}
      </footer>
    </div>
  );
}
