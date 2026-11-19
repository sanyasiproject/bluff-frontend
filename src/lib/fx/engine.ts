// shared canvas tools for shop effects: one animation loop, randomness, smooth noise, glow sprites, lightning

export type Painter = (dt: number, t: number) => void;

const painters = new Set<Painter>();
let frame = 0;
let last = 0;

function loop(now: number) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  for (const p of painters) p(dt, now / 1000);
  frame = painters.size > 0 ? requestAnimationFrame(loop) : 0;
  if (!frame) last = 0;
}

/** paints every frame until the returned stop is called; one shared loop for every effect on screen */
export function animate(p: Painter): () => void {
  painters.add(p);
  if (!frame) frame = requestAnimationFrame(loop);
  return () => painters.delete(p);
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
export const chance = (perSec: number, dt: number) => Math.random() < perSec * dt;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const easeOut = (x: number) => 1 - (1 - clamp(x)) ** 3;

/** smooth 1D value noise in [-1, 1]; each instance has its own random field, so nothing repeats in step */
export function noise1() {
  const n = 256;
  const v = Array.from({ length: n }, () => Math.random() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    const a = v[((i % n) + n) % n];
    const b = v[(((i + 1) % n) + n) % n];
    return a + (b - a) * s;
  };
}

/** two octaves of noise, a little more organic */
export function noise2() {
  const a = noise1();
  const b = noise1();
  return (x: number) => a(x) * 0.7 + b(x * 2.3 + 17) * 0.3;
}

const sprites = new Map<string, HTMLCanvasElement>();

/** a soft round glow of one colour, drawn once and reused (cheap compared with shadowBlur) */
export function glow(color: string, size = 64, core = 0.15): HTMLCanvasElement {
  const key = `${color}|${size}|${core}`;
  const hit = sprites.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, color);
  grad.addColorStop(core, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  sprites.set(key, c);
  return c;
}

/** draws a glow sprite centred at x,y with radius r */
export function blob(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, x: number, y: number, r: number, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  ctx.globalAlpha = clamp(alpha);
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2);
}

export interface Pt {
  x: number;
  y: number;
}

/** a jagged lightning path between two points (midpoint displacement), never the same twice */
export function boltPath(a: Pt, b: Pt, rough = 0.28, minSeg = 5): Pt[] {
  const out: Pt[] = [a];
  const split = (p: Pt, q: Pt, d: number) => {
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    if (len < minSeg) {
      out.push(q);
      return;
    }
    const nx = -(q.y - p.y) / len;
    const ny = (q.x - p.x) / len;
    const off = (Math.random() * 2 - 1) * d;
    const m = { x: (p.x + q.x) / 2 + nx * off, y: (p.y + q.y) / 2 + ny * off };
    split(p, m, d / 2);
    split(m, q, d / 2);
  };
  split(a, b, Math.hypot(b.x - a.x, b.y - a.y) * rough);
  return out;
}

export interface Bolt {
  main: Pt[];
  branches: Pt[][];
}

/** a bolt with forks that split off and fade */
export function makeBolt(a: Pt, b: Pt, rough = 0.28, forks = 3, minSeg = 5): Bolt {
  const main = boltPath(a, b, rough, minSeg);
  const branches: Pt[][] = [];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  for (let i = 0; i < forks; i++) {
    const from = main[Math.floor(rand(0.15, 0.8) * main.length)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x) + rand(-1.1, 1.1);
    const l = len * rand(0.15, 0.4);
    branches.push(boltPath(from, { x: from.x + Math.cos(ang) * l, y: from.y + Math.sin(ang) * l }, rough * 1.2, minSeg));
  }
  return { main, branches };
}

function stroke(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

/** glowing bolt: wide soft halo, a bright body and a white-hot core */
export function drawBolt(ctx: CanvasRenderingContext2D, bolt: Bolt, alpha: number, width = 1, tint = '150,200,255') {
  if (alpha <= 0) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const passes: [number, string][] = [
    [7 * width, `rgba(${tint},${0.12 * alpha})`],
    [3.2 * width, `rgba(${tint},${0.45 * alpha})`],
    [1.2 * width, `rgba(255,255,255,${0.95 * alpha})`],
  ];
  for (const [w, c] of passes) {
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    stroke(ctx, bolt.main);
    ctx.lineWidth = w * 0.55;
    for (const br of bolt.branches) stroke(ctx, br);
  }
}

/** flicker of a strike over its life (0..1): a few hard flashes, then a fade, like real lightning */
export function strikeAlpha(life: number, pattern: number[]): number {
  const i = Math.floor(clamp(life, 0, 0.999) * pattern.length);
  return pattern[i] * (1 - life * 0.5);
}

export const strikePattern = () => {
  const n = Math.floor(rand(5, 9));
  return Array.from({ length: n }, (_, i) => (i === 0 ? 1 : Math.random() < 0.35 ? 0.1 : rand(0.5, 1)));
};

/** sets up a canvas for its css size and the screen's pixel density; returns the 2d context */
export function fitCanvas(c: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

/** a rounded rectangle path */
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** a point on a box's edge; u goes once round it (0..1) clockwise from the top-left */
export function onEdge(x: number, y: number, w: number, h: number, u: number): Pt {
  const p = 2 * (w + h);
  let d = (((u % 1) + 1) % 1) * p;
  if (d < w) return { x: x + d, y };
  d -= w;
  if (d < h) return { x: x + w, y: y + d };
  d -= h;
  if (d < w) return { x: x + w - d, y: y + h };
  d -= w;
  return { x, y: y + h - d };
}
