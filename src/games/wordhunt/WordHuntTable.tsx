// The Word Grid Hunt table: seats on the left, the letter grid in the middle, timer ring and my words on the right, a reveal each round
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-wordhunt.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { unlockSpeech } from '../../lib/speech';
import { wordHuntWordOf, type WordHuntVerdict, type WordHuntView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, usePartyBase, useSeatOrder } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { LetterGrid, type Flash } from './LetterGrid';
import { clockOffset } from './lib';
import { wordSfx } from './sounds';
import { WordReveal } from './WordReveal';

export function WordHuntTable(props: TableProps) {
  const wv = props.view.plugged?.kind === 'wordhunt' ? props.view.plugged.wordhunt : null;
  if (!wv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Shaking the letter dice…</p>
      </main>
    );
  }
  return <WordHuntInner {...props} wv={wv} />;
}

type Said = { key: number; text: string; kind: 'ok' | 'dup' | 'bad'; points?: number };

function WordHuntInner({ view, actions, bubbles, auth, notes = [], wv }: TableProps & { wv: WordHuntView }) {
  const order = useSeatOrder(view, Object.keys(wv.scores));
  const base = usePartyBase(view, bubbles, order);
  const { me, name, colorOf, bubbleOf } = base;
  const offset = useMemo(() => clockOffset(wv.now), [wv.now]);
  const [now, setNow] = useState(() => Date.now() + offset);
  const [drag, setDrag] = useState('');
  const [flash, setFlash] = useState<Flash | null>(null);
  const [said, setSaid] = useState<Said | null>(null);
  const [bad, setBad] = useState<Said[]>([]);
  const [hideReveal, setHideReveal] = useState(false);
  // the last round's words show first; the podium follows after 10 s or on "See final scores"
  const [finalSeen, setFinalSeen] = useState(false);
  const overTimer = useOverReady(view, 10_000);
  const overReady = overTimer || finalSeen || (view.phase === 'over' && !wv.reveal);
  const people = [...view.players, ...view.leftPlayers];
  const playing = wv.phase === 'play' && now < wv.endsAt;
  const live = playing && !!me && view.phase === 'playing';
  const left = Math.max(0, Math.ceil((wv.endsAt - now) / 1000));
  const total = Math.max(1, wv.time || (wv.endsAt - wv.startsAt) / 1000);
  const count = Math.max(0, Math.ceil((wv.startsAt - now) / 1000));
  const roundPts = wv.mine.reduce((a, w) => a + w.points, 0);

  // a clock for the ring and the countdown
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now() + offset), 200);
    return () => window.clearInterval(t);
  }, [offset]);

  // the last 10 seconds tick; time up rings the gong
  const lastLeft = useRef(left);
  useEffect(() => {
    if (wv.phase === 'play' && left !== lastLeft.current && left <= 10 && left > 0) wordSfx.tick(left <= 3);
    if (wv.phase === 'play' && lastLeft.current > 0 && left === 0) wordSfx.gong();
    lastLeft.current = left;
  }, [left, wv.phase]);

  useEffect(() => setHideReveal(false), [wv.round, wv.phase]);
  useEffect(() => {
    if (view.phase === 'playing') setFinalSeen(false);
  }, [view.phase]);

  const say = (s: Omit<Said, 'key'>) => {
    const k = Date.now();
    setSaid({ ...s, key: k });
    if (s.kind !== 'ok') setBad((b) => [{ ...s, key: k }, ...b].slice(0, 3));
    window.setTimeout(() => setBad((b) => b.filter((x) => x.key !== k)), 1600);
  };

  /** a word's result: green pop, grey "already", red shake */
  const answer = (verdict: WordHuntVerdict, word: string, path: number[], points: number) => {
    const W = word.toUpperCase();
    if (verdict === 'ok') {
      wordSfx.found(points);
      setFlash({ key: Date.now(), path, kind: 'ok' });
      navigator.vibrate?.(12);
      return say({ text: W, kind: 'ok', points });
    }
    if (verdict === 'again') {
      wordSfx.again();
      setFlash({ key: Date.now(), path, kind: 'dup' });
      return say({ text: `${W} · already found`, kind: 'dup' });
    }
    wordSfx.nope();
    setFlash({ key: Date.now(), path, kind: 'bad' });
    navigator.vibrate?.([8, 30, 8]);
    const why = verdict === 'short' ? `${wv.minLen}+ letters` : verdict === 'late' ? "time's up" : verdict === 'path' ? 'tiles must touch' : 'not a word';
    say({ text: `${W} · ${why}`, kind: 'bad' });
  };

  // the server's verdict on my last word
  const trySeq = useRef(wv.lastTry?.seq ?? 0);
  const pending = useRef<string | null>(null);
  useEffect(() => {
    const t = wv.lastTry;
    if (!t || t.seq <= trySeq.current) return;
    trySeq.current = t.seq;
    pending.current = null;
    answer(t.verdict, t.word, t.path, t.points);
  }, [wv.lastTry?.seq]);

  const done = async (path: number[]) => {
    setDrag('');
    if (path.length < 2) return;
    const word = wordHuntWordOf(wv.grid, path);
    // short and already-found words are answered here at once
    if (word.length < wv.minLen) return answer('short', word, path, 0);
    if (wv.mine.some((w) => w.word === word)) return answer('again', word, path, 0);
    unlockSpeech();
    pending.current = word;
    const ok = await actions.gameMoveQuiet({ kind: 'wordhunt', move: { type: 'word', round: wv.round, path } });
    // refused without a verdict (too quick, round over): a red shake
    if (!ok)
      window.setTimeout(() => {
        if (pending.current !== word) return;
        pending.current = null;
        answer('unknown', word, path, 0);
      }, 400);
  };

  let status = '';
  if (view.phase === 'playing') {
    if (wv.phase === 'countdown') status = `Round ${wv.round} of ${wv.rounds} · get ready`;
    else if (wv.phase === 'play') status = me ? `Round ${wv.round} of ${wv.rounds} · trace words` : `Round ${wv.round} of ${wv.rounds}`;
    else if (wv.phase === 'reveal') status = `Round ${wv.round} words`;
  }
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`📝 ${wv.mine.length} words this round · +${roundPts}`}</span>
      <span>{`🏆 ${wv.scores[view.meId] ?? 0} points in all`}</span>
    </p>
  );
  const tips = [`Words of ${wv.minLen}+ letters; each tile once per word`, 'Diagonals count: slide through the middle of a tile', 'Words only you find score double'];
  const top = Math.max(0, ...order.map((id) => wv.scores[id] ?? 0));
  const placeOf = (id: string) => 1 + order.filter((o) => (wv.scores[o] ?? 0) > (wv.scores[id] ?? 0)).length;
  const ring = 2 * Math.PI * 44;
  const final = view.phase === 'over';
  const showReveal = !!wv.reveal && (final ? !overReady : wv.phase === 'reveal' && !hideReveal);

  return (
    <main className={cx('table lu-table pt-table pr-wide wh-table', live && 'pt-my-turn', order.length > 2 && 'many')} style={{ ['--turn-col' as string]: colorOf(view.meId) } as CSSProperties}>
      <div className="lu-room wh-room" aria-hidden />
      <div className="lu-stage pt-stage">
        <div className="lu-plane pt-plane">
          <div className={cx('wh-word', drag && 'on', !drag && said && `s-${said.kind}`)} key={drag ? 'd' : said?.key} aria-live="polite">
            {drag ? drag.toUpperCase() : said ? said.text : ''}
            {!drag && said?.kind === 'ok' && <b className="wh-plus">+{said.points}</b>}
          </div>
          <div className="wh-tray">
            <LetterGrid
              grid={wv.grid}
              size={wv.size}
              live={live}
              hidden={wv.phase === 'countdown'}
              flash={flash}
              onPath={(path) => setDrag(wordHuntWordOf(wv.grid, path))}
              onDone={(path) => void done(path)}
              onTile={(n) => wordSfx.tile(n)}
            />
            {wv.phase === 'countdown' && count > 0 && (
              <span key={count} className="wh-count">
                {count}
              </span>
            )}
          </div>
        </div>
      </div>
      <Rails
        items={order.map((id, i) => {
          const pl = view.players.find((x) => x.id === id);
          const n = wv.counts[id] ?? 0;
          return {
            id,
            corner: i % 2 ? 'bl' : 'tl',
            node: (
              <RailSeat
                player={pl}
                goneName={people.find((x) => x.id === id)?.name}
                color={colorOf(id)}
                turn={false}
                mine={id === view.meId}
                bubble={bubbleOf(id)}
                onTap={pl && pl.id !== view.meId ? () => base.setTarget(pl.id) : undefined}
                big={wv.scores[id] ?? 0}
                bigKey={wv.scores[id] ?? 0}
                label="points"
                skin="wh-seat"
              >
                <span key={n} className="wh-n">{`📝 ${n} word${n === 1 ? '' : 's'}`}</span>
              </RailSeat>
            ),
          };
        })}
      />
      <aside className="wh-panel">
        <div className={cx('wh-timer', playing && left <= 10 && 'hurry')}>
          <svg viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="44" className="wh-ring-bg" />
            <circle cx="50" cy="50" r="44" className="wh-ring" style={{ strokeDasharray: ring, strokeDashoffset: wv.phase === 'play' ? ring * (1 - left / total) : wv.phase === 'countdown' ? 0 : ring, transition: reducedMotion() ? 'none' : undefined }} />
          </svg>
          <b>{wv.phase === 'play' ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : wv.phase === 'countdown' ? count : '—'}</b>
          <small>{`Round ${wv.round}/${wv.rounds}`}</small>
        </div>
        {me ? (
          <>
            <p className="wh-mine-head">
              <b>{wv.mine.length}</b> {wv.mine.length === 1 ? 'word' : 'words'} <span>+{roundPts}</span>
            </p>
            <ul className="wh-list">
              {bad.map((b) => (
                <li key={b.key} className={cx('wh-li', b.kind)}>
                  {b.text}
                </li>
              ))}
              {[...wv.mine].reverse().map((w, i) => (
                <li key={w.word} className={cx('wh-li', 'ok', i === 0 && said?.kind === 'ok' && 'new')}>
                  <span data-no-translate>{w.word}</span>
                  <small>+{w.points}</small>
                </li>
              ))}
              {wv.mine.length === 0 && !bad.length && <li className="wh-li empty">Your words show here</li>}
            </ul>
          </>
        ) : (
          <p className="wh-mine-head muted">👀 Words show at the end of each round</p>
        )}
      </aside>
      {showReveal && <WordReveal wv={wv} ids={order} meId={view.meId} name={name} colorOf={colorOf} onClose={final ? undefined : () => setHideReveal(true)} onNext={final ? () => setFinalSeen(true) : undefined} />}
      <PartyChrome
        view={view}
        actions={actions}
        auth={auth}
        notes={notes}
        base={base}
        status={status}
        mine={live}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Your points so far are lost"
        kickWhat="Their points so far are lost"
        watchNote="👀 Watching · you'll play next game"
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => `${wv.scores[id] ?? 0} points${(wv.scores[id] ?? 0) === top ? ' 🏆' : ''}`} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
