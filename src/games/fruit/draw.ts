// Fruit Slice Duel canvas drawing: whole fruit, cut halves, juice, splats, the blade trail and text popups
import type { FruitKind } from '../../types';
import { FLESH, fruitImage } from './art';

export interface Half {
  kind: FruitKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  /** the cut line's angle */
  cut: number;
  side: 1 | -1;
  r: number;
  born: number;
}
export interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  born: number;
  life: number;
}
export interface Splat {
  x: number;
  y: number;
  r: number;
  color: string;
  born: number;
  blobs: [number, number, number][];
}
export interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  big: boolean;
  born: number;
  /** bigger on big screens */
  k: number;
}
export interface TrailPt {
  x: number;
  y: number;
  t: number;
}
export interface Slash {
  x: number;
  y: number;
  angle: number;
  color: string;
  born: number;
}

/** a whole fruit; bombs glow red and their fuse sparks */
export function drawFruit(c: CanvasRenderingContext2D, kind: FruitKind, x: number, y: number, r: number, rot: number, now: number) {
  const img = fruitImage(kind);
  if (kind === 'bomb') {
    const f = 0.5 + 0.5 * Math.sin(now / 90);
    const g = c.createRadialGradient(x, y, r * 0.4, x, y, r * 1.9);
    g.addColorStop(0, `rgba(255,40,40,${0.35 + f * 0.3})`);
    g.addColorStop(1, 'rgba(255,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 1.9, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  if (img.complete) c.drawImage(img, -r * 1.06, -r * 1.06, r * 2.12, r * 2.12);
  if (kind === 'bomb') {
    const f = 0.5 + 0.5 * Math.sin(now / 40);
    const fx = r * 0.8;
    const fy = -r * 0.86;
    c.fillStyle = `rgba(255,${170 + f * 70},60,.95)`;
    c.beginPath();
    c.arc(fx, fy, r * (0.12 + f * 0.1), 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,210,.95)';
    for (let i = 0; i < 5; i++) {
      const a = now / 70 + i * 1.3;
      const d = r * (0.16 + ((now / 9 + i * 37) % 30) / 100);
      c.beginPath();
      c.arc(fx + Math.cos(a) * d, fy + Math.sin(a) * d, r * 0.035, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

/** one half of a cut fruit, with its juicy face along the cut */
export function drawHalf(c: CanvasRenderingContext2D, h: Half) {
  const img = fruitImage(h.kind);
  const fl = FLESH[h.kind];
  const r = h.r;
  c.save();
  c.translate(h.x, h.y);
  c.rotate(h.cut + h.rot);
  c.beginPath();
  c.rect(-r * 1.2, h.side > 0 ? 0 : -r * 1.2, r * 2.4, r * 1.2);
  c.clip();
  c.rotate(-h.cut);
  if (img.complete) c.drawImage(img, -r, -r, r * 2, r * 2);
  c.rotate(h.cut);
  c.fillStyle = fl.rim;
  c.beginPath();
  c.ellipse(0, 0, r * 0.92, r * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = fl.face;
  c.beginPath();
  c.ellipse(0, 0, r * 0.8, r * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  if (h.kind === 'melon') {
    c.fillStyle = '#1b1b1b';
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.ellipse(i * r * 0.26, h.side * r * 0.06, r * 0.04, r * 0.07, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

export function drawDrop(c: CanvasRenderingContext2D, d: Drop, now: number) {
  const k = 1 - (now - d.born) / d.life;
  if (k <= 0) return;
  c.globalAlpha = Math.min(1, k * 1.4);
  c.fillStyle = d.color;
  c.beginPath();
  c.arc(d.x, d.y, d.r * (0.5 + k * 0.5), 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;
}

/** how long a juice stain stays on the wall */
export const STAIN_MS = 3200;

export function drawSplat(c: CanvasRenderingContext2D, s: Splat, now: number) {
  const k = 1 - (now - s.born) / STAIN_MS;
  if (k <= 0) return;
  c.globalAlpha = 0.5 * Math.min(1, k * 2);
  c.fillStyle = s.color;
  for (const [dx, dy, rr] of s.blobs) {
    c.beginPath();
    c.arc(s.x + dx * s.r, s.y + dy * s.r, rr * s.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

/** the blade: a bright, thick glowing streak that thins out behind the finger */
export function drawTrail(c: CanvasRenderingContext2D, pts: TrailPt[], now: number, color: string, life: number) {
  if (pts.length < 2) return;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.globalCompositeOperation = 'lighter';
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < pts.length; i++) {
      const k = 1 - (now - pts[i].t) / life;
      if (k <= 0) continue;
      c.strokeStyle = pass === 2 ? '#fff' : color;
      c.globalAlpha = [0.28, 0.7, 1][pass] * k;
      c.lineWidth = [30, 14, 6][pass] * k + 1;
      c.beginPath();
      c.moveTo(pts[i - 1].x, pts[i - 1].y);
      c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
    }
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

/** someone else's cut on the same fruit: a thin slash in their colour */
export function drawSlash(c: CanvasRenderingContext2D, s: Slash, now: number) {
  const k = 1 - (now - s.born) / 450;
  if (k <= 0) return;
  const len = 64 * (1.2 - k * 0.4);
  c.save();
  c.translate(s.x, s.y);
  c.rotate(s.angle);
  c.globalAlpha = k;
  c.strokeStyle = s.color;
  c.lineWidth = 7 * k + 2;
  c.lineCap = 'round';
  c.shadowColor = s.color;
  c.shadowBlur = 12;
  c.beginPath();
  c.moveTo(-len, 0);
  c.lineTo(len, 0);
  c.stroke();
  c.restore();
  c.globalAlpha = 1;
}

export function drawPopup(c: CanvasRenderingContext2D, p: Popup, now: number) {
  const age = (now - p.born) / (p.big ? 1100 : 750);
  if (age >= 1) return;
  const size = (p.big ? 46 : 32) * p.k;
  const pop = age < 0.15 ? 0.6 + (age / 0.15) * 0.5 : 1.1 - Math.min(0.1, (age - 0.15) * 0.4);
  c.save();
  c.translate(p.x, p.y - age * 40);
  c.scale(pop, pop);
  c.globalAlpha = age > 0.7 ? (1 - age) / 0.3 : 1;
  c.font = `900 ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = p.big ? 9 : 7;
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(40,10,60,.9)';
  c.strokeText(p.text, 0, 0);
  c.fillStyle = p.color;
  c.fillText(p.text, 0, 0);
  c.restore();
  c.globalAlpha = 1;
}
