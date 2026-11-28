// The Five in a Row board: wood with grid lines and star points, glossy stones, last-move ring, the winning strike; pan and zoom on big boards
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPE, type ReactElement } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { rc, starPoints } from './lib';

interface Props {
  size: number;
  stones: Record<number, string>;
  colorOf: (id: string) => string;
  /** the colours that have a gradient, in seat order */
  palette: readonly string[];
  last: { seq: number; at: number } | null;
  win: number[] | null;
  /** my turn: taps pick points */
  live: boolean;
  ghost: number | null;
  myColor: string;
  /** only this point may be played (the first stone) */
  only: number | null;
  onTap: (at: number) => void;
}

const PAD = 0.85;
const MAX_Z = 3;

export function GomokuBoard({ size, stones, colorOf, palette, last, win, live, ghost, myColor, only, onTap }: Props) {
  const vp = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; sx: number; sy: number; vx: number; vy: number; dist?: number; z0?: number; mid?: { x: number; y: number } } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const tapWait = useRef(0);
  const W = size - 1 + PAD * 2;

  // zoom is offered when a point is under ~28 px across (19 × 19 on a phone)
  const zoomable = () => {
    const w = vp.current?.clientWidth ?? 600;
    return w / size < 28;
  };
  useEffect(() => setView({ z: 1, x: 0, y: 0 }), [size]);

  const clamp = (z: number, x: number, y: number) => {
    const w = vp.current?.clientWidth ?? 0;
    const h = vp.current?.clientHeight ?? 0;
    return { z, x: Math.min(0, Math.max(w - w * z, x)), y: Math.min(0, Math.max(h - h * z, y)) };
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = vp.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const zoomAt = (p: { x: number; y: number }, z2: number) =>
    setView((v) => clamp(z2, p.x - ((p.x - v.x) * z2) / v.z, p.y - ((p.y - v.y) * z2) / v.z));

  /** the board point under a screen point, or null when it's off the grid */
  const pointAt = (cx0: number, cy0: number): number | null => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    const c = Math.round(((cx0 - r.left) / r.width) * W - PAD);
    const rr = Math.round(((cy0 - r.top) / r.height) * W - PAD);
    if (c < 0 || rr < 0 || c >= size || rr >= size) return null;
    return rr * size + c;
  };

  const down = (e: RPE<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = local(e);
    pts.current.set(e.pointerId, p);
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      gesture.current = { moved: true, sx: 0, sy: 0, vx: view.x, vy: view.y, dist: Math.hypot(a.x - b.x, a.y - b.y), z0: view.z, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else gesture.current = { moved: false, sx: p.x, sy: p.y, vx: view.x, vy: view.y };
  };
  const move = (e: RPE<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || !pts.current.has(e.pointerId)) return;
    const p = local(e);
    pts.current.set(e.pointerId, p);
    if (pts.current.size >= 2 && g.dist && g.z0 && g.mid) {
      const [a, b] = [...pts.current.values()];
      const z2 = Math.min(MAX_Z, Math.max(1, (g.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist));
      zoomAt(g.mid, z2);
      return;
    }
    if (Math.hypot(p.x - g.sx, p.y - g.sy) > 8) g.moved = true;
    if (g.moved && view.z > 1) setView((v) => clamp(v.z, g.vx + p.x - g.sx, g.vy + p.y - g.sy));
  };
  const up = (e: RPE<HTMLDivElement>) => {
    const g = gesture.current;
    const many = pts.current.size > 1;
    pts.current.delete(e.pointerId);
    if (pts.current.size) return;
    gesture.current = null;
    if (!g || g.moved || many) return;
    const p = local(e);
    const now = performance.now();
    const t = lastTap.current;
    lastTap.current = { t: now, x: p.x, y: p.y };
    // a quick double tap zooms in (or back out); on a zoomable board a single tap waits to be sure it isn't one
    if (zoomable() && t && now - t.t < 320 && Math.hypot(p.x - t.x, p.y - t.y) < 30) {
      lastTap.current = null;
      window.clearTimeout(tapWait.current);
      if (view.z > 1) setView({ z: 1, x: 0, y: 0 });
      else zoomAt(p, 2.2);
      return;
    }
    if (!live) return;
    const at = pointAt(e.clientX, e.clientY);
    if (at === null || stones[at]) return;
    if (!zoomable()) return onTap(at);
    tapWait.current = window.setTimeout(() => onTap(at), 300);
  };
  useEffect(() => () => window.clearTimeout(tapWait.current), []);

  const lines: ReactElement[] = [];
  for (let i = 0; i < size; i++) {
    lines.push(<path key={`h${i}`} d={`M0 ${i}H${size - 1}`} />, <path key={`v${i}`} d={`M${i} 0V${size - 1}`} />);
  }
  const grad = (col: string) => `gm-st-${Math.max(0, palette.indexOf(col))}`;
  const stoneEls = Object.entries(stones).map(([k, id]) => {
    const { r, c } = rc(size, +k);
    const fresh = last?.at === +k;
    return (
      <g key={k} className={cx('gm-stone', fresh && 'fresh', win?.includes(+k) && 'won')} transform={`translate(${c} ${r})`}>
        <circle r="0.44" cy="0.07" fill="rgba(40,20,0,.45)" className="gm-shadow" />
        <circle r="0.44" fill={`url(#${grad(colorOf(id))})`} />
        <ellipse rx="0.2" ry="0.12" cx="-0.13" cy="-0.18" fill="#fff" opacity="0.55" />
      </g>
    );
  });
  const lastPt = last ? rc(size, last.at) : null;
  const ghostPt = ghost !== null ? rc(size, ghost) : null;
  const onlyPt = only !== null ? rc(size, only) : null;
  const winA = win?.length ? rc(size, win[0]) : null;
  const winB = win?.length ? rc(size, win[win.length - 1]) : null;

  return (
    <div
      ref={vp}
      className={cx('gm-viewport', live && 'live', view.z > 1 && 'zoomed')}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <div className="gm-zoom" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transition: gesture.current || reducedMotion() ? 'none' : undefined } as CSSProperties}>
        <svg ref={svg} className="gm-svg" viewBox={`${-PAD} ${-PAD} ${W} ${W}`} aria-label={`Five in a Row board, ${size} by ${size}`} role="img">
          <defs>
            {palette.map((col, i) => (
              <radialGradient key={col} id={`gm-st-${i}`} cx="0.36" cy="0.3" r="0.75">
                <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="0.18" stopColor={col} />
                <stop offset="0.85" stopColor={col} />
                <stop offset="1" stopColor="#000" stopOpacity="0.55" />
              </radialGradient>
            ))}
          </defs>
          <g className="gm-grid">{lines}</g>
          <path className="gm-edge" d={`M0 0H${size - 1}V${size - 1}H0Z`} />
          {starPoints(size).map((s) => {
            const p = rc(size, s);
            return <circle key={s} className="gm-star" cx={p.c} cy={p.r} r="0.11" />;
          })}
          {onlyPt && live && <circle className="gm-only" cx={onlyPt.c} cy={onlyPt.r} r="0.42" style={{ ['--c' as string]: myColor }} />}
          {stoneEls}
          {lastPt && <circle key={`l${last!.seq}`} className="gm-last" cx={lastPt.c} cy={lastPt.r} r="0.24" />}
          {winA && winB && <path key={`w${win!.join()}`} className="gm-strike" d={`M${winA.c} ${winA.r}L${winB.c} ${winB.r}`} pathLength={1} />}
          {ghostPt && live && (
            <g className="gm-ghost" transform={`translate(${ghostPt.c} ${ghostPt.r})`}>
              <circle r="0.44" fill={myColor} opacity="0.55" />
              <circle r="0.56" fill="none" stroke={myColor} strokeWidth="0.07" />
            </g>
          )}
        </svg>
      </div>
      {zoomable() && view.z === 1 && <span className="gm-zoom-tip">Double-tap to zoom</span>}
    </div>
  );
}
