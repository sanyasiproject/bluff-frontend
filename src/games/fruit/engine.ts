// Fruit Slice Duel on a canvas at 60 fps: everyone's fruit from the seed, my blade, cuts, juice and popups
import { fruitAt, fruitWave, type FruitKind, type FruitSpawn } from '../../types';
import { reducedMotion } from '../../lib/motion';
import { FLESH } from './art';
import { STAIN_MS, drawDrop, drawFruit, drawHalf, drawPopup, drawSlash, drawSplat, drawTrail, type Drop, type Half, type Popup, type Slash, type Splat, type TrailPt } from './draw';

const TRAIL_MS = 190;
/** cuts in one swipe within this long go to the server together (a combo) */
const BATCH_MS = 240;
const G = 1500;

export interface Cut {
  ids: number[];
  kinds: FruitKind[];
  at: number;
  x: number;
  y: number;
}

export class FruitEngine {
  private c: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private wave: FruitSpawn[] = [];
  private seed = -1;
  private startsAt = 0;
  private gone = new Set<number>();
  private halves: Half[] = [];
  private drops: Drop[] = [];
  private splats: Splat[] = [];
  private popups: Popup[] = [];
  private slashes: Slash[] = [];
  private trail: TrailPt[] = [];
  private flash = 0;
  private down = false;
  private batch: { ids: number[]; kinds: FruitKind[]; at: number; first: number; x: number; y: number } | null = null;
  private raf = 0;
  private lastFrame = 0;
  live = false;
  color = '#7cf';
  /** px kept clear at the left and right for the seats: fruit fly between them */
  inset = { l: 0, r: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private serverNow: () => number,
    private onCut: (cut: Cut) => void,
    private onHit: (kind: FruitKind) => void,
  ) {
    this.c = canvas.getContext('2d')!;
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setGame(seed: number, seconds: number, startsAt: number, sliced: number[]) {
    if (seed !== this.seed) {
      this.seed = seed;
      this.wave = fruitWave(seed, seconds);
      this.gone = new Set();
      this.halves = [];
    }
    this.startsAt = startsAt;
    for (const id of sliced) this.gone.add(id);
  }

  /** ms since the fruit started, by the server's clock */
  elapsed() {
    return this.serverNow() - this.startsAt;
  }

  private fieldW() {
    return Math.max(100, this.w - this.inset.l - this.inset.r);
  }

  /** big fruit: about a ninth of the play width */
  private radius(kind: FruitKind) {
    const base = Math.max(26, Math.min(84, this.fieldW() / 9, this.h * 0.13));
    return kind === 'melon' ? base * 1.15 : kind === 'grapes' ? base * 1.05 : base;
  }

  private toPx(p: { x: number; y: number }) {
    // the top strip stays for the timer and scores
    const top = Math.min(56, this.h * 0.12);
    return { x: this.inset.l + p.x * this.fieldW(), y: top + (this.h - top) * (1 - p.y) };
  }

  private rotOf(f: FruitSpawn, ms: number) {
    return ((f.id % 7) - 3) * 0.3 + ((ms - f.t) / 1000) * (f.id % 2 ? 2.2 : -1.8);
  }

  /** someone else sliced this fruit: a slash in their colour where it is now */
  others(ids: number[], color: string) {
    const ms = this.elapsed();
    for (const id of ids) {
      const f = this.wave.find((x) => x.id === id);
      const p = f && fruitAt(f, ms);
      if (!p || this.gone.has(id)) continue;
      const q = this.toPx(p);
      this.slashes.push({ x: q.x, y: q.y, angle: Math.random() * Math.PI, color, born: performance.now() });
    }
  }

  pointerDown(x: number, y: number) {
    this.down = true;
    this.trail = [{ x, y, t: performance.now() }];
  }

  pointerMove(x: number, y: number) {
    if (!this.down) return;
    const now = performance.now();
    const prev = this.trail[this.trail.length - 1];
    this.trail.push({ x, y, t: now });
    if (this.trail.length > 40) this.trail.shift();
    if (prev && this.live) this.cutAlong(prev.x, prev.y, x, y);
  }

  pointerUp() {
    this.down = false;
    this.flush();
  }

  private cutAlong(x1: number, y1: number, x2: number, y2: number) {
    const ms = this.elapsed();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 4) return;
    const angle = Math.atan2(dy, dx);
    for (const f of this.wave) {
      if (this.gone.has(f.id) || f.t > ms || ms - f.t > 4000) continue;
      const p = fruitAt(f, ms);
      if (!p || p.y < 0.02 || p.x < -0.05 || p.x > 1.05) continue;
      const q = this.toPx(p);
      const t = Math.max(0, Math.min(1, ((q.x - x1) * dx + (q.y - y1) * dy) / len2));
      const ex = x1 + dx * t - q.x;
      const ey = y1 + dy * t - q.y;
      const r = this.radius(f.kind) * 1.1;
      if (ex * ex + ey * ey > r * r) continue;
      this.gone.add(f.id);
      this.burst(f, q, angle, ms);
      if (!this.batch) this.batch = { ids: [], kinds: [], at: ms, first: performance.now(), x: q.x, y: q.y };
      this.batch.ids.push(f.id);
      this.batch.kinds.push(f.kind);
      this.batch.at = ms;
      this.batch.x = q.x;
      this.batch.y = q.y;
      this.onHit(f.kind);
      if (f.kind === 'bomb') this.flush();
    }
  }

  private flush() {
    const b = this.batch;
    if (!b) return;
    this.batch = null;
    this.onCut({ ids: b.ids, kinds: b.kinds, at: Math.round(b.at), x: b.x, y: b.y });
  }

  /** the fruit splits along the blade, juice flies and stains the wood */
  private burst(f: FruitSpawn, q: { x: number; y: number }, angle: number, ms: number) {
    const now = performance.now();
    const r = this.radius(f.kind);
    const rot = this.rotOf(f, ms);
    const fl = FLESH[f.kind];
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const few = reducedMotion();
    if (f.kind === 'bomb') {
      this.flash = now;
      for (let i = 0; i < (few ? 8 : 26); i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 200 + Math.random() * 500;
        this.drops.push({ x: q.x, y: q.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 3 + Math.random() * 6, color: i % 3 ? '#ff9100' : '#37474f', born: now, life: 700 });
      }
      return;
    }
    for (const side of [1, -1] as const) {
      this.halves.push({ kind: f.kind, x: q.x, y: q.y, vx: nx * side * 120 + Math.cos(angle) * 60, vy: ny * side * 120 - 160, rot, spin: side * (2 + Math.random() * 2), cut: angle - rot, side, r, born: now });
    }
    const k = r / 40;
    for (let i = 0; i < (few ? 6 : 26); i++) {
      const a = angle + (Math.random() - 0.5) * 2.6 + (i % 2 ? Math.PI : 0);
      const v = 160 + Math.random() * 460;
      this.drops.push({ x: q.x, y: q.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, r: (2 + Math.random() * 4.5) * k, color: i % 4 ? fl.juice : fl.face, born: now, life: 550 + Math.random() * 450 });
    }
    const blobs: [number, number, number][] = Array.from({ length: 11 }, (_, i) => [i ? (Math.random() - 0.5) * 2.4 : 0, i ? (Math.random() - 0.5) * 2.4 : 0, i ? 0.1 + Math.random() * 0.32 : 0.8]);
    this.splats.push({ x: q.x, y: q.y, r, color: fl.juice, born: now, blobs });
    if (this.splats.length > 16) this.splats.shift();
  }

  /** a score pop, pulled in from the edges so it reads */
  popup(x: number, y: number, text: string, color: string, big = false) {
    const pad = big ? 120 : 60;
    const cx = Math.min(this.w - this.inset.r - pad, Math.max(this.inset.l + pad, x));
    const cy = Math.min(this.h - 50, Math.max(big ? 90 : 70, y));
    this.popups.push({ x: cx, y: cy, text, color, big, born: performance.now(), k: Math.max(1, Math.min(1.8, this.h / 480)) });
  }

  private frame = (t: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, this.lastFrame ? (t - this.lastFrame) / 1000 : 0);
    this.lastFrame = t;
    if (this.batch && t - this.batch.first > BATCH_MS) this.flush();
    const c = this.c;
    const now = performance.now();
    const ms = this.elapsed();
    c.clearRect(0, 0, this.w, this.h);
    this.splats = this.splats.filter((s) => now - s.born < STAIN_MS);
    for (const s of this.splats) drawSplat(c, s, now);
    if (this.seed >= 0 && ms > 0) {
      for (const f of this.wave) {
        if (this.gone.has(f.id) || f.t > ms || ms - f.t > 4000) continue;
        const p = fruitAt(f, ms);
        if (!p) continue;
        const q = this.toPx(p);
        drawFruit(c, f.kind, q.x, q.y, this.radius(f.kind), this.rotOf(f, ms), now);
      }
    }
    this.halves = this.halves.filter((h) => h.y < this.h + 80 && now - h.born < 3000);
    for (const h of this.halves) {
      h.vy += G * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.spin * dt;
      drawHalf(c, h);
    }
    this.drops = this.drops.filter((d) => now - d.born < d.life);
    for (const d of this.drops) {
      d.vy += G * 0.6 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      drawDrop(c, d, now);
    }
    this.slashes = this.slashes.filter((s) => now - s.born < 450);
    for (const s of this.slashes) drawSlash(c, s, now);
    this.trail = this.trail.filter((p) => now - p.t < TRAIL_MS);
    drawTrail(c, this.trail, now, this.color, TRAIL_MS);
    this.popups = this.popups.filter((p) => now - p.born < 1100);
    for (const p of this.popups) drawPopup(c, p, now);
    const fk = 1 - (now - this.flash) / 380;
    if (fk > 0) {
      c.fillStyle = `rgba(255,240,210,${0.85 * fk})`;
      c.fillRect(0, 0, this.w, this.h);
    }
  };
}
