// The Spike Attack arena, redrawn every frame: crates, a glowing launcher on the warned side with its 3-2-1, the red danger area up to the crates, spike walls that stop at them, and the free-running players
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { SPIKES_LIVES, type SpikeDir, type SpikesView } from '../../types';
import { cellSafe, freeCells, hitBy, reachesOf, reachRect, type Cell } from './rules';

interface Props {
  sv: SpikesView;
  /** server time now */
  now: () => number;
  order: string[];
  colorOf: (id: string) => string;
  initialOf: (id: string) => string;
  /** a short name for the tag under each player */
  nameOf: (id: string) => string;
  meId: string;
  /** where to draw each player (mine may be ahead of the server) */
  posOf: (id: string) => [number, number];
  onStrike: (w: { id: number; dir: SpikeDir }) => void;
  /** a wall reached its crates */
  onThud: () => void;
  onHit: (ids: string[]) => void;
  onTick: (msLeft: number, onMe: boolean) => void;
}

interface Flying {
  id: number;
  dir: SpikeDir;
  born: number;
  thud: boolean;
}

/** the wall shoots across, stays out a moment, then pulls back */
const SHOOT_MS = 240;
const HOLD_MS = 320;
const BACK_MS = 260;
const FLY_MS = SHOOT_MS + HOLD_MS + BACK_MS;
const rect = (r: { x: number; y: number; w: number; h: number }) => ({ '--rx': r.x, '--ry': r.y, '--rw': r.w, '--rh': r.h }) as CSSProperties;
/** where a wall on `line` meets its crate (arena units) */
const dustAt = (n: number, dir: SpikeDir, line: number, r: number) =>
  dir === 'left' ? { x: r, y: line + 0.5, w: 0, h: 0 } : dir === 'right' ? { x: n - r, y: line + 0.5, w: 0, h: 0 } : dir === 'top' ? { x: line + 0.5, y: r, w: 0, h: 0 } : { x: line + 0.5, y: n - r, w: 0, h: 0 };
const easeOut = (k: number) => 1 - (1 - k) ** 3;
const DIRS: SpikeDir[] = ['left', 'right', 'top', 'bottom'];

export function Arena({ sv, now, order, colorOf, initialOf, nameOf, meId, posOf, onStrike, onThud, onHit, onTick }: Props) {
  const [, setFrame] = useState(0);
  const flown = useRef(new Set<number>());
  const seenStrikes = useRef(new Set<number>(sv.strikes.map((s) => s.id)));
  const flying = useRef<Flying[]>([]);
  const hitAt = useRef<Record<string, number>>({});
  const lastPos = useRef<Record<string, { p: [number, number]; lean: number }>>({});
  const n = sv.size;
  const boxes = sv.boxes ?? [];
  const boxKey = JSON.stringify(boxes);
  const reaches = useMemo(() => reachesOf(n, boxes), [n, boxKey]);
  const free = useMemo(() => freeCells(n, boxes), [n, boxKey]);
  // a crate shift that just landed: each crate slides from its old square (same index order)
  const landing = useRef<{ key: string; from: Cell[]; seq: number }>({ key: boxKey, from: boxes, seq: 0 });
  const nextWas = useRef<string>('');
  if (landing.current.key !== boxKey) {
    const old = JSON.parse(landing.current.key) as Cell[];
    // only a shift we warned about slides; anything else snaps
    const slid = nextWas.current === boxKey && old.length === boxes.length;
    landing.current = { key: boxKey, from: slid ? old : boxes, seq: landing.current.seq + 1 };
  }
  nextWas.current = sv.boxesNext ? JSON.stringify(sv.boxesNext) : '';
  const cbs = useRef({ onStrike, onThud, onHit, onTick, sv, posOf, reaches });
  cbs.current = { onStrike, onThud, onHit, onTick, sv, posOf, reaches };

  // every frame: launch walls whose time has come, thud them on the crates, tick the clock, redraw
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { sv: v, onStrike: strike, onThud: thud, onTick: tick, posOf: at, reaches: rs } = cbs.current;
      const t = now();
      const pnow = performance.now();
      let soonest = Infinity;
      let soonestOnMe = false;
      const mine = v.lives[meId] ? at(meId) : null;
      for (const w of v.warnings) {
        const left = w.strikeAt - t;
        if (left <= 0 && !flown.current.has(w.id)) {
          flown.current.add(w.id);
          flying.current.push({ id: w.id, dir: w.dir, born: pnow, thud: false });
          strike(w);
        }
        if (left > 0 && left < soonest) {
          soonest = left;
          soonestOnMe = !!mine && hitBy(v.size, rs[w.dir], w.dir, mine);
        }
      }
      if (soonest < Infinity) tick(soonest, soonestOnMe);
      for (const f of flying.current)
        if (!f.thud && pnow - f.born >= SHOOT_MS) {
          f.thud = true;
          if (rs[f.dir].some((r) => r < v.size)) thud();
        }
      flying.current = flying.current.filter((f) => pnow - f.born < FLY_MS + 80);
      setFrame((k) => (k + 1) % 1e6);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // strikes from the server: fly any we missed, and mark who was hit
  useEffect(() => {
    for (const s of sv.strikes) {
      if (seenStrikes.current.has(s.id)) continue;
      seenStrikes.current.add(s.id);
      if (!flown.current.has(s.id)) {
        flown.current.add(s.id);
        flying.current.push({ id: s.id, dir: s.dir, born: performance.now(), thud: false });
        onStrike(s);
      }
      if (s.hit.length) {
        for (const id of s.hit) hitAt.current[id] = performance.now();
        onHit(s.hit);
      }
    }
  }, [sv.strikes]);

  const t = now();
  const pnow = performance.now();
  const was = lastPos.current;
  const lastHit = Math.max(-1e9, ...Object.values(hitAt.current));
  const live = sv.warnings.filter((w) => w.strikeAt > t - 40);
  // squares shielded from every warned side: marked so the way out reads at a glance
  const safe = live.length ? free.filter((c) => live.every((w) => cellSafe(n, reaches, w.dir, c))) : [];
  // crates a wall just slammed into shake
  const struck = new Set<string>();
  for (const f of flying.current) {
    const age = pnow - f.born;
    if (age < SHOOT_MS || age > SHOOT_MS + 260) continue;
    reaches[f.dir].forEach((r, line) => {
      if (r >= n) return;
      const c: Cell = f.dir === 'left' ? [r, line] : f.dir === 'right' ? [n - 1 - r, line] : f.dir === 'top' ? [line, r] : [line, n - 1 - r];
      struck.add(`${c[0]},${c[1]}`);
    });
  }
  // the warned walls rumble and drop grit from their slots
  const warned = new Set(live.filter((w) => w.strikeAt > t).map((w) => w.dir));
  const mine = sv.lives[meId] ? posOf(meId) : null;
  const myDanger = mine ? live.filter((w) => w.strikeAt > t && hitBy(n, reaches[w.dir], w.dir, mine)) : [];
  // a crate shift on the way: ghost outlines fill up until the crates land
  const ghosts = sv.boxesNext && (sv.boxesAt ?? 0) > t - 200 ? sv.boxesNext : [];
  const shiftLeft = Math.max(0, (sv.boxesAt ?? 0) - t);
  const shiftK = Math.min(1, 1 - shiftLeft / 2000);
  const shiftSec = Math.max(1, Math.ceil(shiftLeft / 1000));
  const myLeft = myDanger.length ? Math.min(...myDanger.map((w) => w.strikeAt - t)) : 0;

  return (
    <div className={cx('sp-arena', n >= 10 && 'small')} style={{ '--n': n } as CSSProperties}>
      <Tiles n={n} />
      <div className="sp-slots" aria-hidden>
        {DIRS.map((d) => (
          <i key={d} className={cx('sp-slot', `from-${d}`, warned.has(d) && 'rumble')}>
            {warned.has(d) && [0, 1, 2, 3].map((g) => <i key={g} className="sp-grit" style={{ '--g': g } as CSSProperties} />)}
          </i>
        ))}
      </div>
      {pnow - lastHit < 400 && <i key={`h${Math.round(lastHit)}`} className="sp-flash" aria-hidden />}
      {safe.map(([c, r]) => (
        <i key={`s${c},${r}`} className="sp-safe" style={rect({ x: c, y: r, w: 1, h: 1 })} aria-hidden />
      ))}
      {live.map((w) => {
        const total = Math.max(1, w.strikeAt - w.warnAt);
        const left = Math.max(0, w.strikeAt - t);
        const k = 1 - left / total;
        const sec = Math.max(1, Math.ceil(left / 1000));
        return (
          <div key={w.id} className={cx('sp-wall', `from-${w.dir}`, left < 1000 && 'last')} style={{ '--k': k } as CSSProperties} aria-hidden>
            {reaches[w.dir].map((r, line) => r > 0 && <i key={line} className="sp-danger" style={rect(reachRect(n, w.dir, line, r))} />)}
            <span className="sp-launcher">
              {reaches[w.dir].map((_, line) => (
                <i key={line} className="sp-peek">
                  <SpikeIcon />
                </i>
              ))}
            </span>
            <b key={sec} className="sp-wall-count">
              {sec}
            </b>
          </div>
        );
      })}
      {boxes.map(([c, r], i) => {
        const [fc, fr] = landing.current.from[i] ?? [c, r];
        const moved = fc !== c || fr !== r;
        const st = { ...rect({ x: c, y: r, w: 1, h: 1 }), '--fx': fc - c, '--fy': fr - r } as CSSProperties;
        return (
          <i key={moved ? `b${i}-${landing.current.seq}` : `b${i}`} className={cx('sp-box', struck.has(`${c},${r}`) && 'thud', moved && 'slid', ghosts.length > 0 && 'leaving')} style={st} aria-hidden>
            <i className="sp-box-face" />
          </i>
        );
      })}
      {ghosts.map(([c, r], i) => (
        <i key={`g${c},${r}`} className="sp-ghost" style={{ ...rect({ x: c, y: r, w: 1, h: 1 }), '--gk': shiftK, '--gd': i * 0.05 } as CSSProperties} aria-hidden>
          <i className="sp-ghost-fill" />
        </i>
      ))}
      {ghosts.length > 0 && (
        <b key={shiftSec} className="sp-shift-note" aria-live="polite">
          {`📦 Crates move · ${shiftSec}`}
        </b>
      )}
      {flying.current.map((f) => {
        const age = pnow - f.born;
        const p = age < SHOOT_MS ? easeOut(age / SHOOT_MS) : age < SHOOT_MS + HOLD_MS ? 1 : Math.max(0, 1 - (age - SHOOT_MS - HOLD_MS) / BACK_MS);
        return (
          <div key={`f${f.id}`} className={cx('sp-strike', `from-${f.dir}`)} style={{ '--sp-p': p } as CSSProperties} aria-hidden>
            {reaches[f.dir].map(
              (r, line) =>
                r > 0 && (
                  <span key={line} className="sp-shot" style={rect(reachRect(n, f.dir, line, r))}>
                    <i className="sp-rod">
                      <SpikeIcon />
                    </i>
                  </span>
                ),
            )}
            {age >= SHOOT_MS &&
              age < SHOOT_MS + 320 &&
              reaches[f.dir].map(
                (r, line) =>
                  r < n && [
                    <i key={`d${line}`} className="sp-dust" style={rect(dustAt(n, f.dir, line, r))} />,
                    <i key={`k${line}`} className="sp-spark" style={rect(dustAt(n, f.dir, line, r))} />,
                  ],
              )}
          </div>
        );
      })}
      {order.map((id) => {
        const [x, y] = posOf(id);
        const lives = sv.lives[id] ?? 0;
        // lean into the run, eased so it doesn't flicker
        const prev = was[id];
        const vx = prev ? x - prev.p[0] : 0;
        const moved = prev ? Math.hypot(vx, y - prev.p[1]) > 0.004 : false;
        const lean = (prev?.lean ?? 0) * 0.8 + Math.max(-1, Math.min(1, vx * 25)) * 0.2;
        was[id] = { p: [x, y], lean };
        const hurt = (sv.safeUntil[id] ?? 0) > t || pnow - (hitAt.current[id] ?? -1e9) < 900;
        const popped = pnow - (hitAt.current[id] ?? -1e9) < 900;
        const danger = id === meId && myDanger.length > 0 && lives > 0;
        return (
          <div
            key={id}
            className={cx('sp-player', id === meId && 'me', lives <= 0 && 'ghost', hurt && lives > 0 && 'hurt', moved && 'run', danger && 'danger')}
            style={{ '--c': colorOf(id), '--x': x, '--y': y, '--lean': `${(lean * 12).toFixed(1)}deg` } as CSSProperties}
          >
            {lives > 0 && (
              <span className="sp-hp" aria-hidden>
                {Array.from({ length: SPIKES_LIVES }, (_, i) => (
                  <i key={i} className={cx(i >= lives && 'lost')}>
                    ♥
                  </i>
                ))}
              </span>
            )}
            <span className="sp-body">
              <span className="sp-eyes" />
              <span className="sp-mouth" />
              <b data-no-translate>{initialOf(id)}</b>
            </span>
            {danger && <em className="sp-me-count">{Math.max(1, Math.ceil(myLeft / 1000))}</em>}
            {popped && <em className="sp-minus">💔</em>}
            <small className="sp-tag" data-no-translate>
              {id === meId ? 'You' : nameOf(id)}
            </small>
          </div>
        );
      })}
    </div>
  );
}

/** the floor: one tile per square, drawn once */
const Tiles = memo(function Tiles({ n }: { n: number }) {
  return (
    <div className="sp-tiles" aria-hidden>
      {Array.from({ length: n * n }, (_, i) => (
        <i key={i} className={cx('sp-tile', (Math.floor(i / n) + (i % n)) % 2 && 'alt', `c${(i * 7 + Math.floor(i / n) * 3) % 5}`)} />
      ))}
    </div>
  );
});

/** one polished steel spike pointing along the strike, with a glint that runs along it */
export function SpikeIcon() {
  return (
    <svg viewBox="0 0 40 24" className="sp-spike" aria-hidden>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".35" stopColor="#cfd8dc" />
          <stop offset=".55" stopColor="#78909c" />
          <stop offset=".8" stopColor="#b0bec5" />
          <stop offset="1" stopColor="#37474f" />
        </linearGradient>
      </defs>
      <path d="M0 2L40 12 0 22z" fill="url(#spk)" stroke="#1c262b" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M0 12H38" stroke="#455a64" strokeWidth=".8" opacity=".7" />
      <path className="sp-glint" d="M2 6L32 11.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
