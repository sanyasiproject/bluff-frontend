// The Spike Attack table: the arena in the middle, players and hearts down the left, the arrow pad under the right thumb; swipe and keys work too
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-arcade.css';
import '../../styles/land-spikes.css';
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
import { PARTY_COLORS, SPIKES_LIVES, type SpikesMoveInput, type SpikesView } from '../../types';
import { ArcadeSeat, seatOrder } from '../fruit/ArcadeSeat';
import { useServerClock } from '../fruit/clock';
import { fruitSfx } from '../fruit/sounds';
import type { Banner } from '../ludo/LudoHud';
import { LudoMenus, type LudoPanel } from '../ludo/LudoMenus';
import type { TableProps } from '../registry';
import { Arena } from './Arena';
import { Pad } from './Pad';
import { SpikesOver } from './SpikesOver';
import { spikesSfx } from './sounds';

type Dir = SpikesMoveInput['dir'];
const BUBBLE_MS = 4000;
const STEP_MS = 140;
const PRED_MS = 700;
const SWIPE_PX = 28;
const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

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

  // my steps show at once; the server's place takes over once it has caught up
  const pred = useRef<{ pos: [number, number]; at: number } | null>(null);
  const lastStep = useRef(0);
  const queued = useRef<number>(0);
  const posOf = (id: string): [number, number] => {
    if (id === view.meId && pred.current && performance.now() - pred.current.at < PRED_MS) return pred.current.pos;
    return sv.pos[id] ?? [0, 0];
  };
  const stepRef = useRef<(d: Dir) => void>(() => undefined);
  stepRef.current = (d: Dir) => {
    if (!live) return;
    const wait = STEP_MS - (performance.now() - lastStep.current);
    if (wait > 0) {
      window.clearTimeout(queued.current);
      queued.current = window.setTimeout(() => stepRef.current(d), wait + 5);
      return;
    }
    const [c, r] = posOf(view.meId);
    const n = sv.size;
    const next: [number, number] = d === 'left' ? [Math.max(0, c - 1), r] : d === 'right' ? [Math.min(n - 1, c + 1), r] : d === 'up' ? [c, Math.max(0, r - 1)] : [c, Math.min(n - 1, r + 1)];
    if (next[0] === c && next[1] === r) return;
    lastStep.current = performance.now();
    pred.current = { pos: next, at: performance.now() };
    spikesSfx.step();
    void actions.gameMoveQuiet({ kind: 'spikes', move: { type: 'step', dir: d } });
  };
  const step = (d: Dir) => {
    unlockAudio();
    unlockSpeech();
    stepRef.current(d);
  };
  useEffect(() => () => window.clearTimeout(queued.current), []);

  // keyboard arrows (and WASD) on desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = KEYS[e.key];
      if (!d || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
      e.preventDefault();
      step(d);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // swipe anywhere on the play area: each 28px drag is one step, so a long drag walks
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const onDown = (e: RPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, .ar-seat')) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onMove = (e: RPointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    swipe.current = { ...s, x: e.clientX, y: e.clientY };
  };
  const onUp = () => (swipe.current = null);

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
    window.setTimeout(() => spikesSfx.out(), 250);
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
  const status = !playing ? '' : sv.phase === 'countdown' ? 'Get ready…' : !me ? '👀 Watching' : myLives <= 0 ? '👻 You are out · watching' : 'Dodge the red lines!';
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`❤️ ${myLives} of ${SPIKES_LIVES} lives`}</span>
      <span>{`🟥 Arena ${sv.size} × ${sv.size}`}</span>
    </p>
  );
  const tips = ['Get off the red row or column before it counts down to 0', 'Arrow pad, swipe or keyboard arrows to move', 'After a hit you are safe for a second'];
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
    <main className={cx('table lu-table ar-table sp-table', live && 'sp-live')} style={{ '--my-col': colorOf(view.meId) } as CSSProperties} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <div className="sp-room" aria-hidden />
      <div className="ar-seats ar-left sp-seats">{leftSeats.map((id) => seatOf(id))}</div>
      <div className="ar-seats ar-right sp-seats sp-right">{rightSeats.map((id) => seatOf(id))}</div>
      <div ref={arenaRef} className="sp-stage" onAnimationEnd={(e) => e.currentTarget.classList.remove('sp-shake')}>
        <Arena sv={sv} now={clock.now} order={order} colorOf={colorOf} initialOf={initialOf} nameOf={shortName} meId={view.meId} posOf={posOf} onStrike={() => spikesSfx.strike()} onHit={onHit} onTick={onTick} />
      </div>
      {me && view.phase !== 'over' && <Pad onStep={step} disabled={!live} />}
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
