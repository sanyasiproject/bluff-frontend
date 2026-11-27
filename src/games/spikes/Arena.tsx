// The Spike Attack arena, redrawn every frame: faint box lanes, red warning bands with their 3-2-1, spikes shooting across, and the free-running players
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { inBand } from './sim';
import { SPIKES_LIVES, type SpikeDir, type SpikesView } from '../../types';

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
  onStrike: (w: { id: number; dir: SpikeDir; line: number }) => void;
  onHit: (ids: string[]) => void;
  onTick: (msLeft: number, onMe: boolean) => void;
}

interface Flying {
  id: number;
  dir: SpikeDir;
  line: number;
  born: number;
}

const FLY_MS = 520;
const horizontal = (d: SpikeDir) => d === 'left' || d === 'right';

export function Arena({ sv, now, order, colorOf, initialOf, nameOf, meId, posOf, onStrike, onHit, onTick }: Props) {
  const [, setFrame] = useState(0);
  const flown = useRef(new Set<number>());
  const seenStrikes = useRef(new Set<number>(sv.strikes.map((s) => s.id)));
  const flying = useRef<Flying[]>([]);
  const hitAt = useRef<Record<string, number>>({});
  const lastPos = useRef<Record<string, { p: [number, number]; lean: number }>>({});
  const cbs = useRef({ onStrike, onHit, onTick, sv, posOf });
  cbs.current = { onStrike, onHit, onTick, sv, posOf };

  // every frame: launch spikes whose time has come, then redraw
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const { sv: v, onStrike: strike, onTick: tick, posOf: at } = cbs.current;
      const t = now();
      let soonest = Infinity;
      let soonestOnMe = false;
      const mine = v.lives[meId] ? at(meId) : null;
      for (const w of v.warnings) {
        const left = w.strikeAt - t;
        if (left <= 0 && !flown.current.has(w.id)) {
          flown.current.add(w.id);
          flying.current.push({ id: w.id, dir: w.dir, line: w.line, born: performance.now() });
          strike(w);
        }
        if (left > 0 && left < soonest) {
          soonest = left;
          soonestOnMe = !!mine && inBand(mine, w);
        }
      }
      if (soonest < Infinity) tick(soonest, soonestOnMe);
      flying.current = flying.current.filter((f) => performance.now() - f.born < FLY_MS + 200);
      setFrame((n) => (n + 1) % 1e6);
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
        flying.current.push({ id: s.id, dir: s.dir, line: s.line, born: performance.now() });
        onStrike(s);
      }
      if (s.hit.length) {
        for (const id of s.hit) hitAt.current[id] = performance.now();
        onHit(s.hit);
      }
    }
  }, [sv.strikes]);

  const t = now();
  const n = sv.size;
  const pnow = performance.now();
  const lineStyle = (_dir: SpikeDir, line: number) => ({ '--line': line, '--n': n }) as CSSProperties;
  const was = lastPos.current;
  // anyone hit just now: the arena flashes red
  const lastHit = Math.max(-1e9, ...Object.values(hitAt.current));

  return (
    <div className="sp-arena" style={{ '--n': n } as CSSProperties}>
      <Tiles n={n} />
      {pnow - lastHit < 400 && <i key={`h${Math.round(lastHit)}`} className="sp-flash" aria-hidden />}
      {sv.warnings
        .filter((w) => w.strikeAt > t - 40)
        .map((w) => {
          const total = Math.max(1, w.strikeAt - w.warnAt);
          const left = Math.max(0, w.strikeAt - t);
          const k = 1 - left / total;
          const sec = Math.ceil(left / 1000);
          return (
            <div key={w.id} className={cx('sp-warn', horizontal(w.dir) ? 'row' : 'col', `from-${w.dir}`, left < 1000 && 'last')} style={{ ...lineStyle(w.dir, w.line), '--k': k } as CSSProperties}>
              <i className="sp-warn-tint" style={{ opacity: 0.5 + k * 0.45 }} />
              <i className="sp-warn-fill" style={{ transform: horizontal(w.dir) ? `scaleX(${k})` : `scaleY(${k})` }} />
              <span className="sp-warn-edge" aria-hidden>
                <i className="sp-launch" />
                <SpikeIcon />
                <i className="sp-arrow">▶</i>
              </span>
              <b key={sec} className="sp-warn-count">
                {sec}
              </b>
            </div>
          );
        })}
      {flying.current.map((f) => {
        const k = Math.min(1, (pnow - f.born) / FLY_MS);
        return (
          <div key={`f${f.id}`} className={cx('sp-fly', horizontal(f.dir) ? 'row' : 'col', `from-${f.dir}`)} style={{ ...lineStyle(f.dir, f.line), '--p': k, opacity: k > 0.85 ? (1 - k) / 0.15 : 1 } as CSSProperties}>
            <i className="sp-slash" />
            <span className="sp-spikes">
              <i className="sp-wall-base" />
              <span className="sp-wall-tips">
                {Array.from({ length: 3 }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            </span>
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
        return (
          <div
            key={id}
            className={cx('sp-player', id === meId && 'me', lives <= 0 && 'ghost', hurt && lives > 0 && 'hurt', moved && 'run')}
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
        <i key={i} className={cx('sp-tile', (Math.floor(i / n) + (i % n)) % 2 && 'alt')} />
      ))}
    </div>
  );
});

/** one steel spike pointing along the strike */
export function SpikeIcon() {
  return (
    <svg viewBox="0 0 40 24" className="sp-spike" aria-hidden>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eceff1" />
          <stop offset=".5" stopColor="#90a4ae" />
          <stop offset="1" stopColor="#455a64" />
        </linearGradient>
      </defs>
      <path d="M0 2L40 12 0 22z" fill="url(#spk)" stroke="#263238" strokeWidth="1.5" />
      <path d="M2 5L30 12" stroke="#fff" strokeWidth="1.5" opacity=".7" />
    </svg>
  );
}
