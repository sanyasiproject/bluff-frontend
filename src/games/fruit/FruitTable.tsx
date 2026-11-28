// The Fruit Slice Duel table: one item at a time on the plate, everyone's talwar pointing at it, one big Strike button; fastest reaction takes the fruit
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-arcade.css';
import '../../styles/land-fruit.css';
import '../../styles/land-fruit-slash.css';
import '../../styles/land-fruit-talwar.css';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { LevelUp } from '../../components/LevelUp';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { GameOver } from '../../components/Overlays';
import { QuickChat } from '../../components/QuickChat';
import { SeatSheet } from '../../components/tableParts';
import { TableInfo } from '../../components/TableInfo';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { unlockAudio } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { FRUIT_MAGNET_ROUNDS, FRUIT_MIN_REACTION_MS, PARTY_COLORS, type FruitView } from '../../types';
import { LudoMenus, type LudoPanel } from '../ludo/LudoMenus';
import type { TableProps } from '../registry';
import { colorName, YouAreBanner } from '../turnkit/ColorMark';
import { ArcadeSeat, seatOrder } from './ArcadeSeat';
import { useServerClock } from './clock';
import { CONTACT_MS, Duel, swordSize, swordSpots, type Shown, type SwordRoom } from './Duel';
import { FruitOver, type DuelStats } from './FruitOver';
import { fruitSfx } from './sounds';
import { useTimeouts } from '../../lib/useTimeouts';
import { BUBBLE_MS } from '../../lib/common';

const RESULT_MS = 1300;

export function FruitTable(props: TableProps) {
  const fv = props.view.plugged?.kind === 'fruit' ? props.view.plugged.fruit : null;
  if (!fv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Sharpening the swords…</p>
      </main>
    );
  }
  return <FruitTableInner {...props} fv={fv} />;
}

function FruitTableInner({ view, actions, bubbles, auth, notes = [], fv }: TableProps & { fv: FruitView }) {
  const [panel, setPanel] = useState<LudoPanel>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [overSeen, setOverSeen] = useState(false);
  // cleared on unmount, so no sound or effect fires after leaving
  const tm = useTimeouts();
  const [podium, setPodium] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [mine, setMine] = useState<{ round: number; reaction: number } | null>(null);
  const [early, setEarly] = useState(0);
  const [shown, setShown] = useState<Shown | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const startLevel = useRef<number | null>(null);
  const painted = useRef<{ round: number; at: number } | null>(null);
  const struckRound = useRef<number | null>(null);
  const stats = useRef<Record<string, DuelStats>>({});
  const clock = useServerClock();
  useBack(() => setPanel('menu'));
  clock.sample(fv.now);

  const me = view.players.find((p) => p.id === view.meId);
  const watching = !me;
  const playing = view.phase === 'playing';
  const isHost = view.hostId === view.meId;
  const people = [...view.players, ...view.leftPlayers];
  const fresh = bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);
  const bubbleOf = (id: string) => [...fresh].reverse().find((b) => b.from === id) ?? null;
  const shortName = (id: string) => {
    if (id === view.meId) return 'You';
    const n = (people.find((p) => p.id === id)?.name ?? '?').trim().split(/\s+/)[0];
    return n.length > 7 ? `${n.slice(0, 6)}…` : n;
  };

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
  // the stage size and the free room between it and the seat cards, for the swords' size (layout px, so the turned shell reads right)
  const [room, setRoom] = useState<SwordRoom>({ fs: 0, side: 0 });
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const st = stageRef.current;
      const l = leftRef.current;
      const r = rightRef.current;
      if (!st || !l || !r) return;
      const side = Math.min(st.offsetLeft - (l.offsetLeft + l.offsetWidth), r.offsetLeft - (st.offsetLeft + st.offsetWidth));
      setRoom((was) => (was.fs === st.offsetWidth && was.side === side ? was : { fs: st.offsetWidth, side }));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [order.length]);
  const spots = swordSpots(left, right, room);

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    stats.current = {};
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

  // a short jolt when my blade connects
  const jolt = () => {
    const el = stageRef.current;
    if (!el || reducedMotion()) return;
    el.classList.remove('fr-jolt');
    void el.offsetWidth;
    el.classList.add('fr-jolt');
  };

  // the item up now: null while its result is on show
  const item = fv.item && fv.phase === 'play' && !(fv.result && fv.result.round === fv.item.round) ? fv.item : null;
  const itemRound = item?.round ?? null;
  useEffect(() => {
    if (itemRound === null) return;
    setShown(null);
    fruitSfx.pop();
  }, [itemRound]);

  // a new result: swords swing, the fruit is cut (or the magnet zaps), tallies for the podium
  const resultRound = fv.result?.round ?? null;
  useEffect(() => {
    const r = fv.result;
    if (!r) return;
    setShown({ round: r.round, kind: r.kind, winner: r.winner, reactions: r.reactions, slowed: r.slowed });
    for (const [id, ms] of Object.entries(r.reactions)) {
      const s = (stats.current[id] ??= { won: 0, best: null, magnets: 0 });
      if (ms !== null && r.kind !== 'magnet') s.best = s.best === null ? ms : Math.min(s.best, ms);
      if (ms !== null && r.kind === 'magnet') s.magnets++;
    }
    if (r.winner && r.kind !== 'magnet') stats.current[r.winner].won++;
    if (r.kind === 'magnet') {
      if (r.slowed.length) fruitSfx.magnet();
      if (r.slowed.includes(view.meId)) {
        shake();
        navigator.vibrate?.(160);
      }
    } else if (r.winner) fruitSfx.slice(r.winner === view.meId ? 1.15 : 0.9);
    const t = window.setTimeout(() => setShown((s) => (s?.round === r.round ? null : s)), RESULT_MS);
    return () => window.clearTimeout(t);
  }, [resultRound]);

  // the Strike button: reaction = tap time - when this phone painted the item
  const strike = (tapAt: number) => {
    unlockAudio();
    unlockSpeech();
    if (watching || !playing || fv.phase !== 'play') return;
    const p = painted.current;
    // one strike per item, even when two taps land before the next render
    if (item && (mine?.round === item.round || struckRound.current === item.round)) return;
    const reaction = item && p && p.round === item.round ? Math.round(tapAt - p.at) : -1;
    // nothing up yet (or a guess faster than any human): too early, nothing sent
    if (reaction < FRUIT_MIN_REACTION_MS || !item) {
      setEarly((n) => n + 1);
      fruitSfx.early();
      return;
    }
    struckRound.current = item.round;
    setMine({ round: item.round, reaction });
    fruitSfx.swoosh();
    // the blade meets the fruit at contact (later for a slowed sword): a shing and a jolt
    tm.later(() => {
      fruitSfx.shing();
      jolt();
    }, (fv.slow[view.meId] ?? 0) > 0 ? CONTACT_MS * 2.2 : CONTACT_MS);
    void actions.gameMoveQuiet({ kind: 'fruit', move: { type: 'strike', round: item.round, reaction } });
  };
  const strikeRef = useRef(strike);
  strikeRef.current = strike;
  const onStrike = (e: RPointerEvent) => {
    e.preventDefault();
    const now = performance.now();
    strikeRef.current(e.timeStamp > 0 && now - e.timeStamp < 1000 && e.timeStamp <= now ? e.timeStamp : now);
  };
  useEffect(() => {
    if (!early) return;
    const t = window.setTimeout(() => setEarly(0), 600);
    return () => window.clearTimeout(t);
  }, [early]);

  // Space or Enter strikes on a keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat || (e.target as HTMLElement)?.closest?.('input, textarea, button')) return;
      e.preventDefault();
      strikeRef.current(performance.now());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the 3-2-1 countdown and its beeps
  const beeped = useRef<number | null>(null);
  useEffect(() => {
    if (fv.phase !== 'countdown' && count === null) return;
    const t = window.setInterval(() => {
      const leftMs = fv.startsAt - clock.now();
      const c = leftMs > 0 ? Math.ceil(leftMs / 1000) : leftMs > -700 ? 0 : null;
      setCount(c);
      if (c !== null && c !== beeped.current) {
        beeped.current = c;
        fruitSfx.count(c === 0);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [fv.phase, fv.startsAt, count === null]);

  // the last item done: a buzzer, then the podium
  useEffect(() => {
    if (view.phase !== 'over') return;
    fruitSfx.end();
    const t = window.setTimeout(() => setPodium(true), 1600);
    return () => window.clearTimeout(t);
  }, [view.phase]);

  const live = !watching && playing && fv.phase === 'play';
  const mySlow = fv.slow[view.meId] ?? 0;
  const myScore = fv.scores[view.meId] ?? 0;
  const mineNow = stats.current[view.meId];
  const infoMine = !watching && (
    <p className="tinfo-counts">
      <span>{`⭐ ${myScore} points`}</span>
      <span>{`🍉 ${mineNow?.won ?? 0} won`}</span>
      <span>{`⚡ Best ${mineNow?.best ? `${(mineNow.best / 1000).toFixed(2)}s` : '—'}`}</span>
    </p>
  );
  const tips = ['Tap Strike the moment a fruit appears: fastest reaction wins it', `Never strike the magnet 🧲: your sword goes slow for ${FRUIT_MAGNET_ROUNDS} items`, 'Tapping before anything appears does nothing'];
  const status = !playing
    ? ''
    : fv.phase === 'countdown'
      ? 'Get ready…'
      : fv.phase === 'over'
        ? 'All done!'
        : watching
          ? '👀 Watching'
          : mySlow > 0
            ? `🧲 Slow sword · ${mySlow} more`
            : item?.kind === 'magnet'
              ? "🧲 Don't strike!"
              : item
                ? '⚔️ Strike!'
                : 'Wait for it…';
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
          <b key={score} className="ar-num bump" title="Score">
            {best > 0 && score === best ? '👑' : '⭐'} {score}
            {(fv.slow[id] ?? 0) > 0 && <small className="fd-seat-slow">🧲</small>}
          </b>
        }
      />
    );
  };

  return (
    <main className={cx('table lu-table ar-table fr-table fd-table', live && 'fr-live')} style={{ '--my-col': myColor } as CSSProperties}>
      <div className="fr-dojo" aria-hidden>
        <i className="fr-bokeh" />
      </div>
      <div ref={stageRef} className="fd-stage" onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove('fr-shake', 'fr-jolt')}>
        <Duel
          fv={fv}
          spots={spots}
          swordLen={swordSize(room).len}
          meId={view.meId}
          colorOf={colorOf}
          nameOf={shortName}
          live={item}
          shown={item ? null : shown}
          mine={mine}
          early={early}
          onPainted={(r, t) => (painted.current = { round: r, at: t })}
        />
      </div>
      <div ref={leftRef} className="ar-seats ar-left">{left.map(seat)}</div>
      <div ref={rightRef} className="ar-seats ar-right fd-right">{right.map(seat)}</div>

      <div className="fr-hud" aria-live="off">
        <span className="fr-timer">
          {fv.phase === 'countdown' ? `${fv.rounds} items` : `Item ${Math.min(fv.round, fv.rounds)} / ${fv.rounds}`}
        </span>
        <ol className="fr-board">
          {ranked.map((id) => (
            <li key={id} style={{ '--c': colorOf(id) } as CSSProperties} className={cx(id === view.meId && 'me')}>
              <i />
              <b>{fv.scores[id] ?? 0}</b>
            </li>
          ))}
        </ol>
      </div>

      {!watching && view.phase !== 'over' && (
        <button
          className={cx('fd-strike', item && !(mine?.round === item.round) && 'ready', mySlow > 0 && 'slow', early > 0 && 'early')}
          aria-label="Strike"
          onPointerDown={onStrike}
          onContextMenu={(e) => e.preventDefault()}
          disabled={!live}
        >
          <span key={early} className="fd-strike-face">
            <b>⚔️</b>
            <small>{early > 0 ? 'Too early!' : 'Strike'}</small>
          </span>
          {mySlow > 0 && <em className="fd-strike-slow">🧲 ×{mySlow}</em>}
        </button>
      )}

      {count !== null && playing && (
        <div key={count} className={cx('ar-count', count === 0 && 'go')} aria-live="assertive">
          {count === 0 ? 'Ready!' : count}
        </div>
      )}
      {view.phase === 'over' && !podium && <div className="ar-count go ar-end">{view.winnerIds.includes(view.meId) ? 'Fastest sword!' : 'All done!'}</div>}

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
      {view.players.some((p) => p.id === view.meId) && <YouAreBanner on={view.phase === 'playing'} color={myColor} name={colorName(myColor)} />}
      {watching && <p className="lu-watch-note">👀 Watching · you'll play next game</p>}

      {view.phase === 'over' && podium && !overSeen && <FruitOver view={view} fv={fv} order={order} colorOf={colorOf} stats={stats.current} onNext={() => setOverSeen(true)} />}
      {view.phase === 'over' && overSeen && <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />}
      {levelUp !== null && overSeen && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {target && view.players.find((p) => p.id === target) && (
        <SeatSheet player={view.players.find((p) => p.id === target)!} auth={auth} onThrow={(i) => void actions.throwAt(target, i)} onClose={() => setTarget(null)} />
      )}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} leaveWhat="Your score stops" kickWhat="Their score stops" />
    </main>
  );
}
