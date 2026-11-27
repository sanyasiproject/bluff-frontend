// The Darts table: a big dartboard in a lit cabinet, two-tap sweep aim (up-down line, then left-right line), darts that arc in and thud, chalk slates of points left
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-darts.css';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTurnEndsAt } from '../../components/TurnTimer';
import { cx } from '../../lib/cards';
import { confetti, confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { DARTS_PER_TURN, type DartThrow, type DartsView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, useSeatOrder, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { AimBoard, type AimPhase } from './Aim';
import { bigCall, checkoutHint } from './calls';
import { StuckDart, toPct } from './Dart';
import { DartBoard } from './DartBoard';
import { dartsSfx } from './sounds';

const FLIGHT_MS = 280;
const PLACES = ['1st', '2nd', '3rd', '4th'];

export function DartsTable(props: TableProps) {
  const dv = props.view.plugged?.kind === 'darts' ? props.view.plugged.darts : null;
  if (!dv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Hanging the board…</p>
      </main>
    );
  }
  return <DartsTableInner {...props} dv={dv} />;
}

/** what a dart scored, as the caller would shout it */
export function dartCall(d: Pick<DartThrow, 'ring' | 'number' | 'score'>): string {
  if (d.ring === 'bull') return 'BULL!';
  if (d.ring === 'outerBull') return '25!';
  if (d.ring === 'miss') return 'Miss!';
  if (d.ring === 'treble') return `Treble ${d.number}!`;
  if (d.ring === 'double') return `Double ${d.number}`;
  return `${d.score}`;
}

interface Pop {
  key: number;
  text: string;
  x: number;
  y: number;
  tone: string;
}

function DartsTableInner({ view, actions, bubbles, auth, notes = [], dv }: TableProps & { dv: DartsView }) {
  const order = useSeatOrder(view, Object.keys(dv.left));
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState<Pop | null>(null);
  const [shake, setShake] = useState(0);
  const [thud, setThud] = useState<{ key: number; x: number; y: number } | null>(null);
  const [stamp, setStamp] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [aim, setAim] = useState<AimPhase>('off');
  const turnEndsAt = useTurnEndsAt(view);
  const overReady = useOverReady(view, 2600);
  const people = [...view.players, ...view.leftPlayers];
  const last = dv.last;
  // the turn is done but the darts stay up a moment before the next player
  const turnOver = !!dv.turnId && dv.thrown.length > 0 && (dv.thrown.length >= DARTS_PER_TURN || !!last?.bust || dv.left[dv.turnId] === 0);
  const myTurn = playing && dv.turnId === view.meId && !!me;
  const canThrow = myTurn && !turnOver && !busy;

  // each dart: whoosh, thud, the caller's shout; then bust / 180 / checkout moments
  const lastSeq = useRef(last?.seq ?? null);
  useEffect(() => {
    if (!last || last.seq === lastSeq.current) return;
    lastSeq.current = last.seq;
    dartsSfx.whoosh();
    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    later(FLIGHT_MS, () => {
      if (last.ring === 'miss') dartsSfx.miss();
      else dartsSfx.thud();
      if (last.ring === 'treble' || last.ring === 'bull') dartsSfx.good();
      const call = bigCall(last);
      setPop({ key: last.seq, text: call.text, x: last.x, y: last.y, tone: last.ring === 'bull' ? 'bull' : call.tone });
      if (last.ring !== 'miss') setThud({ key: last.seq, x: last.x, y: last.y });
      if (last.ring === 'bull') {
        setShake(last.seq);
        navigator.vibrate?.(40);
      }
    });
    const who = name(last.playerId);
    const turnSum = dv.thrown.reduce((a, d) => a + d.score, 0);
    if (last.bust) {
      later(FLIGHT_MS + 350, () => {
        dartsSfx.bust();
        setShake(last.seq);
        setStamp(last.seq);
        navigator.vibrate?.([60, 40, 60]);
        show({ text: 'Bust!', sub: `${who === 'You' ? 'You go' : `${who} goes`} back to ${dv.turnStart}`, tone: 'red' }, 0, 1500);
      });
    } else if (dv.left[last.playerId] === 0) {
      later(FLIGHT_MS + 300, () => {
        dartsSfx.checkout();
        navigator.vibrate?.([30, 30, 90]);
        const place = dv.places[last.playerId];
        show({ text: 'Checkout! 🏁', sub: `${who} ${who === 'You' ? 'finish' : 'finishes'} ${PLACES[(place ?? 1) - 1] ?? ''}`, tone: 'gold' }, 0, 2000);
        const el = boardRef.current;
        [0, 250, 550].forEach((ms) => later(ms, () => confettiAt(el, { count: 40, spread: 1.2 })));
      });
    } else if (last.dart === DARTS_PER_TURN && dv.thrown.length === DARTS_PER_TURN && turnSum === 180) {
      later(FLIGHT_MS + 300, () => {
        dartsSfx.oneEighty();
        navigator.vibrate?.([40, 30, 40, 30, 120]);
        show({ text: 'ONE HUNDRED AND EIGHTY!', sub: `${who} · 3 × treble 20`, tone: 'gold' }, 0, 2400);
        [0, 300, 700, 1100].forEach((ms, i) => later(ms, () => confetti(window.innerWidth * (0.2 + i * 0.2), window.innerHeight * 0.3, { count: 50, spread: 1.4 })));
      });
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [last?.seq]);

  // my turn starts: a chime
  useEffect(() => {
    if (myTurn && !turnOver) sfx.turn();
  }, [myTurn && !turnOver]);

  const toss = async (x: number, y: number) => {
    if (!canThrow) return;
    unlockSpeech();
    setBusy(true);
    await actions.gameMove({ kind: 'darts', move: { type: 'throw', x, y } });
    setBusy(false);
  };

  let status = '';
  if (playing && dv.turnId) {
    if (turnOver) status = last?.bust ? 'Bust!' : `${name(dv.turnId)}: ${dv.thrown.reduce((a, d) => a + d.score, 0)} this turn`;
    else if (myTurn) status = `Tap to stop each line · dart ${dv.thrown.length + 1} of ${DARTS_PER_TURN}`;
    else status = `${name(dv.turnId)} is throwing`;
  }
  const mine = dv.left[view.meId];
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`🎯 You have ${mine ?? '?'} left`}</span>
      <span>{`🏁 Start ${dv.start}, finish on exactly 0`}</span>
    </p>
  );
  const tips = ['Tap once to stop the up-down line, then again to stop the left-right line', 'Inner ring treble, outer ring double, bull 50', "Below 0 is a bust: the turn's darts don't count"];
  const placeOf = (id: string) => dv.places[id] ?? Object.keys(dv.places).length + 1 + order.filter((o) => !dv.places[o] && (dv.left[o] ?? 0) < (dv.left[id] ?? 0)).length;
  const bust = !!last?.bust && dv.thrown.some((d) => d.bust);

  const turnSum = dv.thrown.reduce((a, d) => a + d.score, 0);
  // the slate under the thrower: this turn's three darts, then a checkout hint
  const slate = (id: string) => {
    if (!playing || id !== dv.turnId || dv.places[id]) return null;
    const hint = !bust && !turnOver ? checkoutHint(dv.left[id] ?? 0) : null;
    return (
      <>
        <span className="da-slate-darts">
          {Array.from({ length: DARTS_PER_TURN }, (_, i) => {
            const d = dv.thrown[i];
            return (
              <i key={i} className={cx(d && 'hit', bust && 'bust', d && d.ring !== 'single' && `r-${d.ring}`)}>
                {d ? d.score : '·'}
              </i>
            );
          })}
          <em className={cx(bust && 'bust')}>{bust ? 'BUST' : `= ${turnSum}`}</em>
        </span>
        {hint && <span className="da-hint-line">🎯 {hint}</span>}
      </>
    );
  };

  return (
    <main className={cx('table lu-table pt-table pr-wide da-table', canThrow && 'pt-my-turn')} style={{ ['--turn-col' as string]: dv.turnId ? colorOf(dv.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room da-room" aria-hidden />
      <div ref={stageRef} className="lu-stage pt-stage da-stage">
        <div className="da-cabinet" aria-hidden />
        <div ref={boardRef} key={`s${shake}`} className={cx('da-mount', shake > 0 && 'shake', stamp === shake && stamp > 0 && 'hard')}>
          <AimBoard live={canThrow} zone={stageRef} onPhase={setAim} onThrow={(x, y) => void toss(x, y)}>
            <DartBoard />
            {thud && <span key={`t${thud.key}`} className="da-impact" style={{ left: toPct(thud.x), top: toPct(-thud.y) }} aria-hidden />}
            {dv.thrown.map((d, i) => (
              <StuckDart key={d.seq} x={d.x} y={d.y} color={colorOf(d.playerId)} fresh={d.seq === last?.seq} dead={bust} tilt={(i - 1) * 9} />
            ))}
            {pop && pop.tone === 'bull' && <span key={`b${pop.key}`} className="da-burst" style={{ left: toPct(pop.x), top: toPct(-pop.y) }} aria-hidden />}
            {pop && (
              <span key={`p${pop.key}`} className={cx('da-pop', `tone-${pop.tone}`)} style={{ left: toPct(Math.max(-0.75, Math.min(0.75, pop.x))), top: toPct(-Math.max(-0.7, Math.min(0.85, pop.y))) }}>
                {pop.text}
              </span>
            )}
          </AimBoard>
          {bust && stamp > 0 && (
            <span key={`st${stamp}`} className="da-stamp" aria-hidden>
              BUST
            </span>
          )}
          {canThrow && (aim === 'y' || aim === 'x') && (
            <span key={aim} className="da-step" aria-live="polite">
              <i>{aim === 'y' ? 1 : 2}</i>
              {aim === 'y' ? '👆 Tap to stop: up-down' : '👆 Tap to stop: left-right'}
            </span>
          )}
        </div>
      </div>
      <Rails
        items={order.map((id) => {
          const p = view.players.find((x) => x.id === id);
          const place = dv.places[id];
          return {
            id,
            corner: cornerOf(id),
            node: (
              <RailSeat
                player={p}
                goneName={people.find((x) => x.id === id)?.name}
                color={colorOf(id)}
                turn={playing && id === dv.turnId}
                mine={id === view.meId}
                bubble={bubbleOf(id)}
                turnEndsAt={turnEndsAt}
                turnSec={view.config.turnSec}
                onTap={p && p.id !== view.meId ? () => base.setTarget(p.id) : undefined}
                skin="da-slate"
                big={place ? `🏁 ${PLACES[place - 1]}` : dv.left[id]}
                bigKey={place ? `p${place}` : dv.left[id]}
                label={place ? 'checked out' : 'left'}
                turnText="Throwing"
                chip
              >
                {slate(id)}
              </RailSeat>
            ),
          };
        })}
      />
      <PartyChrome
        view={view}
        actions={actions}
        auth={auth}
        notes={notes}
        base={base}
        status={status}
        mine={canThrow}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Your darts come off the board"
        kickWhat="Their darts come off the board"
        watchNote="👀 Watching · you'll play next game"
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => (dv.places[id] ? '🏁 checked out' : `🎯 ${dv.left[id]} left`)} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
