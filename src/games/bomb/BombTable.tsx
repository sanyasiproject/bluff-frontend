// The Bomb Pass table: players round a table with hearts, a lit bomb wobbling by its holder, tossed in an arc on a right answer, BOOM on the fuse; the task card on the right
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-bomb.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNow } from '../../lib/useNow';
import { cx } from '../../lib/cards';
import { confetti } from '../../lib/motion';
import { unlockSpeech } from '../../lib/speech';
import type { BombView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, useSeatOrder, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { RailSeat } from '../turnkit/RailSeat';
import { BombArt, Blast } from './BombArt';
import { bombSfx } from './sounds';
import { TaskCard } from './TaskCard';
import { useBombFx } from './useBombFx';

/** seat spots round the table (% of the arena), me at the bottom, then clockwise */
const SPOTS: Record<number, [number, number][]> = {
  1: [[50, 84]],
  2: [[50, 84], [50, 15]],
  3: [[50, 84], [17, 28], [83, 28]],
  4: [[50, 84], [14, 48], [50, 15], [86, 48]],
};
const toward = ([x, y]: [number, number], k: number): [number, number] => [x + (50 - x) * k, y + (48 - y) * k];

export function BombTable(props: TableProps) {
  const p = props.view.plugged as unknown as { kind: string; bomb?: BombView } | null | undefined;
  const bv = p?.kind === 'bomb' ? p.bomb : null;
  if (!bv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Lighting the fuse…</p>
      </main>
    );
  }
  return <BombInner {...props} bv={bv} />;
}

function BombInner({ view, actions, bubbles, auth, notes = [], bv }: TableProps & { bv: BombView }) {
  const order = useSeatOrder(view, Object.keys(bv.hearts));
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, bubbleOf, show } = base;
  const overReady = useOverReady(view, 2600);
  const people = [...view.players, ...view.leftPlayers];
  const arenaRef = useRef<HTMLDivElement>(null);
  const bombRef = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState<number | null>(null);
  const now = useNow(250);
  const gotAt = useMemo(() => Date.now(), [bv]);

  const at = Math.max(0, order.indexOf(view.meId));
  const n = order.length;
  const spotOf = (id: string): [number, number] => (SPOTS[n] ?? SPOTS[4])[(order.indexOf(id) - at + n) % n] ?? [50, 50];
  const bombSpot = (id: string) => toward(spotOf(id), 0.74);
  const holder = bv.holder;
  const live = playing && bv.phase === 'play' && !!holder;
  const iHold = live && !!me && holder === view.meId;

  const fx = useBombFx(bv, view.meId, arenaRef, bombRef, bombSpot, (id, out) =>
    show({ text: 'BOOM! 💥', sub: `${name(id)} ${out ? (id === view.meId ? 'are out' : 'is out') : id === view.meId ? 'lose a heart' : 'loses a heart'}`, tone: 'red' }, 300, 1900),
  );

  useEffect(() => {
    if (view.phase === 'over' && bv.places[view.meId] === 1) {
      bombSfx.win();
      confetti(window.innerWidth / 2, window.innerHeight * 0.3, { count: 80, spread: 1.4 });
    }
  }, [view.phase]);

  const task = live ? bv.task : null;
  const answer = async (choice: number) => {
    if (!task || !iHold || sent === task.id || fx.wrong) return;
    unlockSpeech();
    setSent(task.id);
    const ok = await actions.gameMove({ kind: 'bomb', move: { type: 'answer', task: task.id, choice } } as never);
    if (!ok) setSent(null);
  };
  useEffect(() => setSent(null), [task?.id, fx.wrong]);

  const alive = (id: string) => (bv.hearts[id] ?? 0) > 0;
  const nextOf = (id: string) => {
    const i = order.indexOf(id);
    return [...order.slice(i + 1), ...order.slice(0, i)].find(alive);
  };
  const serverNow = bv.now + (now - gotAt);
  const countdown = bv.phase === 'countdown' ? Math.max(1, Math.ceil((bv.startsAt - serverNow) / 1000)) : null;
  let status = '';
  if (playing) {
    if (countdown) status = `Lighting the fuse… ${countdown}`;
    else if (bv.phase === 'boom') status = 'Next round in a moment…';
    else if (iHold) status = '💣 Solve it to pass the bomb!';
    else if (holder) status = `${name(holder)} has the bomb`;
  }
  const placeOf = (id: string) => bv.places[id] ?? 1;
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`❤️ ${bv.hearts[view.meId] ?? 0} of ${bv.maxHearts} hearts`}</span>
      <span>{`🔁 Round ${bv.round} · ${bv.speed === 'fast' ? 'fast fuse' : 'normal fuse'}`}</span>
    </p>
  );
  const tips = ['Solve the task to pass the bomb clockwise', 'A wrong answer keeps the bomb: try the next task', 'Nobody knows the fuse: faster ticks mean it is close'];
  const [hx, hy] = holder ? bombSpot(holder) : [50, 48];
  const fast = bv.lastPass && bv.lastPass.ms < 1500 ? bv.lastPass : null;

  return (
    <main className={cx('table lu-table pt-table bp-table', fx.shake && 'bp-shake', iHold && 'pt-my-turn')} style={{ ['--turn-col' as string]: holder ? colorOf(holder) : '#fff' } as CSSProperties}>
      <div className="lu-room bp-room" aria-hidden />
      <div ref={arenaRef} className="bp-arena">
        <div className="bp-felt" aria-hidden />
        {countdown && (
          <span key={countdown} className="bp-count" aria-live="polite">
            {countdown}
          </span>
        )}
        {order.map((id) => {
          const p = view.players.find((q) => q.id === id);
          const [x, y] = spotOf(id);
          const h = bv.hearts[id] ?? 0;
          return (
            <div key={id} className={cx('bp-spot', fx.soot === id && 'soot', holder === id && live && 'holding', fx.wrong && holder === id && 'wrong')} style={{ left: `${x}%`, top: `${y}%` }}>
              <RailSeat
                player={p}
                goneName={people.find((q) => q.id === id)?.name}
                color={colorOf(id)}
                turn={live && id === holder}
                mine={id === view.meId}
                out={h <= 0}
                bubble={bubbleOf(id)}
                onTap={p && p.id !== view.meId ? () => base.setTarget(p.id) : undefined}
                skin="bp-seat"
                big={
                  <span className="bp-hearts" aria-label={`${h} hearts`}>
                    {Array.from({ length: bv.maxHearts }, (_, i) => (
                      <i key={`${i}-${i < h}`} className={cx(i < h ? 'on' : 'off', fx.blast?.id === id && i === h && 'pop')}>
                        {i < h ? '❤️' : '🖤'}
                      </i>
                    ))}
                  </span>
                }
                label={h <= 0 ? '💀 out' : fast && fast.from === id ? `⚡ ${(fast.ms / 1000).toFixed(1)}s pass` : 'hearts'}
                turnText="Holding!"
                myTurnText="Pass it!"
              />
              {fx.blast?.id === id && (
                <span key={fx.blast.at} className="bp-blast">
                  <Blast />
                </span>
              )}
            </div>
          );
        })}
        {live && holder && (
          <div className="bp-bomb-at" style={{ left: `${hx}%`, top: `${hy}%` }}>
            <div ref={bombRef} className={cx('bp-bomb', `heat-${bv.heat}`, fx.wrong && 'shaking')}>
              <BombArt heat={bv.heat} />
            </div>
          </div>
        )}
      </div>
      <aside className="bp-side">
        {task ? (
          <TaskCard task={task} mine={iHold} wrong={fx.wrong} disabled={sent === task.id || fx.wrong} who={holder ? name(holder) : undefined} onAnswer={(i) => void answer(i)} />
        ) : (
          <div className="bp-wait">
            {countdown ? <b>💣 Get ready!</b> : <b>💥 New fuse coming…</b>}
            {holder && me && alive(view.meId) && nextOf(holder) === view.meId && <small>It comes to you next!</small>}
          </div>
        )}
        {task && !iHold && me && alive(view.meId) && holder && nextOf(holder) === view.meId && <small className="bp-next">It comes to you next!</small>}
      </aside>
      <PartyChrome
        view={view}
        actions={actions}
        auth={auth}
        notes={notes}
        base={base}
        status={status}
        mine={iHold}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="You drop out of the circle"
        kickWhat="They drop out of the circle"
        watchNote="👀 Watching · you'll play next game"
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => `❤️ ${bv.hearts[id] ?? 0} hearts left`} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
