// The Ludo table: tilted 3D board, standing gotis, a 3D dice and the players at their base corners
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-goti.css';
import '../../styles/land-ludo-dice.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
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
import { levelOf, LUDO_COLOR_HEX, type LudoColor, type LudoView } from '../../types';
import type { TableProps } from '../registry';
import { colorName, GOTI_HEX, MiniGoti, YouAreBanner } from '../turnkit/ColorMark';
import { Dice } from './Dice';
import { DiceDock } from './DiceDock';
import { BOARD_PAD, BOARD_SPAN, cornerOf, gotiSpots, turnPt, turnsFor, yardOf } from './geometry';
import { GotiLayer } from './Gotis';
import { LudoBoard } from './LudoBoard';
import { LudoClock, LudoBanner, type Banner } from './LudoHud';
import { LudoLooksSheet } from './LudoLooks';
import { LudoMenus, type LudoPanel } from './LudoMenus';
import { LudoOver } from './LudoOver';
import { LudoSeatCorner } from './LudoSeat';
import { lookOfPlayer, useLudoLooks } from './looks';
import { ludoSfx } from './sounds';

const BUBBLE_MS = 4000;

export function LudoTable(props: TableProps) {
  const lv = props.view.plugged?.kind === 'ludo' ? props.view.plugged.ludo : null;
  if (!lv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Setting up the board…</p>
      </main>
    );
  }
  return <LudoTableInner {...props} lv={lv} />;
}

function LudoTableInner({ view, actions, bubbles, auth, notes = [], lv }: TableProps & { lv: LudoView }) {
  const level = auth.user ? levelOf(auth.user.stats) : 1;
  const myLooks = useLudoLooks(level);
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [looksOpen, setLooksOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [point, setPoint] = useState<number | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [cell, setCell] = useState(0);
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
  const mySeat = lv.seats.find((s) => s.playerId === view.meId);
  const turns = turnsFor(mySeat?.color ?? lv.seats[0]?.color);
  const myTurn = playing && lv.turnId === view.meId;
  const moverId = lv.movesFor ?? lv.turnId;
  const mover = lv.seats.find((s) => s.playerId === moverId);
  const turnSeat = lv.seats.find((s) => s.playerId === lv.turnId);
  const canRoll = myTurn && !lv.rolled && !busy;
  const name = (id: string | null | undefined) =>
    id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone');
  const teamOf = (id: string): 'a' | 'b' | null => (lv.teams?.[0].includes(id) ? 'a' : lv.teams?.[1].includes(id) ? 'b' : null);
  const partnerId = lv.teams?.find((t) => t.includes(view.meId))?.find((id) => id !== view.meId) ?? null;
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;

  // shared looks: each seat's gotis in its player's style, the dice in the turn player's skin, the host's board
  const lookOf = (id: string | null | undefined) =>
    lookOfPlayer([...view.players, ...view.watchers].find((p) => p.id === id) ?? (id === view.meId ? { id } : undefined), view.meId, myLooks);
  const styleOf = (color: LudoColor) => lookOf(lv.seats.find((s) => s.color === color)?.playerId).goti;
  const diceBy = useRef<string>(lv.turnId ?? lv.last?.playerId ?? view.meId);
  if (lv.turnId) diceBy.current = lv.turnId;
  const boardLook = lookOf(view.hostId).board;
  const diceLook = lookOf(diceBy.current).dice;

  // one board square in px, kept in step with the screen
  useLayoutEffect(() => {
    const el = planeRef.current;
    if (!el) return;
    // the board svg shows 15.5 squares (a quarter-square margin each side), so a square is width / 15.5
    const measure = () => setCell(el.offsetWidth / BOARD_SPAN);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spots = useMemo(() => gotiSpots(lv.seats, turns), [lv.seats, turns]);
  const legal = useMemo(
    () => new Set(myTurn && lv.rolled && mover ? lv.movable.map((t) => `${mover.color}-${t}`) : []),
    [myTurn, lv.rolled, lv.movable, mover?.color],
  );
  const ghost =
    point !== null && mover && lv.dice && legal.has(`${mover.color}-${point}`)
      ? { color: mover.color, token: point, to: mover.tokens[point] < 0 ? 0 : mover.tokens[point] + lv.dice }
      : null;

  // a new game: remember my level for the level-up moment
  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setOverSeen(false);
  }, [view.phase === 'playing']);
  const myLevel = me?.level ?? null;
  useEffect(() => {
    if (view.phase === 'over' && myLevel !== null && startLevel.current !== null && myLevel > startLevel.current) setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  // every roll: the dice sound; a six sparkles; the third six in a row loses the turn
  const lastRoll = useRef({ seq: lv.rollSeq, turn: lv.turnId, sixes: lv.sixes });
  useEffect(() => {
    const prev = lastRoll.current;
    lastRoll.current = { seq: lv.rollSeq, turn: lv.turnId, sixes: lv.sixes };
    setRolling(false);
    if (lv.rollSeq === prev.seq) return;
    ludoSfx.roll();
    if (lv.dice === 6) ludoSfx.six();
    if (lv.dice === 6 && prev.sixes >= 2) {
      window.setTimeout(() => ludoSfx.bust(), 700);
      show({ kind: 'bust', text: 'Three 6s!', sub: `${name(prev.turn)} ${prev.turn === view.meId ? 'lose' : 'loses'} the turn` }, 700);
    } else if (lv.rolled && lv.movable.length === 0 && lv.turnId) {
      show({ kind: 'info', text: 'No move', sub: lv.turnId === view.meId ? 'Your turn passes' : `${name(lv.turnId)} can't move` }, 750);
    }
  }, [lv.rollSeq]);

  // each move: a bonus roll banner once the goti lands
  const lastSeq = useRef(lv.last?.seq ?? null);
  useEffect(() => {
    const last = lv.last;
    if (!last || last.seq === lastSeq.current) return;
    lastSeq.current = last.seq;
    const hops = last.from < 0 ? 1 : last.to - last.from;
    const landMs = last.from < 0 ? 450 : Math.min(190, 1500 / Math.max(1, hops)) * hops;
    if (last.bonus && playing) {
      const why = last.captured.length > 0 ? 'for the kill' : last.home ? 'goti home' : 'for the 6';
      show({ kind: 'bonus', text: 'Bonus roll!', sub: `${name(last.playerId)} · ${why}` }, landMs + (last.captured.length ? 650 : 150));
    }
  }, [lv.last?.seq]);

  // my turn starts: a chime
  useEffect(() => {
    if (myTurn && !lv.rolled) sfx.turn();
  }, [myTurn && lv.turnId]);

  const bannerTimer = useRef(0);
  function show(b: Omit<Banner, 'key'>, delay = 0) {
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => {
      setBanner({ ...b, key: Date.now() });
      bannerTimer.current = window.setTimeout(() => setBanner(null), 1700);
    }, delay);
  }
  useEffect(() => () => window.clearTimeout(bannerTimer.current), []);

  const send = async (move: { type: 'roll' } | { type: 'move'; token: number }) => {
    unlockSpeech();
    setBusy(true);
    if (move.type === 'roll') setRolling(true);
    const ok = await actions.gameMove({ kind: 'ludo', move });
    setBusy(false);
    if (!ok) setRolling(false);
  };
  const roll = () => canRoll && void send({ type: 'roll' });
  const pick = (token: number) => {
    setPoint(null);
    if (!busy) void send({ type: 'move', token });
  };

  const onKill = (el: Element) => fx('missed', el, { text: 'KILL!', shake: true });
  const onHome = () => {
    ludoSfx.home();
    confettiAt(stageRef.current, { count: 30, spread: 0.8 });
  };

  // status in a few words, top middle
  let status = '';
  if (playing && lv.turnId) {
    const forPartner = lv.movesFor && lv.movesFor !== lv.turnId;
    if (myTurn) {
      if (!lv.rolled) status = forPartner ? `Your gotis are home · roll for ${name(lv.movesFor)}` : 'Tap the dice to roll';
      else if (lv.movable.length > 1) status = forPartner ? `Move one of ${name(lv.movesFor)}'s gotis` : 'Tap a glowing goti';
      else if (lv.movable.length === 1) status = 'Moving your goti…';
      else status = 'No move this time';
    } else {
      status = forPartner ? `${name(lv.turnId)} is moving for ${name(lv.movesFor)}` : `${name(lv.turnId)}'s turn`;
    }
  }
  const yardGlow = turnSeat && playing ? turnPt(yardOf(turnSeat.color), turns) : null;
  const infoMine = (
    <p className="tinfo-counts">
      {mySeat && <span>{`🎨 You play ${mySeat.color}`}</span>}
      {partnerId && <span>{`🤝 Partner · ${name(partnerId)}`}</span>}
      {mySeat && <span>{`🏠 Home ${mySeat.home} · ⚔️ Kills ${mySeat.kills}`}</span>}
      {lv.mode === 'master' && mySeat && <span>{mySeat.unlocked ? '🔓 Your way home is open' : '🔒 Kill once to open your way home'}</span>}
    </p>
  );
  const tips = ['Roll a 6 to bring a goti out', 'Land on someone to send them home and roll again', 'Stars and start squares are safe', 'A 6, a kill or a goti home gives another roll; three 6s lose the turn'];

  return (
    <main className={cx('table lu-table', myTurn && 'lu-my-turn')} style={{ ['--turn-col' as string]: turnSeat ? LUDO_COLOR_HEX[turnSeat.color] : '#fff' } as CSSProperties}>
      <div className="lu-room" aria-hidden />
      <div ref={stageRef} className="lu-stage">
        <div ref={planeRef} className={cx('lu-plane', `bt-${boardLook}`)} style={{ ['--cell' as string]: `${cell}px` } as CSSProperties}>
          <div className="lu-frame" aria-hidden />
          <LudoBoard turns={turns} inPlay={lv.seats.map((s) => s.color)} />
          {yardGlow && turnSeat && (
            <i className="lu-yard-glow" style={{ left: `${((yardGlow[0] + BOARD_PAD) / BOARD_SPAN) * 100}%`, top: `${((yardGlow[1] + BOARD_PAD) / BOARD_SPAN) * 100}%`, ['--glow' as string]: LUDO_COLOR_HEX[turnSeat.color] } as CSSProperties} />
          )}
          {cell > 0 && (
            <GotiLayer
              spots={spots}
              cell={cell}
              turns={turns}
              last={lv.last}
              legal={legal}
              ghost={ghost}
              styleOf={styleOf}
              mine={mover && myTurn ? [mover.color] : mySeat ? [mySeat.color] : []}
              onPick={pick}
              onPoint={setPoint}
              onKill={onKill}
              onHome={onHome}
              you={mySeat?.color ?? null}
            />
          )}
        </div>
        {lv.seats.map((s) => {
          const p = view.players.find((x) => x.id === s.playerId);
          const gone = view.leftPlayers.find((x) => x.id === s.playerId);
          return (
            <LudoSeatCorner
              key={s.playerId}
              seat={s}
              player={p}
              goneName={gone?.name}
              lv={lv}
              corner={cornerOf(s.color, turns)}
              turn={playing && s.playerId === lv.turnId}
              mine={s.playerId === view.meId}
              team={teamOf(s.playerId)}
              partner={s.playerId === partnerId}
              bubble={bubbleOf(s.playerId)}
              turnEndsAt={s.playerId === lv.turnId ? turnEndsAt : null}
              turnSec={view.config.turnSec}
              onTap={p && p.id !== view.meId ? () => setTarget(p.id) : undefined}
              gotiStyle={styleOf(s.color)}
            />
          );
        })}
        {playing && (
          <div className="lu-dice-spot lu-dice-fixed">
            <DiceDock color={turnSeat?.color ?? null} gotiStyle={turnSeat ? styleOf(turnSeat.color) : 'classic'} who={name(lv.turnId)} mine={myTurn} live={canRoll}>
              <Dice value={lv.dice} rollSeq={lv.rollSeq} skin={diceLook} live={canRoll} rolling={rolling} onRoll={roll} label={canRoll ? 'Tap to roll' : undefined} />
            </DiceDock>
          </div>
        )}
        {banner && <LudoBanner banner={banner} />}
      </div>

      <header className="topbar">
        <TableInfo view={view} notes={notes} mine={infoMine} tips={tips} />
        {lv.endsAt && playing && <LudoClock endsAt={lv.endsAt} />}
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
          <button className="icon-btn" aria-label="Board, gotis and dice looks" onClick={() => setLooksOpen(true)}>
            🎨
          </button>
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />
      {mySeat && <YouAreBanner on={playing} color={GOTI_HEX[mySeat.color]} name={colorName(mySeat.color)} icon={<MiniGoti color={mySeat.color} style={styleOf(mySeat.color)} />} />}
      {watching && <p className="lu-watch-note">👀 Watching · you'll play next game</p>}

      {view.phase === 'over' && !overSeen && <LudoOver view={view} lv={lv} styleOf={styleOf} onNext={() => setOverSeen(true)} />}
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
