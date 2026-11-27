// The Colour Wars table: a dark glass board of bright cells facing the player, cards on the rails, bursts replayed wave by wave
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-colorwar.css';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTableFx } from '../../components/TableFx';
import { useTurnEndsAt } from '../../components/TurnTimer';
import { cx } from '../../lib/cards';
import { confettiAt, reducedMotion } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import type { ColorWarCell, ColorWarView } from '../../types';
import type { TableProps } from '../registry';
import { useSeatOrder, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat, ShareBar } from '../turnkit/RailSeat';
import { ColorWarBoard } from './ColorWarBoard';
import { replay, WAVE_MS } from './sim';
import { colorwarSfx } from './sounds';

export function ColorWarTable(props: TableProps) {
  const cw = props.view.plugged?.kind === 'colorwar' ? props.view.plugged.colorwar : null;
  if (!cw) {
    return (
      <main className="screen center-screen">
        <p className="muted">Mixing the colours…</p>
      </main>
    );
  }
  return <ColorWarTableInner {...props} cw={cw} />;
}

interface Anim {
  cells: ColorWarCell[];
  fly: [number, number][];
  step: number;
  flipped: Set<number>;
  tapped: number | null;
}

/** cells whose owner changed from one board to the next (empty cells don't count) */
const changed = (a: ColorWarCell[], b: ColorWarCell[]) => new Set(b.flatMap((c, i) => (c.owner && a[i].owner !== c.owner ? [i] : [])));

function ColorWarTableInner({ view, actions, bubbles, auth, notes = [], cw }: TableProps & { cw: ColorWarView }) {
  const order = useSeatOrder(view, null);
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const [busy, setBusy] = useState(false);
  const [anim, setAnim] = useState<Anim | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const { fx, layer: fxLayer } = useTableFx();
  const turnEndsAt = useTurnEndsAt(view);
  const myTurn = playing && cw.turnId === view.meId && !!me;
  const people = [...view.players, ...view.leftPlayers];
  const iFirst = cw.firstMove.includes(view.meId);
  const countOf = (id: string) => cw.cells.filter((c) => c.owner === id).length;
  const isOut = (id: string) => !cw.alive.includes(id);

  // each tap: replay it from the board before, wave by wave, then settle on the server's board
  const prev = useRef({ cells: cw.cells, firstMove: cw.firstMove, seq: cw.last?.seq ?? null });
  const animEnd = useRef(0);
  useEffect(() => {
    const p = prev.current;
    const last = cw.last;
    prev.current = { cells: cw.cells, firstMove: cw.firstMove, seq: last?.seq ?? null };
    if (!last || last.seq === p.seq) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    colorwarSfx.drop();
    animEnd.current = Date.now() + 250 + last.waves.length * WAVE_MS;
    if (reducedMotion() || p.seq === null || last.seq - p.seq > 1 || p.cells.length !== cw.cells.length) {
      setAnim(null);
      return;
    }
    const { tapped, frames } = replay(cw.size, p.cells, last.playerId, last.cell, p.firstMove.includes(last.playerId), last.waves);
    setAnim({ cells: tapped, fly: [], step: 1, flipped: new Set(), tapped: last.cell });
    let before = tapped;
    frames.forEach((f, k) => {
      const t = 250 + k * WAVE_MS;
      const was = before;
      later(t, () => {
        setAnim({ cells: f.mid, fly: f.fly, step: 2 * k + 2, flipped: new Set(), tapped: null });
        colorwarSfx.burst(k);
      });
      later(t + 230, () => {
        const flips = changed(was, f.after);
        const took = [...flips].filter((i) => was[i].owner && was[i].owner !== last.playerId).length;
        setAnim({ cells: f.after, fly: [], step: 2 * k + 3, flipped: flips, tapped: null });
        if (took) colorwarSfx.flip(took);
      });
      before = f.after;
    });
    later(250 + frames.length * WAVE_MS, () => setAnim(null));
    // a chain gets a shout; a long one a buzz too
    if (frames.length >= 2) {
      later(400, () => {
        show({ text: `💥 CHAIN ×${frames.length}!`, sub: `${name(last.playerId)}`, tone: frames.length >= 4 ? 'gold' : 'info' }, 0, 1400);
        if (frames.length >= 4) {
          fx('call', boardRef.current, { text: `×${frames.length}`, color: colorOf(last.playerId) });
          navigator.vibrate?.([30, 30, 60]);
        }
      });
    }
  }, [cw]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // someone wiped out: a toast once their last cell has gone
  const aliveRef = useRef(cw.alive);
  useEffect(() => {
    const gone = aliveRef.current.filter((id) => !cw.alive.includes(id));
    aliveRef.current = cw.alive;
    if (!gone.length) return;
    const wait = Math.max(0, animEnd.current - Date.now()) + 150;
    window.setTimeout(() => {
      colorwarSfx.out();
      show({ text: gone.includes(view.meId) ? "💥 You're out!" : `💥 ${gone.map(name).join(' & ')} ${gone.length > 1 ? 'are' : 'is'} out!`, sub: playing ? `${cw.alive.length} left` : undefined, tone: 'red' }, 0, 2000);
      if (view.phase === 'over' && boardRef.current) confettiAt(boardRef.current, { count: 50, spread: 1 });
    }, wait);
  }, [cw.alive.join()]);

  // the podium waits for the last chain to finish
  const [overReady, setOverReady] = useState(view.phase === 'over');
  useEffect(() => {
    if (view.phase !== 'over') return setOverReady(false);
    const t = window.setTimeout(() => setOverReady(true), Math.max(0, animEnd.current - Date.now()) + 1600);
    return () => window.clearTimeout(t);
  }, [view.phase]);

  // my turn starts: a chime
  useEffect(() => {
    if (myTurn) sfx.turn();
  }, [myTurn]);

  const tap = async (cell: number) => {
    if (!myTurn || busy || anim) return;
    unlockSpeech();
    setBusy(true);
    await actions.gameMove({ kind: 'colorwar', move: { type: 'tap', cell } });
    setBusy(false);
  };

  const legal = new Set<number>(myTurn && !busy && !anim ? cw.cells.flatMap((c, i) => ((iFirst ? c.owner === null : c.owner === view.meId) ? [i] : [])) : []);
  let status = '';
  if (playing && cw.turnId) status = myTurn ? (iFirst ? 'Tap any empty cell to start' : 'Your turn: tap one of your cells') : `${name(cw.turnId)}'s turn`;
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`🎨 You hold ${countOf(view.meId)} cell${countOf(view.meId) === 1 ? '' : 's'}`}</span>
      <span>{`👥 ${cw.alive.length} still in`}</span>
    </p>
  );
  const tips = ['A cell bursts at 4 dots and takes its neighbours', 'Bursts chain: one tap can sweep the board', 'Keep your 3-dot cells away from bigger enemy cells'];
  const n = order.length;
  const placeOf = (id: string) => cw.places[id] ?? (cw.alive.includes(id) ? 1 + order.filter((o) => countOf(o) > countOf(id) && cw.alive.includes(o)).length : n);

  const total = cw.size * cw.size;
  return (
    <main className={cx('table lu-table pt-table pr-wide cw-table', myTurn && 'pt-my-turn')} style={{ ['--turn-col' as string]: cw.turnId ? colorOf(cw.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room cw-room" aria-hidden />
      <div className="lu-stage pt-stage">
        <div className="lu-plane pt-plane">
          <div ref={boardRef} className="cw-tray">
            <ColorWarBoard
              size={cw.size}
              cells={anim?.cells ?? cw.cells}
              fly={anim?.fly ?? []}
              flyColor={colorOf(cw.last?.playerId)}
              step={anim?.step ?? 0}
              flipped={anim?.flipped ?? new Set()}
              tapped={anim?.tapped ?? null}
              colorOf={colorOf}
              legal={legal}
              onTap={(c) => void tap(c)}
            />
          </div>
        </div>
        <div className="cw-share">
          <ShareBar parts={order.map((id) => ({ id, n: countOf(id), color: colorOf(id) }))} total={total} label="Territory" />
        </div>
      </div>
      <Rails
        items={order.map((id) => {
          const p = view.players.find((x) => x.id === id);
          const out = isOut(id) && playing;
          const placing = cw.firstMove.includes(id);
          return {
            id,
            corner: cornerOf(id),
            node: (
              <RailSeat
                player={p}
                goneName={people.find((x) => x.id === id)?.name}
                color={colorOf(id)}
                turn={playing && id === cw.turnId}
                mine={id === view.meId}
                out={out}
                bubble={bubbleOf(id)}
                turnEndsAt={turnEndsAt}
                turnSec={view.config.turnSec}
                onTap={p && p.id !== view.meId ? () => base.setTarget(p.id) : undefined}
                big={out ? '💥' : placing ? '–' : countOf(id)}
                bigKey={out ? 'out' : countOf(id)}
                label={out ? 'out' : placing ? 'to place' : `cell${countOf(id) === 1 ? '' : 's'}`}
                turnText="Tapping"
                chip
              />
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
        mine={myTurn}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Your cells empty out"
        kickWhat="Their cells empty out"
        watchNote="👀 Watching · you'll play next game"
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => (cw.alive.includes(id) ? `🎨 ${countOf(id)} cells` : '💥 out')} onNext={() => base.setOverSeen(true)} />}
      />
      {fxLayer}
    </main>
  );
}
