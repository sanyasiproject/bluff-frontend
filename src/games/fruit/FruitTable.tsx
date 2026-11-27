// The Fruit Slice Duel table: a dojo with everyone's same fruit on a 60 fps canvas, my blade, live scores round the edge, countdown and timer
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-arcade.css';
import '../../styles/land-fruit.css';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
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
import { FRUIT_POINTS, PARTY_COLORS, type FruitView } from '../../types';
import { LudoMenus, type LudoPanel } from '../ludo/LudoMenus';
import type { TableProps } from '../registry';
import { ArcadeSeat, seatOrder } from './ArcadeSeat';
import { useServerClock } from './clock';
import { FruitEngine, type Cut } from './engine';
import { FruitOver } from './FruitOver';
import { fruitSfx } from './sounds';

const BUBBLE_MS = 4000;
const COUNTDOWN_MS = 3000;

export function FruitTable(props: TableProps) {
  const fv = props.view.plugged?.kind === 'fruit' ? props.view.plugged.fruit : null;
  if (!fv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Sharpening the blade…</p>
      </main>
    );
  }
  return <FruitTableInner {...props} fv={fv} />;
}

function FruitTableInner({ view, actions, bubbles, auth, notes = [], fv }: TableProps & { fv: FruitView }) {
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  const [podium, setPodium] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [clockText, setClockText] = useState<{ count: number | null; left: number }>({ count: null, left: fv.seconds });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const engine = useRef<FruitEngine | null>(null);
  const startLevel = useRef<number | null>(null);
  const clock = useServerClock();
  useBack(() => setPanel('menu'));

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;

  const order = seatOrder(Object.keys(fv.scores), view.players);
  const colorOf = (id: string) => PARTY_COLORS[Math.max(0, order.indexOf(id)) % PARTY_COLORS.length];
  const myColor = colorOf(view.meId);
  const best = Math.max(0, ...order.map((id) => fv.scores[id] ?? 0));
  const ranked = [...order].sort((a, b) => (fv.scores[b] ?? 0) - (fv.scores[a] ?? 0));
  // me first on the left, the others round the edges
  const at = Math.max(0, order.indexOf(view.meId));
  const round = [...order.slice(at), ...order.slice(0, at)];
  const left = round.filter((_, i) => i % 2 === 0);
  const right = round.filter((_, i) => i % 2 === 1);

  // the server clock: each view says when it was made (older servers: a countdown view came after the countdown began)
  const seedRef = useRef(fv.seed);
  if (seedRef.current !== fv.seed) {
    seedRef.current = fv.seed;
    clock.reset();
  }
  if (typeof fv.now === 'number') clock.sample(fv.now);
  else if (fv.phase === 'countdown') clock.sample(fv.startsAt - COUNTDOWN_MS);

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

  const shake = () => {
    const el = stageRef.current;
    if (!el || reducedMotion()) return;
    el.classList.remove('fr-shake');
    void el.offsetWidth;
    el.classList.add('fr-shake');
  };

  // my cuts: popups and sounds at once, then off to the server
  const onCut = (cut: Cut) => {
    const e = engine.current;
    const bomb = cut.kinds.includes('bomb');
    const fruit = cut.kinds.filter((k) => k !== 'bomb');
    const pts = fruit.reduce((s, k) => s + FRUIT_POINTS[k], 0) + Math.max(0, fruit.length - 2);
    if (e) {
      if (bomb) e.popup(cut.x, cut.y, '−10 💣', '#ff5252', true);
      else if (fruit.length >= 3) {
        e.popup(cut.x, cut.y - 34, `Combo ×${fruit.length}!`, '#ffd740', true);
        e.popup(cut.x, cut.y + 8, `+${pts}`, '#fff');
        fruitSfx.combo(fruit.length);
      } else e.popup(cut.x, cut.y, `+${pts}`, '#fff');
    }
    void actions.gameMoveQuiet({ kind: 'fruit', move: { type: 'slice', ids: cut.ids, at: cut.at } });
  };
  const onHit = (kind: string) => {
    if (kind === 'bomb') {
      fruitSfx.bomb();
      shake();
      navigator.vibrate?.(180);
    } else fruitSfx.slice(0.85 + Math.random() * 0.3);
  };

  useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const e = new FruitEngine(cv, clock.now, (c) => onCutRef.current(c), (k) => onHitRef.current(k));
    engine.current = e;
    // fruit fly between the seat columns
    const fit = () => {
      e.resize();
      const box = cv.getBoundingClientRect();
      const l = leftRef.current?.getBoundingClientRect();
      const r = rightRef.current?.getBoundingClientRect();
      const cap = box.width * 0.28;
      e.inset = {
        l: l && l.width ? Math.min(cap, Math.max(0, l.right - box.left + 8)) : 0,
        r: r && r.width ? Math.min(cap, Math.max(0, box.right - r.left + 8)) : 0,
      };
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    return () => {
      ro.disconnect();
      e.destroy();
      engine.current = null;
    };
  }, []);
  const onCutRef = useRef(onCut);
  onCutRef.current = onCut;
  const onHitRef = useRef(onHit);
  onHitRef.current = onHit;

  // the game's fruit, what I already cut (after a reconnect), and whether my blade cuts now
  const live = !watching && playing && fv.phase === 'play';
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.setGame(fv.seed, fv.seconds, fv.startsAt, fv.sliced[view.meId] ?? []);
    e.live = live;
    e.color = myColor;
  }, [fv, live, myColor]);

  // the others' cuts: a slash in their colour on the same fruit
  const seen = useRef<Record<string, number>>({});
  useEffect(() => {
    for (const id of order) {
      const list = fv.sliced[id] ?? [];
      const was = seen.current[id] ?? list.length;
      if (id !== view.meId && list.length > was) engine.current?.others(list.slice(was), colorOf(id));
      seen.current[id] = list.length;
    }
  }, [fv.sliced]);

  // the countdown, the timer and their beeps
  const beeped = useRef<number | null>(null);
  useEffect(() => {
    if (view.phase === 'over') return;
    const t = window.setInterval(() => {
      const now = clock.now();
      const toStart = fv.startsAt - now;
      const count = toStart > 0 ? Math.ceil(toStart / 1000) : toStart > -700 ? 0 : null;
      const leftS = Math.max(0, Math.min(fv.seconds, Math.ceil((fv.endsAt - now) / 1000)));
      setClockText((p) => (p.count === count && p.left === leftS ? p : { count, left: leftS }));
      const mark = count !== null ? 100 + count : leftS <= 5 && leftS > 0 ? leftS : null;
      if (mark !== null && mark !== beeped.current) {
        beeped.current = mark;
        if (count !== null) fruitSfx.count(count === 0);
        else fruitSfx.tick();
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [fv.startsAt, fv.endsAt, view.phase]);

  // time's up: a buzzer, then the podium
  useEffect(() => {
    if (view.phase !== 'over') return;
    fruitSfx.end();
    const t = window.setTimeout(() => setPodium(true), 1400);
    return () => window.clearTimeout(t);
  }, [view.phase]);

  const pos = (e: RPointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const onDown = (e: RPointerEvent) => {
    unlockAudio();
    unlockSpeech();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    engine.current?.pointerDown(...pos(e));
  };
  const onMove = (e: RPointerEvent) => {
    const evs = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const r = canvasRef.current!.getBoundingClientRect();
    for (const ev of evs) engine.current?.pointerMove(ev.clientX - r.left, ev.clientY - r.top);
    if (e.buttons || e.pointerType === 'touch') fruitSfx.swoosh();
  };
  const onUp = () => engine.current?.pointerUp();

  const mine = fv.scores[view.meId];
  const infoMine = !watching && (
    <p className="tinfo-counts">
      <span>{`🍉 ${(fv.sliced[view.meId] ?? []).length} sliced`}</span>
      <span>{`🔥 Best combo ${fv.combo[view.meId] ?? 0}`}</span>
      <span>{`💣 ${fv.bombs[view.meId] ?? 0} bombs`}</span>
    </p>
  );
  const tips = ['Swipe across fruit to slice it: everyone gets the same fruit', '3 or more in one swipe is a combo bonus', 'Bombs cost 10 points'];
  const status = !playing ? '' : fv.phase === 'countdown' ? 'Get ready…' : fv.phase === 'play' ? (watching ? '👀 Watching' : 'Swipe to slice!') : "Time's up!";
  const seat = (id: string) => {
    const p = view.players.find((x) => x.id === id);
    const gone = view.leftPlayers.find((x) => x.id === id);
    const score = fv.scores[id] ?? 0;
    return (
      <ArcadeSeat
        key={id}
        player={p}
        goneName={gone?.name}
        color={colorOf(id)}
        mine={id === view.meId}
        lead={best > 0 && score === best}
        bubble={bubbleOf(id)}
        onTap={p && p.id !== view.meId ? () => setTarget(p.id) : undefined}
        tags={
          <b key={score} className={cx('ar-num bump', score < 0 && 'neg')} title="Score">
            {best > 0 && score === best ? '👑' : '⭐'} {score}
          </b>
        }
      />
    );
  };

  return (
    <main className={cx('table lu-table ar-table fr-table', live && 'fr-live')} style={{ '--my-col': myColor } as CSSProperties}>
      <div className="fr-dojo" aria-hidden>
        <i className="fr-bokeh" />
      </div>
      <div ref={stageRef} className="fr-stage" onAnimationEnd={(e) => e.currentTarget.classList.remove('fr-shake')}>
        <canvas ref={canvasRef} className="fr-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp} />
      </div>
      <div ref={leftRef} className="ar-seats ar-left">{left.map(seat)}</div>
      <div ref={rightRef} className="ar-seats ar-right">{right.map(seat)}</div>

      <div className="fr-hud" aria-live="off">
        <span className={cx('fr-timer', clockText.left <= 5 && fv.phase === 'play' && 'hurry')}>⏱ {fv.phase === 'over' ? 0 : clockText.left}s</span>
        <ol className="fr-board">
          {ranked.map((id) => (
            <li key={id} style={{ '--c': colorOf(id) } as CSSProperties} className={cx(id === view.meId && 'me')}>
              <i />
              <b>{fv.scores[id] ?? 0}</b>
            </li>
          ))}
        </ol>
      </div>
      {clockText.count !== null && playing && (
        <div key={clockText.count} className={cx('ar-count', clockText.count === 0 && 'go')} aria-live="assertive">
          {clockText.count === 0 ? 'SLICE!' : clockText.count}
        </div>
      )}
      {view.phase === 'over' && !podium && <div className="ar-count go ar-end">Time's up!</div>}

      <header className="topbar">
        <TableInfo view={view} notes={notes} mine={infoMine || undefined} tips={tips} />
        {status && (
          <span key={status} className={cx('lu-status', live && 'mine')} role="status">
            {status}
            {mine !== undefined && live ? ` · ⭐ ${mine}` : ''}
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
      {watching && <p className="lu-watch-note">👀 Watching · you'll play next game</p>}

      {view.phase === 'over' && podium && !overSeen && <FruitOver view={view} fv={fv} order={order} colorOf={colorOf} onNext={() => setOverSeen(true)} />}
      {view.phase === 'over' && overSeen && <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />}
      {levelUp !== null && overSeen && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} leaveWhat="Your score stops" kickWhat="Their score stops" />
    </main>
  );
}
