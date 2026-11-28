// The Spike Attack table: the arena in the middle, players and hearts down the edges; drag anywhere for a joystick (keys on desktop), free running
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-arcade.css';
import '../../styles/land-spikes.css';
import '../../styles/land-spikes-walls.css';
import '../../styles/land-spikes-temple.css';
import '../../styles/land-spikes-shift.css';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { LevelUp } from '../../components/LevelUp';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { GameOver } from '../../components/Overlays';
import { QuickChat } from '../../components/QuickChat';
import { SeatSheet } from '../../components/Table';
import { TableInfo } from '../../components/TableInfo';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { unlockAudio } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { PARTY_COLORS, SPIKES_LIVES, type SpikesView } from '../../types';
import { ArcadeSeat, seatOrder } from '../fruit/ArcadeSeat';
import { useServerClock } from '../fruit/clock';
import { fruitSfx } from '../fruit/sounds';
import type { Banner } from '../ludo/LudoHud';
import { LudoMenus, type LudoPanel } from '../ludo/LudoMenus';
import type { TableProps } from '../registry';
import { colorName, YouAreBanner } from '../turnkit/ColorMark';
import { Arena } from './Arena';
import { Joystick, joyVector, type JoyState } from './Joystick';
import { useMotion } from './motion';
import { SpikesOver } from './SpikesOver';
import { spikesSfx } from './sounds';
import { useTimeouts } from '../../lib/useTimeouts';

const BUBBLE_MS = 4000;
const STEP_SOUND_MS = 260;
const KEYS: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };

export function SpikesTable(props: TableProps) {
  const sv = props.view.plugged?.kind === 'spikes' ? props.view.plugged.spikes : null;
  if (!sv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Sharpening the spikes…</p>
      </main>
    );
  }
  return <SpikesTableInner {...props} sv={sv} />;
}

function SpikesTableInner({ view, actions, bubbles, auth, notes = [], sv }: TableProps & { sv: SpikesView }) {
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  // cleared on unmount, so no sound or effect fires after leaving
  const tm = useTimeouts();
  const [podium, setPodium] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const startLevel = useRef<number | null>(null);
  const clock = useServerClock();
  useBack(() => setPanel('menu'));
  clock.sample(sv.now);

  const me = view.players.find((p) => p.id === view.meId);
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const people = [...view.players, ...view.leftPlayers];
  const name = (id: string) => (id === view.meId ? 'You' : (people.find((p) => p.id === id)?.name ?? 'Someone'));
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const order = seatOrder(Object.keys(sv.lives), view.players);
  const colorOf = (id: string) => PARTY_COLORS[Math.max(0, order.indexOf(id)) % PARTY_COLORS.length];
  const initialOf = (id: string) => (people.find((p) => p.id === id)?.name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const shortName = (id: string) => {
    const n = (people.find((p) => p.id === id)?.name ?? '?').trim().split(/\s+/)[0];
    return n.length > 7 ? `${n.slice(0, 6)}…` : n;
  };
  const myLives = sv.lives[view.meId] ?? 0;
  const live = !!me && playing && sv.phase === 'play' && myLives > 0;
  const at = Math.max(0, order.indexOf(view.meId));
  const seats = [...order.slice(at), ...order.slice(0, at)];
  // me and every other player on the left, the rest on the right above the pad
  const leftSeats = seats.filter((_, i) => i % 2 === 0);
  const rightSeats = seats.filter((_, i) => i % 2 === 1);

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setOverSeen(false);
    setPodium(false);
  }, [playing]);
  const myLevel = me?.level ?? null;
  useEffect(() => {
    if (view.phase === 'over' && myLevel !== null && startLevel.current !== null && myLevel > startLevel.current) setLevelUp(myLevel);
  }, [view.phase, myLevel]);

  const bannerTimer = useRef(0);
  const show = (b: Omit<Banner, 'key'>) => {
    window.clearTimeout(bannerTimer.current);
    setBanner({ ...b, key: Date.now() });
    bannerTimer.current = window.setTimeout(() => setBanner(null), 1700);
  };
  useEffect(() => () => window.clearTimeout(bannerTimer.current), []);

  // my character runs at once on this phone and its place goes to the server ~12 times a second
  const motion = useMotion(sv, view.meId, live, clock.now, (p) => void actions.gameMoveQuiet({ kind: 'spikes', move: { type: 'move', x: p[0], y: p[1] } }));
  const posOf = motion.posOf;
  const [joy, setJoy] = useState<JoyState | null>(null);
  const joyRef = useRef<(JoyState & { id: number }) | null>(null);
  const keys = useRef(new Set<string>());
  const steppedAt = useRef(0);
  const [ranOnce, setRanOnce] = useState(false);
  const liveRef = useRef(live);
  liveRef.current = live;
  const steer = () => {
    const j = joyRef.current;
    let v = j ? joyVector(j) : { x: 0, y: 0 };
    if (!j && keys.current.size) {
      let x = 0;
      let y = 0;
      keys.current.forEach((k) => ((x += KEYS[k][0]), (y += KEYS[k][1])));
      const d = Math.hypot(x, y) || 1;
      v = { x: x / d, y: y / d };
    }
    motion.input.x = v.x;
    motion.input.y = v.y;
    if (liveRef.current && Math.hypot(v.x, v.y) > 0.2 && performance.now() - steppedAt.current > STEP_SOUND_MS) {
      steppedAt.current = performance.now();
      spikesSfx.step();
    }
  };

  // keyboard arrows (and WASD) on desktop: held keys run, diagonals too
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!KEYS[k] || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
      e.preventDefault();
      if (e.type === 'keydown') {
        unlockAudio();
        keys.current.add(k);
        setRanOnce(true);
      } else keys.current.delete(k);
      steer();
    };
    const blur = () => {
      keys.current.clear();
      steer();
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    window.addEventListener('blur', blur);
    return () => (window.removeEventListener('keydown', key), window.removeEventListener('keyup', key), window.removeEventListener('blur', blur));
  }, []);

  // touch anywhere (not on a button or seat): a joystick under the thumb
  const tableRef = useRef<HTMLElement>(null);
  const at0 = (e: RPointerEvent) => {
    const r = tableRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: RPointerEvent) => {
    if (joyRef.current || !me || view.phase === 'over') return;
    if ((e.target as HTMLElement).closest('button, a, input, .ar-seat, .topbar, .backdrop, .sheet')) return;
    unlockAudio();
    unlockSpeech();
    const p = at0(e);
    joyRef.current = { ox: p.x, oy: p.y, x: p.x, y: p.y, id: e.pointerId };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setJoy({ ox: p.x, oy: p.y, x: p.x, y: p.y });
    steer();
    setRanOnce(true);
  };
  const onMove = (e: RPointerEvent) => {
    const j = joyRef.current;
    if (!j || j.id !== e.pointerId) return;
    const p = at0(e);
    joyRef.current = { ...j, x: p.x, y: p.y };
    setJoy({ ox: j.ox, oy: j.oy, x: p.x, y: p.y });
    steer();
  };
  const onUp = (e: RPointerEvent) => {
    if (joyRef.current?.id !== e.pointerId) return;
    joyRef.current = null;
    setJoy(null);
    steer();
  };

  // countdown 3-2-1
  const beeped = useRef<number | null>(null);
  useEffect(() => {
    if (sv.phase !== 'countdown' && count === null) return;
    const t = window.setInterval(() => {
      const left = sv.startsAt - clock.now();
      const c = left > 0 ? Math.ceil(left / 1000) : left > -700 ? 0 : null;
      setCount(c);
      if (c !== null && c !== beeped.current) {
        beeped.current = c;
        fruitSfx.count(c === 0);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [sv.phase, sv.startsAt, count === null]);

  // a new warning: a short alarm
  const warned = useRef(new Set(sv.warnings.map((w) => w.id)));
  useEffect(() => {
    const fresh = sv.warnings.filter((w) => !warned.current.has(w.id));
    fresh.forEach((w) => warned.current.add(w.id));
    if (fresh.length && playing) spikesSfx.warn();
  }, [sv.warnings]);

  // the ticking clock before the next strike
  const tickSlot = useRef('');
  const onTick = (ms: number, onMe: boolean) => {
    const slot = ms > 1000 ? `s${Math.ceil(ms / 1000)}` : `q${Math.floor(ms / 250)}`;
    if (slot === tickSlot.current) return;
    tickSlot.current = slot;
    spikesSfx.tick(onMe, ms <= 1000);
  };
  const shake = () => {
    const el = arenaRef.current;
    if (!el || reducedMotion()) return;
    el.classList.remove('sp-shake');
    void el.offsetWidth;
    el.classList.add('sp-shake');
  };
  const onHit = (ids: string[]) => {
    const mine = ids.includes(view.meId);
    spikesSfx.hit(mine);
    if (mine) {
      shake();
      navigator.vibrate?.(150);
    }
  };

  // someone is out: a ghost and a banner
  const livesWas = useRef(sv.lives);
  useEffect(() => {
    const out = order.filter((id) => (livesWas.current[id] ?? 1) > 0 && (sv.lives[id] ?? 0) <= 0);
    livesWas.current = sv.lives;
    if (!out.length || sv.phase === 'countdown') return;
    tm.later(() => spikesSfx.out(), 250);
    if (out.includes(view.meId)) show({ kind: 'bust', text: "👻 You're out!", sub: 'Watch the rest as a ghost' });
    else show({ kind: 'info', text: `👻 ${out.map(name).join(', ')} out!`, sub: `${order.filter((id) => (sv.lives[id] ?? 0) > 0).length} left` });
  }, [sv.lives]);

  // game over: a fanfare for the winner, then the podium
  useEffect(() => {
    if (view.phase !== 'over') return;
    if (view.winnerIds.includes(view.meId)) spikesSfx.win();
    const t = window.setTimeout(() => setPodium(true), 1500);
    return () => window.clearTimeout(t);
  }, [view.phase]);

  const hearts = (id: string) => {
    const n = Math.max(0, sv.lives[id] ?? 0);
    return '❤️'.repeat(n) + '🖤'.repeat(Math.max(0, SPIKES_LIVES - n));
  };
  const status = !playing ? '' : sv.phase === 'countdown' ? 'Get ready…' : !me ? '👀 Watching' : myLives <= 0 ? '👻 You are out · watching' : sv.boxesNext ? '📦 Crates are moving: get off the ghosts!' : ranOnce ? 'Hide behind a crate!' : '🕹️ Drag anywhere to run';
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`❤️ ${myLives} of ${SPIKES_LIVES} lives`}</span>
      <span>{`🟥 Arena ${sv.size} × ${sv.size}`}</span>
    </p>
  );
  const tips = ['A whole side fires at 0: the spikes stop at the crates, so stand behind one on the far side', 'Crates are solid: run round them', 'Drag anywhere: a joystick appears under your thumb (arrow keys / WASD on a keyboard)', 'After a hit you are safe for a second', 'On 8 × 8 and bigger the crates move now and then: keep off the dashed squares'];
  const alive = order.filter((id) => (sv.lives[id] ?? 0) > 0);
  const seatOf = (id: string) => {
    const p = view.players.find((x) => x.id === id);
    return (
      <ArcadeSeat
        key={id}
        player={p}
        goneName={view.leftPlayers.find((x) => x.id === id)?.name}
        color={colorOf(id)}
        mine={id === view.meId}
        out={(sv.lives[id] ?? 0) <= 0 && sv.phase !== 'countdown'}
        icon={<i className="cm-dot cm-blob" aria-hidden />}
        lead={playing && sv.phase === 'play' && alive.length === 1 && alive[0] === id}
        bubble={bubbleOf(id)}
        onTap={p && p.id !== view.meId ? () => setTarget(p.id) : undefined}
        tags={
          <b key={sv.lives[id]} className="ar-num sp-hearts bump" title="Lives">
            {(sv.lives[id] ?? 0) > 0 ? hearts(id) : '👻 out'}
          </b>
        }
      />
    );
  };

  return (
    <main ref={tableRef} className={cx('table lu-table ar-table sp-table', live && 'sp-live', joy && 'sp-held')} style={{ '--my-col': colorOf(view.meId) } as CSSProperties} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="sp-room" aria-hidden />
      <div className="ar-seats ar-left sp-seats">{leftSeats.map((id) => seatOf(id))}</div>
      <div className="ar-seats ar-right sp-seats sp-right">{rightSeats.map((id) => seatOf(id))}</div>
      <div ref={arenaRef} className="sp-stage" onAnimationEnd={(e) => e.currentTarget.classList.remove('sp-shake')}>
        <Arena sv={sv} now={clock.now} order={order} colorOf={colorOf} initialOf={initialOf} nameOf={shortName} meId={view.meId} posOf={posOf} onStrike={() => spikesSfx.strike()} onThud={() => spikesSfx.thud()} onHit={onHit} onTick={onTick} />
      </div>
      {me && view.phase !== 'over' && myLives > 0 && <Joystick joy={joy} />}
      {count !== null && playing && (
        <div key={count} className={cx('ar-count', count === 0 && 'go')} aria-live="assertive">
          {count === 0 ? 'Go!' : count}
        </div>
      )}
      {view.phase === 'over' && !podium && <div className="ar-count go ar-end">{view.winnerIds.includes(view.meId) ? 'You survived!' : 'Game over'}</div>}
      {banner && (
        <div key={banner.key} className={cx('lu-banner', `lu-banner-${banner.kind}`)} role="status">
          <b>{banner.text}</b>
          {banner.sub && <small>{banner.sub}</small>}
        </div>
      )}

      <header className="topbar">
        <TableInfo view={view} notes={notes} mine={infoMine || undefined} tips={tips} />
        {status && (
          <span key={status} className={cx('lu-status', live && 'mine')} role="status">
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
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />
      {view.players.some((p) => p.id === view.meId) && <YouAreBanner on={view.phase === 'playing'} color={colorOf(view.meId)} name={colorName(colorOf(view.meId))} icon={<i className="cm-dot cm-blob" aria-hidden />} />}
      {!me && <p className="lu-watch-note">👀 Watching · you'll play next game</p>}

      {view.phase === 'over' && podium && !overSeen && <SpikesOver view={view} sv={sv} order={order} colorOf={colorOf} onNext={() => setOverSeen(true)} />}
      {view.phase === 'over' && overSeen && <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />}
      {levelUp !== null && overSeen && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} leaveWhat="You leave the arena" kickWhat="They leave the arena" />
    </main>
  );
}
