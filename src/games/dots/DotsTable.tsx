// The Dots and Boxes table: a flat notebook page filling the screen, player cards on the rails, marker lines, boxes that pop in the owner's colour
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-dots.css';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTableFx } from '../../components/TableFx';
import { useTurnEndsAt } from '../../components/TurnTimer';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import type { DotsView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, useSeatOrder, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat, ShareBar } from '../turnkit/RailSeat';
import { DotsBoard } from './DotsBoard';
import { dotsSfx } from './sounds';

const BOX_ICONS = ['⭐', '💎', '🔥', '🍀'];

export function DotsTable(props: TableProps) {
  const dv = props.view.plugged?.kind === 'dots' ? props.view.plugged.dots : null;
  if (!dv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Drawing the dots…</p>
      </main>
    );
  }
  return <DotsTableInner {...props} dv={dv} />;
}

function DotsTableInner({ view, actions, bubbles, auth, notes = [], dv }: TableProps & { dv: DotsView }) {
  const order = useSeatOrder(view, Object.keys(dv.scores));
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const [busy, setBusy] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const { fx, layer: fxLayer } = useTableFx();
  const turnEndsAt = useTurnEndsAt(view);
  const overReady = useOverReady(view, 1500);
  const myTurn = playing && dv.turnId === view.meId && !!me;
  const people = [...view.players, ...view.leftPlayers];
  // each player's boxes carry their own little icon
  const iconOf = (id: string) => BOX_ICONS[Math.max(0, order.indexOf(id)) % BOX_ICONS.length];
  const total = dv.size * dv.size;
  const closed = Object.keys(dv.boxes).length;

  // each line: the pen sound; boxes pop with a burst; closing gives another go
  const lastSeq = useRef(dv.last?.seq ?? null);
  useEffect(() => {
    const last = dv.last;
    if (!last || last.seq === lastSeq.current) return;
    lastSeq.current = last.seq;
    dotsSfx.draw();
    if (last.closed.length === 0) return;
    if (last.playerId === view.meId) dotsSfx.box(last.closed.length);
    else dotsSfx.lost();
    const el = boardRef.current?.querySelector('.dt-box.pop');
    if (el) confettiAt(el, { count: 14 * last.closed.length, spread: 0.5 });
    navigator.vibrate?.(last.playerId === view.meId ? [25, 30, 25] : 15);
    const two = last.closed.length > 1;
    if (closed >= total) return;
    if (last.playerId === view.meId) {
      dotsSfx.again();
      show({ text: two ? 'Double box! Go again!' : 'Go again!', sub: two ? '+2 boxes' : '+1 box', tone: 'good' }, 250);
    } else show({ text: two ? `${name(last.playerId)}: double box!` : `${name(last.playerId)} goes again`, sub: `+${last.closed.length} box${two ? 'es' : ''}`, tone: 'info' }, 250);
    if (two && el) fx('call', el, { text: '+2', color: colorOf(last.playerId) });
  }, [dv.last?.seq]);

  // my turn starts: a chime
  useEffect(() => {
    if (myTurn) sfx.turn();
  }, [myTurn]);

  const draw = async (line: number) => {
    if (!myTurn || busy) return;
    unlockSpeech();
    setBusy(true);
    await actions.gameMove({ kind: 'dots', move: { type: 'line', line } });
    setBusy(false);
  };

  let status = '';
  if (playing && dv.turnId) status = myTurn ? (dv.last?.playerId === view.meId && dv.last.closed.length ? 'Go again! Draw a line' : 'Your turn: draw a line') : `${name(dv.turnId)}'s turn`;
  const mine = dv.scores[view.meId] ?? 0;
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`📦 You have ${mine} box${mine === 1 ? '' : 'es'}`}</span>
      <span>{`🧮 ${closed} of ${total} boxes closed`}</span>
    </p>
  );
  const tips = ['Close a box and you go again', "Don't draw the third side of a box: the next player takes it", 'Tap the gap between two dots, or drag from dot to dot'];
  const score = (id: string) => dv.scores[id] ?? 0;
  const placeOf = (id: string) => 1 + order.filter((o) => score(o) > score(id)).length;

  return (
    <main className={cx('table lu-table pt-table pr-wide dt-table', myTurn && 'pt-my-turn')} style={{ ['--turn-col' as string]: dv.turnId ? colorOf(dv.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room dt-room" aria-hidden />
      <div className="lu-stage pt-stage">
        <div className="lu-plane pt-plane">
          <div ref={boardRef} className="dt-paper">
            <DotsBoard dv={dv} colorOf={colorOf} initialOf={iconOf} live={myTurn && !busy} myColor={colorOf(view.meId)} onLine={(l) => void draw(l)} />
          </div>
        </div>
        <div className="dt-share">
          <ShareBar parts={order.map((id) => ({ id, n: score(id), color: colorOf(id) }))} total={total} label={`${closed} of ${total} boxes closed`} />
        </div>
      </div>
      <Rails
        items={order.map((id) => {
          const p = view.players.find((x) => x.id === id);
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
                big={score(id)}
                bigKey={score(id)}
                label={<>{iconOf(id)} box{score(id) === 1 ? '' : 'es'}</>}
                turnText="Drawing"
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
        leaveWhat="Your boxes stay on the board"
        kickWhat="Their boxes stay on the board"
        watchNote="👀 Watching · you'll play next game"
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => `${score(id)} box${score(id) === 1 ? '' : 'es'}`} onNext={() => base.setOverSeen(true)} />}
      />
      {fxLayer}
    </main>
  );
}
