import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RangCard } from './RangCard';
import { cx, rankName } from '../lib/cards';
import { dateTime } from '../lib/dates';
import type { Card, GameSummary, Rank, ReplayResponse, ReplayStep } from '../types';
import { FullPage } from './FullPage';
import { PlayingCard } from './PlayingCard';

/** how long one step stays at 1x */
const STEP_MS = 1600;
const SPEEDS = [1, 2, 4] as const;

/** a finished game move by move: seats, pile, what was said, Bluff claims and Crazy 7's top card */
export function ReplayPage({ game, load, onClose }: { game: GameSummary; load: (id: string) => Promise<ReplayResponse>; onClose: () => void }) {
  const [replay, setReplay] = useState<ReplayResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  useEffect(() => {
    load(game.id)
      .then((r) => {
        setReplay(r);
        setPlaying(r.steps.length > 1);
      })
      .catch(() => setFailed(true));
  }, [game.id]);

  const last = (replay?.steps.length ?? 1) - 1;

  // one step forward on each tick; stops at the end
  useEffect(() => {
    if (!playing || !replay) return;
    if (at >= last) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setAt((i) => Math.min(i + 1, last)), STEP_MS / speed);
    return () => window.clearTimeout(t);
  }, [playing, at, speed, replay, last]);

  const title = game.game === 'crazy7' ? '▶ Replay · Crazy 7' : game.game === 'rang' ? '▶ Replay · Rang' : '▶ Replay · Bluff';
  if (failed) {
    return (
      <FullPage title={title} onBack={onClose}>
        <p className="muted">This replay isn't available.</p>
      </FullPage>
    );
  }
  if (!replay) {
    return (
      <FullPage title={title} onBack={onClose}>
        <p className="muted small">Loading…</p>
      </FullPage>
    );
  }

  const step = replay.steps[at];
  const go = (i: number) => setAt(Math.max(0, Math.min(last, i)));
  const toggle = () => {
    // play again from the start once it has ended
    if (!playing && at >= last) setAt(0);
    setPlaying((p) => !p);
  };

  return (
    <FullPage title={title} onBack={onClose}>
      <p className="muted small replay-when">
        {dateTime(replay.endedAt)}
        {replay.status === 'ended_early' ? ' · stopped early' : ''}
        {replay.truncated ? ' · long game, some moves skipped' : ''}
      </p>
      <ReplaySeats replay={replay} step={step} />
      <ReplayTable replay={replay} step={step} />
      <ReplayLines step={step} at={at} />
      <ReplayControls
        at={at}
        last={last}
        playing={playing}
        speed={speed}
        onToggle={toggle}
        onGo={(i) => {
          setPlaying(false);
          go(i);
        }}
        onSpeed={setSpeed}
      />
    </FullPage>
  );
}

const nameIn = (replay: ReplayResponse, id: string | null | undefined) => replay.players.find((p) => p.id === id)?.name ?? 'Someone';

/** every seat with its card count; whose turn it is glows */
function ReplaySeats({ replay, step }: { replay: ReplayResponse; step: ReplayStep }) {
  return (
    <ul className="replay-seats">
      {replay.players.map((p, i) => {
        const n = step.counts[i] ?? 0;
        const turn = step.turnId === p.id;
        const claimed = step.claim?.playerId === p.id;
        const caller = step.call?.callerId === p.id;
        return (
          <li key={p.id} className={cx('replay-seat', turn && 'turn', claimed && 'claimed', caller && 'caller', n === 0 && 'out')}>
            <b className="replay-seat-name">
              {p.name}
              {p.bot ? ' 🤖' : ''}
            </b>
            <span className="replay-seat-count">{n === 0 ? '✓ out' : `🂠 ${n}`}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** the cards claimed and, when the room showed lies, what they really were */
function ReplayClaim({ replay, step }: { replay: ReplayResponse; step: ReplayStep }) {
  const claim = step.claim;
  if (!claim) return <p className="muted small">No claim on the pile</p>;
  const backs = (c: Card, rank: Rank) => c.rank === rank || (replay.wild != null && c.rank === replay.wild);
  const lie = claim.cards ? claim.cards.some((c) => !backs(c, claim.rank)) : null;
  return (
    <div className="replay-claim">
      <p>
        <b>{nameIn(replay, claim.playerId)}</b> claims {claim.count} × {rankName(claim.rank)}
        {claim.shielded && <span className="replay-shield"> 🔒 Card Shield</span>}
        {lie !== null && <span className={cx('replay-verdict', lie ? 'lie' : 'true')}>{lie ? 'Lie' : 'True'}</span>}
      </p>
      {claim.cards ? (
        <div className="replay-cards">
          {claim.cards.map((c, i) => (
            <PlayingCard
              key={c.id}
              card={c}
              size="sm"
              className={cx(!backs(c, claim.rank) && 'replay-fake')}
              style={{ '--i': i } as CSSProperties}
              note={backs(c, claim.rank) ? undefined : ', a lie'}
            />
          ))}
        </div>
      ) : (
        !replay.cards && <p className="muted small">🤫 Lies were kept secret in this room</p>
      )}
    </div>
  );
}

/** the middle of the table: pile, then Bluff's claim and call or Crazy 7's top card */
function ReplayTable({ replay, step }: { replay: ReplayResponse; step: ReplayStep }) {
  const call = step.call;
  return (
    <section className="replay-table">
      <p className="replay-pile">
        🂠 <b>{step.pile}</b> in the pile
        {replay.wild ? <span className="muted"> · 🍀 {rankName(replay.wild)} wild</span> : null}
      </p>
      {replay.game === 'rang' ? (
        <div className="replay-top">
          {step.rangTop ? <RangCard card={step.rangTop} size="md" chosen={step.rangColor ?? null} /> : <span className="muted small">No card yet</span>}
        </div>
      ) : replay.game === 'crazy7' ? (
        <div className="replay-top">
          {step.top ? <PlayingCard card={step.top} size="md" /> : <span className="muted small">No card yet</span>}
        </div>
      ) : (
        <>
          {call && (
            <p className={cx('replay-call', call.caught ? 'caught' : 'true')}>
              📣 {nameIn(replay, call.callerId)} called bluff on {nameIn(replay, call.playerId)}: {call.caught ? 'caught!' : 'it was true'}
            </p>
          )}
          <ReplayClaim replay={replay} step={step} />
        </>
      )}
    </section>
  );
}

/** what the table heard on this step */
function ReplayLines({ step, at }: { step: ReplayStep; at: number }) {
  return (
    <ul className="replay-lines" aria-live="polite">
      {step.lines.length === 0 ? (
        <li className="muted">{at === 0 ? 'Cards dealt' : '…'}</li>
      ) : (
        step.lines.map((line, i) => <li key={`${at}-${i}`}>{line}</li>)
      )}
    </ul>
  );
}

interface ControlsProps {
  at: number;
  last: number;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onGo: (i: number) => void;
  onSpeed: (s: (typeof SPEEDS)[number]) => void;
}

/** play/pause, step back and forward, speed, and a bar to tap or drag to any step */
function ReplayControls({ at, last, playing, speed, onToggle, onGo, onSpeed }: ControlsProps) {
  const done = useMemo(() => (last > 0 ? Math.round((at / last) * 100) : 100), [at, last]);
  return (
    <section className="replay-controls">
      <div className="replay-progress">
        <input
          type="range"
          min={0}
          max={last}
          step={1}
          value={at}
          aria-label="Move"
          aria-valuetext={`Step ${at + 1} of ${last + 1}`}
          style={{ '--p': `${done}%` } as CSSProperties}
          onChange={(e) => onGo(Number(e.target.value))}
        />
        <span className="replay-count small muted">
          {at + 1} / {last + 1}
        </span>
      </div>
      <div className="replay-buttons">
        <button className="btn small ghost" aria-label="Previous step" disabled={at === 0} onClick={() => onGo(at - 1)}>
          ⏮
        </button>
        <button className="btn primary replay-play" aria-label={playing ? 'Pause' : 'Play'} onClick={onToggle}>
          {playing ? '⏸ Pause' : at >= last ? '↺ Again' : '▶ Play'}
        </button>
        <button className="btn small ghost" aria-label="Next step" disabled={at >= last} onClick={() => onGo(at + 1)}>
          ⏭
        </button>
      </div>
      <div className="mini-seg replay-speed" role="group" aria-label="Speed">
        {SPEEDS.map((s) => (
          <button key={s} className={cx(speed === s && 'on')} aria-pressed={speed === s} onClick={() => onSpeed(s)}>
            {s}x
          </button>
        ))}
      </div>
    </section>
  );
}
