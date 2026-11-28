// The Saanp Seedhi table: the 10×10 board tilted on the table like Ludo, gotis that walk by themselves, the Ludo dice and seats
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-goti.css';
import '../../styles/land-ludo-dice.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-snakes.css';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { LevelUp } from '../../components/LevelUp';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { GameOver } from '../../components/Overlays';
import { QuickChat } from '../../components/QuickChat';
import { SeatSheet } from '../../components/Table';
import { useTableFx } from '../../components/TableFx';
import { TableInfo } from '../../components/TableInfo';
import { useTurnEndsAt } from '../../components/TurnTimer';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { levelOf, LUDO_COLOR_HEX, SNAKES_BITE_BACK, type LudoColor, type SnakesView } from '../../types';
import { Dice } from '../ludo/Dice';
import { DiceDock } from '../ludo/DiceDock';
import type { Banner } from '../ludo/LudoHud';
import { LudoLooksSheet } from '../ludo/LudoLooks';
import { LudoMenus, type LudoPanel } from '../ludo/LudoMenus';
import { lookOfPlayer, useLudoLooks } from '../ludo/looks';
import { ludoSfx } from '../ludo/sounds';
import type { TableProps } from '../registry';
import { colorName, GOTI_HEX, MiniGoti, YouAreBanner } from '../turnkit/ColorMark';
import { CORNERS, tokenSpots } from './geometry';
import { SnakesBoard } from './SnakesBoard';
import { SnakesOver } from './SnakesOver';
import { SnakesSeatCorner } from './SnakesSeat';
import { moveMs, TokenLayer } from './Tokens';
import { snakesSfx } from './sounds';
import { useTimeouts } from '../../lib/useTimeouts';

const BUBBLE_MS = 4000;

export function SnakesTable(props: TableProps) {
  const sv = props.view.plugged?.kind === 'snakes' ? props.view.plugged.snakes : null;
  if (!sv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Setting up the board…</p>
      </main>
    );
  }
  return <SnakesTableInner {...props} sv={sv} />;
}

function SnakesTableInner({ view, actions, bubbles, auth, notes = [], sv }: TableProps & { sv: SnakesView }) {
  const level = auth.user ? levelOf(auth.user.stats) : 1;
  const myLooks = useLudoLooks(level);
  // cleared on unmount, so no sound or effect fires after leaving
  const tm = useTimeouts();
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [looksOpen, setLooksOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [cell, setCell] = useState(0);
  // after a roll the dice stays with the roller until their goti has moved
  const [diceHold, setDiceHold] = useState<string | null>(null);
  const holdTimer = useRef(0);
  const planeRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const startLevel = useRef<number | null>(null);
  useBack(() => setPanel('menu'));
  const { fx, layer: fxLayer } = useTableFx();

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const turnEndsAt = useTurnEndsAt(view);
  const myTurn = playing && sv.turnId === view.meId;
  const turnSeat = sv.seats.find((s) => s.playerId === sv.turnId);
  const canRoll = myTurn && !busy && !diceHold;
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone'));
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;

  // my seat near-left, the others clockwise round the board
  const myIdx = Math.max(0, sv.seats.findIndex((s) => s.playerId === view.meId));
  const cornerOf = (id: string) => {
    const n = sv.seats.length;
    const i = sv.seats.findIndex((s) => s.playerId === id);
    return (CORNERS[n] ?? CORNERS[4])[(i - myIdx + n) % n] ?? 'bl';
  };

  // looks: each player's gotis in their style, the dice in the turn player's skin, the host's frame
  const lookOf = (id: string | null | undefined) =>
    lookOfPlayer([...view.players, ...view.watchers].find((p) => p.id === id) ?? (id === view.meId ? { id } : undefined), view.meId, myLooks);
  const styleOf = (id: string) => lookOf(id).goti;
  const diceBy = useRef<string>(sv.turnId ?? sv.last?.playerId ?? view.meId);
  if (diceHold) diceBy.current = diceHold;
  else if (sv.turnId) diceBy.current = sv.turnId;
  const boardLook = lookOf(view.hostId).board;
  const diceLook = lookOf(diceBy.current).dice;

  useLayoutEffect(() => {
    const el = planeRef.current;
    if (!el) return;
    const measure = () => setCell(el.offsetWidth / 10);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spots = useMemo(() => tokenSpots(sv.seats, cornerOf), [sv.seats, myIdx]);

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setOverSeen(false);
  }, [view.phase === 'playing']);
  const myLevel = me?.level ?? null;
  useEffect(() => {
    if (view.phase === 'over' && myLevel !== null && startLevel.current !== null && myLevel > startLevel.current) setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  const bannerTimer = useRef(0);
  function show(b: Omit<Banner, 'key'>, delay = 0) {
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => {
      setBanner({ ...b, key: Date.now() });
      bannerTimer.current = window.setTimeout(() => setBanner(null), 1700);
    }, delay);
  }
  useEffect(() => () => (window.clearTimeout(bannerTimer.current), window.clearTimeout(holdTimer.current)), []);

  // every roll: the dice sound; a six sparkles; three sixes lose the turn; no 6 to start
  const lastRoll = useRef({ seq: sv.rollSeq, turn: sv.turnId, sixes: sv.sixes, move: sv.last?.seq ?? null });
  useEffect(() => {
    const prev = lastRoll.current;
    lastRoll.current = { seq: sv.rollSeq, turn: sv.turnId, sixes: sv.sixes, move: sv.last?.seq ?? null };
    setRolling(false);
    if (sv.rollSeq === prev.seq) return;
    ludoSfx.roll();
    if (sv.dice === 6) ludoSfx.six();
    const moved = (sv.last?.seq ?? null) !== prev.move && sv.last && sv.last.landed > 0;
    if (prev.turn) {
      window.clearTimeout(holdTimer.current);
      setDiceHold(prev.turn);
      holdTimer.current = window.setTimeout(() => setDiceHold(null), moved && sv.last ? moveMs(sv.last, sv.rules.six) + 250 : 1100);
    }
    if (sv.dice === 6 && prev.sixes >= 2 && sv.rules.bonus) {
      tm.later(() => ludoSfx.bust(), 700);
      show({ kind: 'bust', text: '🎲🎲🎲 Three 6s!', sub: `${name(prev.turn)} ${prev.turn === view.meId ? 'lose' : 'loses'} the turn` }, 700);
    } else if (!moved) {
      show({ kind: 'info', text: 'No move', sub: sv.rules.six && sv.dice !== 6 ? 'Roll a 6 to start' : 'Wait for the next turn' }, 750);
    }
  }, [sv.rollSeq]);

  // each move: ladder / snake / bounce / bite / bonus banners once the goti gets there
  const lastSeq = useRef(sv.last?.seq ?? null);
  useEffect(() => {
    const last = sv.last;
    if (!last || last.seq === lastSeq.current) return;
    lastSeq.current = last.seq;
    if (last.landed === 0) return;
    const end = moveMs(last, sv.rules.six);
    const who = name(last.playerId);
    if (last.via?.kind === 'ladder') show({ kind: 'info', text: '🪜 Ladder!', sub: `${who} · ${last.via.from} → ${last.via.to}` }, end - 300);
    else if (last.via?.kind === 'snake') show({ kind: 'bust', text: '🐍 Snake!', sub: `${who} · ${last.via.from} → ${last.via.to}` }, end - 400);
    else if (last.bitten.length > 0) show({ kind: 'bust', text: 'Bite! 🐍', sub: `${names(last.bitten.map((b) => b.playerId))} back ${SNAKES_BITE_BACK}` }, end + 150);
    else if (last.bounced) show({ kind: 'info', text: '↩️ Bounced!', sub: `${who} · back to ${last.landed}` }, end - 200);
    else if (last.bonus && playing) show({ kind: 'bonus', text: 'Bonus roll!', sub: `${who} · for the 6` }, end + 100);
  }, [sv.last?.seq]);
  const names = (ids: string[]) => ids.map(name).join(', ');

  // my turn starts: a chime
  useEffect(() => {
    if (myTurn && !diceHold) sfx.turn();
  }, [myTurn && !diceHold]);

  const roll = async () => {
    if (!canRoll) return;
    unlockSpeech();
    setBusy(true);
    setRolling(true);
    const ok = await actions.gameMove({ kind: 'snakes', move: { type: 'roll' } });
    setBusy(false);
    if (!ok) setRolling(false);
  };

  const onBite = (el: Element) => fx('missed', el, { text: 'Bite! 🐍', shake: true });
  const onFinish = (el: Element) => {
    snakesSfx.finish();
    confettiAt(el, { count: 40, spread: 1 });
  };

  const mySeat = sv.seats.find((s) => s.playerId === view.meId);
  let status = '';
  if (playing && sv.turnId) {
    if (myTurn) status = sv.rules.six && mySeat?.pos === 0 ? 'Roll a 6 to start' : 'Tap the dice to roll';
    else status = `${name(sv.turnId)}'s turn`;
  }
  const diceSeat = sv.seats.find((s) => s.playerId === diceBy.current);
  const infoMine = mySeat && (
    <p className="tinfo-counts">
      <span>{`🎨 You play ${mySeat.color}`}</span>
      <span>{`📍 Square ${mySeat.pos || 'start'}`}</span>
      <span>{`🪜 ${mySeat.ladders} · 🐍 ${mySeat.snakes} · 🦷 ${mySeat.bites}`}</span>
    </p>
  );
  const tips = ['Ladders 🪜 take you up, snakes 🐍 bring you down', 'Your goti moves by itself: just roll', ...(sv.rules.bite ? [`Land on someone and they go back ${SNAKES_BITE_BACK}`] : [])];

  return (
    <main className={cx('table lu-table sn-table', myTurn && 'lu-my-turn')} style={{ ['--turn-col' as string]: turnSeat ? LUDO_COLOR_HEX[turnSeat.color as LudoColor] : '#fff' } as CSSProperties}>
      <div className="lu-room" aria-hidden />
      <div ref={stageRef} className="lu-stage sn-stage">
        <div ref={planeRef} className={cx('lu-plane', `bt-${boardLook}`)} style={{ ['--cell' as string]: `${cell}px` } as CSSProperties}>
          <div className="lu-frame sn-frame" aria-hidden />
          <SnakesBoard />
          {cell > 0 && (
            <TokenLayer
              seats={sv.seats}
              spots={spots}
              cell={cell}
              last={sv.last}
              six={sv.rules.six}
              cornerOf={cornerOf}
              styleOf={styleOf}
              turnId={playing ? sv.turnId : null}
              meId={view.meId}
              tagOf={(id) => name(id).slice(0, 1).toUpperCase()}
              onBite={onBite}
              onFinish={onFinish}
            />
          )}
        </div>
        {sv.seats.map((s) => {
          const p = view.players.find((x) => x.id === s.playerId);
          const gone = view.leftPlayers.find((x) => x.id === s.playerId);
          return (
            <SnakesSeatCorner
              key={s.playerId}
              seat={s}
              player={p}
              goneName={gone?.name}
              corner={cornerOf(s.playerId)}
              turn={playing && s.playerId === sv.turnId}
              mine={s.playerId === view.meId}
              needSix={sv.rules.six}
              bubble={bubbleOf(s.playerId)}
              turnEndsAt={s.playerId === sv.turnId ? turnEndsAt : null}
              turnSec={view.config.turnSec}
              onTap={p && p.id !== view.meId ? () => setTarget(p.id) : undefined}
              gotiStyle={styleOf(s.playerId)}
            />
          );
        })}
        {playing && (
          <div className="lu-dice-spot lu-dice-fixed">
            <DiceDock color={(diceSeat?.color as LudoColor | undefined) ?? null} gotiStyle={styleOf(diceBy.current)} who={name(diceBy.current)} mine={diceBy.current === view.meId} live={canRoll}>
              <Dice value={sv.dice} rollSeq={sv.rollSeq} skin={diceLook} live={canRoll} rolling={rolling} onRoll={() => void roll()} label={canRoll ? 'Tap to roll' : undefined} />
            </DiceDock>
          </div>
        )}
        {banner && (
          <div key={banner.key} className={cx('lu-banner', `lu-banner-${banner.kind}`)} role="status">
            <b>{banner.kind === 'bonus' ? `🎲 ${banner.text}` : banner.text}</b>
            {banner.sub && <small>{banner.sub}</small>}
          </div>
        )}
      </div>

      <header className="topbar">
        <TableInfo view={view} notes={notes} mine={infoMine} tips={tips} />
        {status && (
          <span key={status} className={cx('lu-status', myTurn && 'mine')} role="status">
            {status}
          </span>
        )}
        <span className="grow" />
        <div className="topbar-actions">
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Gotis and dice looks" onClick={() => setLooksOpen(true)}>
            🎨
          </button>
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />
      {mySeat && <YouAreBanner on={playing} color={GOTI_HEX[mySeat.color as LudoColor]} name={colorName(mySeat.color)} icon={<MiniGoti color={mySeat.color as LudoColor} style={styleOf(view.meId)} />} />}
      {watching && <p className="lu-watch-note">👀 Watching · you'll play next game</p>}

      {view.phase === 'over' && !overSeen && <SnakesOver view={view} sv={sv} styleOf={styleOf} onNext={() => setOverSeen(true)} />}
      {view.phase === 'over' && overSeen && (
        <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />
      )}
      {levelUp !== null && overSeen && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {looksOpen && <LudoLooksSheet level={level} host={isHost} onClose={() => setLooksOpen(false)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} />
      {fxLayer}
    </main>
  );
}
