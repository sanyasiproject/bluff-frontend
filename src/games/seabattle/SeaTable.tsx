// The Sea Battle table: placement of my fleet, then the target sea big in the middle, everyone's mini sea on their seat card, powers below
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-sea.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { useNow } from '../../lib/useNow';
import { seaRandomFleet, SEA_COLS, type SeaMoveInput, type SeaShip, type SeaView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, useSeatOrder, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { AimOverlay, PowerBar, useAim } from './Aim';
import { fleetOk, Placement } from './Placement';
import { SeaGrid } from './SeaGrid';
import { useSeaShots } from './useSeaShots';

export function SeaTable(props: TableProps) {
  const p = props.view.plugged as unknown as { kind: string; seabattle?: SeaView } | null | undefined;
  const bv = p?.kind === 'seabattle' ? p.seabattle : null;
  if (!bv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Charting the seas…</p>
      </main>
    );
  }
  return <SeaInner {...props} bv={bv} />;
}

function SeaInner({ view, actions, bubbles, auth, notes = [], bv }: TableProps & { bv: SeaView }) {
  const order = useSeatOrder(view, Object.keys(bv.seas));
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const overReady = useOverReady(view, 2600);
  const people = [...view.players, ...view.leftPlayers];
  const gotAt = useMemo(() => Date.now(), [bv]);
  const now = useNow(500);
  const meId = view.meId;
  const alive = (id: string) => (bv.seas[id]?.afloat.length ?? 0) > 0;
  const foes = order.filter((id) => id !== meId && alive(id));
  const [target, setTarget] = useState<string | null>(null);
  const aim = useAim();
  const [busy, setBusy] = useState(false);
  const placing = bv.phase === 'place';
  const myTurn = playing && !!me && bv.phase === 'battle' && bv.turnId === meId;

  // the big sea: my pick on my turn, else the sea being shot at
  const fresh = useSeaShots(bv, meId, name, show, (s) => {
    if (s.by !== meId) setTarget(s.target);
  });
  const big = target && bv.seas[target] && (target !== meId || !myTurn) ? target : (foes[0] ?? order.find((id) => id !== meId) ?? meId);
  useEffect(() => {
    if (!myTurn) return;
    sfx.turn();
    aim.reset();
    if (!target || target === meId || !alive(target)) setTarget(foes[0] ?? null);
  }, [myTurn]);

  // placement: a random fleet to start, sent quietly whenever it's legal
  const [ships, setShips] = useState<SeaShip[]>(() => (bv.seas[meId]?.ships.length ? bv.seas[meId].ships.map(({ x, y, len, v }) => ({ x, y, len, v })) : seaRandomFleet()));
  const sendT = useRef(0);
  const placeShips = (next: SeaShip[]) => {
    setShips(next);
    window.clearTimeout(sendT.current);
    if (fleetOk(next)) sendT.current = window.setTimeout(() => void actions.gameMoveQuiet({ kind: 'seabattle', move: { type: 'place', ships: next } } as never), 250);
  };
  useEffect(() => {
    if (placing && me && !bv.ready[meId]) placeShips(ships);
  }, [placing]);
  const ready = async () => {
    if (!fleetOk(ships)) return actions.toast('Ships may not overlap or touch');
    unlockSpeech();
    await actions.gameMove({ kind: 'seabattle', move: { type: 'place', ships } } as never);
    await actions.gameMove({ kind: 'seabattle', move: { type: 'ready' } } as never);
  };

  const send = async (move: SeaMoveInput) => {
    if (!myTurn || busy) return;
    unlockSpeech();
    setBusy(true);
    const ok = await actions.gameMove({ kind: 'seabattle', move } as never);
    setBusy(false);
    if (ok) aim.reset();
  };
  const onCell = (x: number, y: number) => {
    if (!myTurn || big === meId) return;
    const m = aim.tap(big, x, y, bv.seas[big].shots);
    if (m) void send(m);
  };

  const local = (t: number | null) => (t === null ? null : gotAt + (t - bv.now));
  const placeLeft = Math.max(0, Math.ceil(((local(bv.placeEndsAt) ?? now) - now) / 1000));
  let status = '';
  if (playing && placing) status = bv.ready[meId] ? 'Waiting for the others…' : `Place your fleet · ${placeLeft}s`;
  else if (playing && bv.turnId) status = myTurn ? (big === meId ? 'Pick a sea to fire at' : `Fire at ${name(big)}'s sea`) : bv.last?.by === bv.turnId ? `${name(bv.turnId)} ➜ ${name(bv.last.target)}` : `${name(bv.turnId)} is aiming…`;
  const placeOf = (id: string) => bv.places[id] ?? 1;
  const myBoard = bv.seas[meId];
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`🚢 ${myBoard?.afloat.length ?? 0} of 5 ships afloat`}</span>
      <span>{bv.powers ? `⚡ Powers on · you hold ${(bv.held[meId] ?? []).length}` : '⚡ Powers off'}</span>
    </p>
  );
  const tips = ['Tap a mini sea on a card to aim at that player', 'A hit or a sink fires again', 'Sink a ship to earn a power'];
  const lastFor = (id: string) => (fresh && fresh.target === id ? fresh : null);
  const radarsOn = (id: string) => bv.radars.filter((r) => r.target === id);
  const hoverCell = aim.hover ? `${SEA_COLS[aim.hover[0]]}${aim.hover[1] + 1}` : null;

  return (
    <main className={cx('table lu-table pt-table pr-wide sb-table', placing && 'placing', myTurn && 'pt-my-turn')} style={{ ['--turn-col' as string]: bv.turnId ? colorOf(bv.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room sb-room" aria-hidden />
      <div className="lu-stage pt-stage sb-stage">
        {placing && me ? (
          <Placement ships={ships} onShips={placeShips} locked={!!bv.ready[meId]} />
        ) : (
          <SeaGrid
            board={bv.seas[big] ?? { shots: [], ships: [], afloat: [] }}
            radars={radarsOn(big)}
            fx={lastFor(big)}
            live={myTurn && big !== meId}
            onCell={myTurn && big !== meId ? onCell : undefined}
            onHover={myTurn ? aim.setHover : undefined}
            overlay={myTurn && big !== meId ? <AimOverlay aim={aim} /> : undefined}
          />
        )}
      </div>
      <div className="sb-below">
        {placing && me ? (
          <>
            <button className="sb-btn" disabled={!!bv.ready[meId]} onClick={() => placeShips(seaRandomFleet())}>🔀 Shuffle</button>
            <small className="sb-place-hint">Drag a ship · tap it to turn</small>
            <button className={cx('sb-btn go', !fleetOk(ships) && 'bad')} disabled={!!bv.ready[meId]} onClick={() => void ready()}>{bv.ready[meId] ? '✓ Ready' : 'Ready'}</button>
          </>
        ) : (
          <>
            <span className="sb-whose" style={{ '--pc': colorOf(big) } as CSSProperties}>
              {big === meId ? 'Your sea' : `${name(big)}'s sea`}
              {hoverCell && myTurn ? ` · ${hoverCell}` : ''}
            </span>
            {me && bv.powers && <PowerBar held={bv.held[meId] ?? []} aim={aim} live={myTurn && !busy} />}
          </>
        )}
      </div>
      <Rails
        items={order.map((id) => {
          const p = view.players.find((q) => q.id === id);
          const sea = bv.seas[id];
          const shotAt = playing && !placing && bv.last && bv.last.target === id && bv.last.by === bv.turnId;
          return {
            id,
            corner: cornerOf(id),
            node: (
              <RailSeat
                player={p}
                goneName={people.find((q) => q.id === id)?.name}
                color={colorOf(id)}
                turn={playing && !placing && id === bv.turnId}
                mine={id === meId}
                out={!placing && !alive(id)}
                bubble={bubbleOf(id)}
                turnEndsAt={local(bv.deadline)}
                turnSec={20}
                skin={cx('sb-seat', big === id && !placing && 'targeted', shotAt && 'shot-at')}
                big={placing ? (bv.ready[id] ? '✓' : '…') : (sea?.afloat.length ?? 0)}
                bigKey={placing ? `r${bv.ready[id]}` : sea?.afloat.length}
                label={placing ? (bv.ready[id] ? 'ready' : 'placing') : alive(id) ? 'ships' : '💀 sunk'}
                turnText="Firing"
              >
                {!placing && sea && (
                  <button className="sb-mini" aria-label={`Aim at ${name(id)}'s sea`} onClick={() => setTarget(id)} disabled={id === meId && myTurn}>
                    <SeaGrid board={sea} small radars={radarsOn(id)} fx={lastFor(id)} />
                    {shotAt && <i className="sb-arrow">🎯</i>}
                  </button>
                )}
                {bv.powers && (bv.held[id] ?? []).length > 0 && <span className="sb-held">{(bv.held[id] ?? []).map((h) => ({ radar: '📡', salvo: '💥', torpedo: '🚀' })[h]).join(' ')}</span>}
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
        mine={myTurn || (placing && !bv.ready[meId])}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Your fleet sinks out of the game"
        kickWhat="Their fleet leaves the game"
        watchNote="👀 Watching · you'll play next game"
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => `🚢 ${bv.seas[id]?.afloat.length ?? 0} ships afloat`} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
