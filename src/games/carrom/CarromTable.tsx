// The Carrom table: the board facing me (my baseline at the bottom), slide-and-pull striker, the shot replayed at 60 fps, seats with pocketed coins
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-carrom.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import type { TableProps } from '../registry';
import { useOverReady, useSeatOrder, usePartyBase } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { CarromAim } from './CarromAim';
import { CarromBoardArt, Coin, CoinDefs, VIEWBOX } from './CarromBoard';
import { COIN_NAME, localTime, sideOf, TEAM_COLORS, teamOf } from './calls';
import { CARROM, CARROM_FOUL_TEXT, coinsToView, colorOfId, nearestFit, strikerSpot, toView, type CarromShotView, type CarromView } from './lib';
import { carromSfx } from './sounds';
import { useShotPlayback } from './useShotPlayback';

export function CarromTable(props: TableProps) {
  const p = props.view.plugged as unknown as { kind: string; carrom?: CarromView } | null | undefined;
  const dv = p?.kind === 'carrom' ? p.carrom : null;
  if (!dv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Powdering the board…</p>
      </main>
    );
  }
  return <CarromInner {...props} dv={dv} />;
}

function CarromInner({ view, actions, bubbles, auth, notes = [], dv }: TableProps & { dv: CarromView }) {
  const order = useSeatOrder(view, Object.keys(dv.sides));
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const overReady = useOverReady(view, 2400);
  const people = [...view.players, ...view.leftPlayers];
  const boardRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0.5);
  const [busy, setBusy] = useState(false);
  const gotAt = useMemo(() => Date.now(), [dv]);
  const mySide = sideOf(dv, me ? view.meId : order[0]);

  const onDone = (shot: CarromShotView) => {
    const who = name(shot.playerId);
    if (shot.foul) {
      carromSfx.foul();
      show({ text: 'Foul!', sub: `${CARROM_FOUL_TEXT[shot.foul].replace(/^Foul: /, '')}${shot.returned.length ? ' · a coin goes back' : ''}`, tone: 'red' }, 0, 2000);
    } else if (shot.queen === 'pocketed') {
      carromSfx.queen();
      show({ text: 'Queen! 👑', sub: shot.playerId === view.meId ? 'Cover the queen!' : `${who} must cover her`, tone: 'gold' }, 0, 1900);
    } else if (shot.queen === 'covered') {
      carromSfx.queen();
      show({ text: 'Queen covered! 👑', sub: `${who} keeps her`, tone: 'gold' }, 0, 1800);
    } else if (shot.queen === 'returned') {
      show({ text: 'Queen goes back', sub: 'She was not covered', tone: 'info' }, 0, 1700);
    } else if (shot.again && shot.pocketed.length) {
      carromSfx.good();
      show({ text: 'Shoot again!', sub: dv.mode === 'freestyle' && shot.points > 0 ? `+${shot.points}` : `${who} pocketed ${shot.pocketed.length}`, tone: 'good' }, 0, 1300);
    }
    if (shot.pocketed.length && !shot.foul) confettiAt(boardRef.current, { count: 12 + shot.pocketed.length * 6, spread: 0.6 });
  };
  const rolling = useShotPlayback(dv, onDone);

  const myTurn = playing && !!me && dv.turnId === view.meId && !rolling;
  const coinsView = useMemo(() => coinsToView(mySide, dv.coins), [dv.coins, mySide]);
  // my turn: the striker starts at the free spot nearest the middle
  useEffect(() => {
    if (myTurn) {
      sfx.turn();
      setX(nearestFit(coinsView, 0, 0.5) ?? 0.5);
    }
  }, [myTurn, dv.last?.seq]);

  const shoot = async (dx: number, dy: number, power: number) => {
    if (!myTurn || busy) return;
    unlockSpeech();
    setBusy(true);
    await actions.gameMove({ kind: 'carrom', move: { type: 'shot', x, dx, dy, power } } as never);
    setBusy(false);
  };

  const queenMine = dv.queen.state === 'pending' && dv.queen.by === view.meId;
  let status = '';
  if (playing && dv.turnId && !rolling) {
    if (myTurn) status = queenMine ? '👑 Cover the queen!' : 'Slide the striker, pull back and let go';
    else status = `${name(dv.turnId)} is aiming${dv.queen.state === 'pending' && dv.queen.by === dv.turnId ? ' · must cover the queen' : ''}`;
  }
  const seatColor = (id: string) => {
    const t = teamOf(dv, id);
    return t === null ? colorOf(id) : TEAM_COLORS[t];
  };
  const partnerOf = (id: string) => dv.teams?.find((t) => t.includes(id))?.find((o) => o !== id);
  const colourOf = (id: string) => (dv.colors?.[id] ? COIN_NAME[dv.colors[id]] : null);
  // Classic: the chip names my coin colour (and the team in 2v2); Freestyle keeps the player colour
  const chipOf = (id: string) => {
    const c = colourOf(id);
    if (!c) return undefined;
    const t = teamOf(dv, id);
    return t === null ? c : `${c} · ${t ? 'B' : 'A'}`;
  };
  const placeOf = (id: string) => dv.places[id] ?? 1 + order.filter((o) => (dv.scores[o] ?? 0) > (dv.scores[id] ?? 0)).length;
  const boardsText = dv.length === 'quick' ? 'one board' : dv.mode === 'classic' ? 'first to 25' : `${dv.boards} boards`;
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{dv.mode === 'classic' ? `⚪ You play ${colourOf(view.meId) ?? '?'}` : '🎯 Any coin: white 20, black 10, queen 50'}</span>
      <span>{`🏁 Board ${dv.board} · ${boardsText}`}</span>
    </p>
  );
  const tips = ['Drag the striker along your baseline, then pull back from it like a slingshot', 'The dotted line shows the first coin you will hit', 'Pocket the queen, then cover her with one of your coins'];
  const endsAt = localTime(dv.deadline, dv.now, gotAt);

  // the striker resting on the next player's baseline (mine is drawn by the aim)
  const rest = !rolling && dv.turnId && dv.turnId !== view.meId ? toView(mySide, ...strikerSpot(sideOf(dv, dv.turnId), 0.5)) : null;

  return (
    <main className={cx('table lu-table pt-table pr-wide cr-table', myTurn && 'pt-my-turn')} style={{ ['--turn-col' as string]: dv.turnId ? seatColor(dv.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room cr-room" aria-hidden />
      <div className="lu-stage pt-stage cr-stage">
        <div ref={boardRef} className="cr-mount">
          <svg className="cr-svg" viewBox={VIEWBOX} role="img" aria-label="Carrom board">
            <CoinDefs />
            <CarromBoardArt />
            {rolling
              ? rolling.map((p) => {
                  const [vx, vy] = toView(mySide, p.x, p.y);
                  return <Coin key={p.id} kind={p.c} x={vx} y={vy} r={p.c === 's' ? CARROM.strikerR : CARROM.coinR} />;
                })
              : coinsView.map((c) => <Coin key={c.id} kind={c.c} x={c.x} y={c.y} r={CARROM.coinR} />)}
            {rest && <Coin kind="s" x={rest[0]} y={rest[1]} r={CARROM.strikerR} />}
            {!rolling && me && dv.turnId === view.meId && playing && (
              <CarromAim live={myTurn && !busy} coins={coinsView} x={x} onX={setX} onShoot={(dx, dy, p) => void shoot(dx, dy, p)} onBad={() => actions.toast('Move the striker off the coin')} />
            )}
          </svg>
        </div>
        {queenMine && myTurn && <span className="cr-queen-pill">👑 Cover the queen!</span>}
      </div>
      <Rails
        items={order.map((id) => {
          const p = view.players.find((q) => q.id === id);
          const potted = dv.pocketed[id] ?? [];
          const partner = partnerOf(id);
          return {
            id,
            corner: cornerOf(id),
            node: (
              <RailSeat
                player={p}
                goneName={people.find((q) => q.id === id)?.name}
                color={seatColor(id)}
                turn={playing && id === dv.turnId}
                mine={id === view.meId}
                bubble={bubbleOf(id)}
                turnEndsAt={endsAt}
                turnSec={20}
                onTap={p && p.id !== view.meId ? () => base.setTarget(p.id) : undefined}
                skin="cr-seat"
                big={dv.scores[id] ?? 0}
                bigKey={dv.scores[id] ?? 0}
                label="points"
                turnText="Aiming"
                chip
                chipName={chipOf(id)}
                icon={dv.colors?.[id] ? <i className={`cr-mini cr-chip-coin c-${dv.colors[id]}`} aria-hidden /> : undefined}
              >
                <span className="cr-potted" aria-label={`${potted.length} pocketed`}>
                  {potted.slice(-10).map((cid) => (
                    <i key={cid} className={`cr-mini c-${colorOfId(cid)}`} />
                  ))}
                  {potted.length === 0 && <em>no coins yet</em>}
                </span>
                {partner && <span className="cr-partner">🤝 {name(partner)}</span>}
                {dv.queen.state === 'pending' && dv.queen.by === id && <span className="cr-partner">👑 cover the queen</span>}
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
        mine={myTurn}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Your coins stay pocketed"
        kickWhat="Their coins stay pocketed"
        watchNote="👀 Watching · you'll play next game"
        youAre={me && dv.colors ? { color: seatColor(view.meId), name: chipOf(view.meId) ?? 'White' } : undefined}
        myIcon={me && dv.colors?.[view.meId] ? <i className={`cr-mini cr-chip-coin c-${dv.colors[view.meId]}`} aria-hidden /> : undefined}
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={seatColor} line={(id) => `🎯 ${dv.scores[id] ?? 0} points · ${(dv.pocketed[id] ?? []).length} coins`} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
