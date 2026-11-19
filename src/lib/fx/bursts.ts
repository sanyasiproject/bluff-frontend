// full-screen shop effects: win bursts and entry flashes, simulated fresh every time (physics, random timing)
import { blob, clamp, drawBolt, easeOut, glow, makeBolt, noise1, pick, rand, strikeAlpha, strikePattern, type Bolt, type Pt } from './engine';

/** draws one frame; false once it's over */
export type Burst = (ctx: CanvasRenderingContext2D, dt: number, t: number) => boolean;

interface P {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  drag: number;
  grav: number;
  glitter: boolean;
  split: number;
}

/** fades what was drawn last frame instead of wiping it, so moving things leave real trails */
function fadeTrails(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 1;
  ctx.fillStyle = `rgba(0,0,0,${clamp(amount)})`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
}

const PALETTES = [
  ['#ff4d6d', '#ffd166'],
  ['#4cc9f0', '#ffffff'],
  ['#b388ff', '#ff8fd8'],
  ['#69f0ae', '#e6ff7a'],
  ['#ffab40', '#fff1c1'],
  ['#ff6b6b', '#4cc9f0'],
];

/** 🎆 rockets climb from the bottom and burst into peonies, rings, willows, crossettes and glitter */
export function fireworks(w: number, h: number, ms = 3800): Burst {
  const g = 1100;
  const parts: P[] = [];
  const rockets: { x: number; y: number; vx: number; vy: number; colors: string[] }[] = [];
  const flashes: { x: number; y: number; c: string; life: number }[] = [];
  const launches = Array.from({ length: Math.round(rand(7, 10) * Math.min(1.4, w / 400)) }, () => rand(0, (ms / 1000) * 0.5)).sort((a, b) => a - b);
  launches[0] = 0;
  let clock = 0;
  const add = (p: Partial<P> & { x: number; y: number; vx: number; vy: number; color: string }) =>
    parts.push({ px: p.x, py: p.y, life: 0, max: 1.2, size: 1.8, drag: 0.965, grav: 140, glitter: false, split: 0, ...p });

  const explode = (x: number, y: number, colors: string[]) => {
    const kind = pick(['peony', 'peony', 'ring', 'willow', 'crossette', 'glitter'] as const);
    const speed = rand(230, 340) * Math.min(1.3, Math.max(0.8, w / 420));
    flashes.push({ x, y, c: colors[0], life: 0 });
    if (kind === 'ring') {
      const n = 46;
      const tilt = rand(0.45, 1);
      const rot = rand(0, Math.PI);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const cx = Math.cos(a) * speed;
        const cy = Math.sin(a) * speed * tilt;
        add({ x, y, vx: cx * Math.cos(rot) - cy * Math.sin(rot), vy: cx * Math.sin(rot) + cy * Math.cos(rot), color: colors[i % 2], max: rand(1, 1.4) });
      }
      return;
    }
    const n = kind === 'crossette' ? 14 : kind === 'willow' ? 70 : Math.round(rand(80, 120));
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      // a sphere seen from the side: more speed at the rim than the middle
      const s = speed * Math.sqrt(Math.random()) * (kind === 'crossette' ? 0.8 : 1);
      add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color: kind === 'willow' ? '#ffcf6b' : colors[Math.random() < 0.7 ? 0 : 1],
        max: kind === 'willow' ? rand(1.8, 2.4) : rand(0.9, 1.5),
        drag: kind === 'willow' ? 0.94 : 0.965,
        grav: kind === 'willow' ? 90 : 140,
        size: kind === 'willow' ? 1.4 : 1.8,
        glitter: kind === 'glitter' || (kind === 'peony' && Math.random() < 0.25),
        split: kind === 'crossette' ? rand(0.35, 0.55) : 0,
      });
    }
  };

  return (ctx, dt) => {
    clock += dt;
    fadeTrails(ctx, w, h, 0.22 * dt * 60);
    while (launches.length && launches[0] <= clock) {
      launches.shift();
      const ty = rand(0.1, 0.42) * h;
      rockets.push({ x: rand(0.12, 0.88) * w, y: h + 8, vx: rand(-40, 40), vy: -Math.sqrt(2 * g * (h + 8 - ty)), colors: pick(PALETTES) });
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.vy += g * dt;
      add({ x: r.x + rand(-1, 1), y: r.y, vx: rand(-15, 15), vy: rand(10, 40), color: '#ffb35c', max: rand(0.12, 0.25), size: 1.2, grav: 60 });
      if (r.vy > -25) {
        rockets.splice(i, 1);
        explode(r.x, r.y, r.colors);
      }
    }
    const glowSprite = glow('rgba(255,255,255,1)', 32, 0.1);
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life += dt / 0.18;
      if (f.life >= 1) {
        flashes.splice(i, 1);
        continue;
      }
      blob(ctx, glow(f.c, 64, 0.05), f.x, f.y, 70, (1 - f.life) * 0.7);
    }
    ctx.lineCap = 'round';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        parts.splice(i, 1);
        continue;
      }
      if (p.split && p.life > p.split) {
        // crossette: each star splits into four
        p.split = 0;
        const base = Math.atan2(p.vy, p.vx);
        for (let q = 0; q < 4; q++) {
          const a = base + (q * Math.PI) / 2 + Math.PI / 4;
          add({ x: p.x, y: p.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, color: p.color, max: rand(0.5, 0.8) });
        }
        parts.splice(i, 1);
        continue;
      }
      p.px = p.x;
      p.py = p.y;
      const d = p.drag ** (dt * 60);
      p.vx *= d;
      p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      let a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      if (p.glitter && k > 0.45) a *= Math.random() < 0.5 ? 1 : 0.15;
      ctx.globalAlpha = a;
      ctx.strokeStyle = p.glitter && k > 0.45 ? '#ffffff' : p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      if (Math.random() < 0.15) blob(ctx, glowSprite, p.x, p.y, 4, a * 0.5);
    }
    ctx.globalAlpha = 1;
    return clock < ms / 1000 || parts.length > 0 || rockets.length > 0;
  };
}

/** 💰 gold coins tumble down in 3D, bounce on the floor, glint and settle */
export function goldRain(w: number, h: number, ms = 3800): Burst {
  const coins: { x: number; y: number; vx: number; vy: number; r: number; phi: number; spin: number; tilt: number; bounces: number; rest: number; glint: number }[] = [];
  const total = Math.round(55 * Math.min(1.6, Math.max(0.8, w / 400)));
  let made = 0;
  let clock = 0;
  const face = coinFace();
  const shine = glow('rgba(255,236,170,1)', 48, 0.06);
  const floor = h - 8;
  return (ctx, dt) => {
    clock += dt;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    // warm light pouring from above
    const fade = clamp(Math.min(clock / 0.4, (ms / 1000 + 0.8 - clock) / 0.8));
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    g.addColorStop(0, `rgba(255,200,80,${0.28 * fade})`);
    g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const spawnFor = (ms / 1000) * 0.7;
    while (made < total && made < (clock / spawnFor) * total) {
      made++;
      coins.push({ x: rand(0.04, 0.96) * w, y: rand(-60, -20), vx: rand(-30, 30), vy: rand(60, 220), r: rand(8, 15), phi: rand(0, 6.28), spin: rand(5, 12) * (Math.random() < 0.5 ? 1 : -1), tilt: rand(-0.5, 0.5), bounces: 0, rest: 0, glint: 0 });
    }
    for (const c of coins) {
      if (c.bounces < 3) {
        c.vy += 560 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.phi += c.spin * dt;
        c.tilt += c.vx * 0.002 * dt;
        if (c.y > floor - c.r) {
          c.y = floor - c.r;
          c.vy = -Math.abs(c.vy) * rand(0.22, 0.38);
          c.vx *= 0.6;
          c.spin *= 0.5;
          c.bounces++;
          if (Math.abs(c.vy) < 40) c.bounces = 3;
        }
      } else {
        c.rest += dt;
        // lie flat after landing
        c.phi += (Math.round(c.phi / Math.PI) * Math.PI + Math.PI / 2 - c.phi) * Math.min(1, dt * 8);
      }
      const sx = Math.cos(c.phi);
      const alpha = clamp(1 - c.rest / 0.9) * fade;
      if (alpha <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.tilt);
      // the coin's edge shows when it's side-on
      ctx.fillStyle = '#8a5a12';
      ctx.fillRect(-Math.max(1, c.r * 0.18 * (1 - Math.abs(sx))), -c.r, Math.max(2, c.r * 0.36 * (1 - Math.abs(sx))), c.r * 2);
      ctx.scale(Math.max(0.06, Math.abs(sx)), 1);
      ctx.drawImage(face, -c.r, -c.r, c.r * 2, c.r * 2);
      ctx.restore();
      // a glint when it faces you
      if (Math.abs(sx) > 0.97 && c.glint <= 0 && c.bounces < 3) c.glint = 0.25;
      if (c.glint > 0) {
        c.glint -= dt;
        ctx.globalCompositeOperation = 'lighter';
        blob(ctx, shine, c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 1.6, (c.glint / 0.25) * alpha);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
    return clock < ms / 1000 + 0.9;
  };
}

let face: HTMLCanvasElement | null = null;
/** a gold coin face drawn once: rim, bevel and a raised star */
function coinFace(): HTMLCanvasElement {
  if (face) return face;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const rg = g.createRadialGradient(24, 22, 4, 32, 32, 32);
  rg.addColorStop(0, '#fff3b0');
  rg.addColorStop(0.45, '#f7c445');
  rg.addColorStop(1, '#a8690f');
  g.fillStyle = rg;
  g.beginPath();
  g.arc(32, 32, 31, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(120,70,10,0.8)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(32, 32, 25, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#ffe58a';
  g.strokeStyle = 'rgba(130,80,10,0.7)';
  g.lineWidth = 1.5;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 7 : 16;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  g.stroke();
  face = c;
  return c;
}

/** ⚡ the sky darkens, rain falls, and forked bolts strike at random moments with a flash, sparks and a glow where they hit */
export function thunder(w: number, h: number, target: Pt, opts: { ms: number; strikes: number; dark: number }): Burst {
  const times = Array.from({ length: opts.strikes }, (_, i) => (i === 0 ? rand(0.05, 0.25) : rand(0.6, (opts.ms / 1000) * 0.72))).sort((a, b) => a - b);
  const strikes: { bolt: Bolt; from: Pt; to: Pt; life: number; dur: number; pattern: number[]; step: number }[] = [];
  const sparks: P[] = [];
  const drops = Array.from({ length: Math.round((w * h) / 4500) }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(700, 1100), l: rand(10, 22) }));
  const hit = glow('rgba(170,215,255,1)', 96, 0.05);
  let flash = 0;
  let clock = 0;
  const end = opts.ms / 1000;
  return (ctx, dt) => {
    clock += dt;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    const fade = clamp(Math.min(clock / 0.25, (end - clock) / 0.5));
    ctx.fillStyle = `rgba(4,8,24,${opts.dark * fade})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    // slanted rain
    ctx.strokeStyle = `rgba(170,200,255,${0.22 * fade})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of drops) {
      d.y += d.v * dt;
      d.x += d.v * 0.18 * dt;
      if (d.y > h) {
        d.y = -d.l;
        d.x = rand(-40, w);
      }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.l * 0.18, d.y - d.l);
    }
    ctx.stroke();
    while (times.length && times[0] <= clock) {
      times.shift();
      const to = { x: target.x + rand(-30, 30), y: target.y + rand(-10, 10) };
      const from = { x: clamp(to.x + rand(-0.35, 0.35) * w, 10, w - 10), y: -10 };
      strikes.push({ bolt: makeBolt(from, to, 0.3, Math.round(rand(4, 7)), 6), from, to, life: 0, dur: rand(0.45, 0.7), pattern: strikePattern(), step: -1 });
      flash = 1;
      for (let i = 0; i < 46; i++) {
        const a = rand(Math.PI, Math.PI * 2);
        const s = rand(80, 340);
        sparks.push({ x: to.x, y: to.y, px: to.x, py: to.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.3, 0.8), color: Math.random() < 0.5 ? '#ffffff' : '#9fd4ff', size: rand(1, 2.2), drag: 0.95, grav: 600, glitter: false, split: 0 });
      }
    }
    // the whole screen lights up for an instant, then flickers out
    if (flash > 0) {
      ctx.fillStyle = `rgba(210,230,255,${0.5 * flash * (Math.random() < 0.3 ? 0.4 : 1)})`;
      ctx.fillRect(0, 0, w, h);
      flash = Math.max(0, flash - dt * 5);
    }
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.life += dt / s.dur;
      if (s.life >= 1) {
        strikes.splice(i, 1);
        continue;
      }
      const step = Math.floor(s.life * s.pattern.length);
      if (step !== s.step) {
        s.step = step;
        if (step > 0 && Math.random() < 0.5) s.bolt = makeBolt(s.from, s.to, 0.3, s.bolt.branches.length, 6);
        if (step > 0 && s.pattern[step] > 0.7) flash = Math.max(flash, 0.5);
      }
      const al = strikeAlpha(s.life, s.pattern);
      drawBolt(ctx, s.bolt, al, 2.2, '150,200,255');
      blob(ctx, hit, s.to.x, s.to.y, 90, al * 0.8);
    }
    ctx.lineCap = 'round';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      if (p.life > p.max) {
        sparks.splice(i, 1);
        continue;
      }
      p.px = p.x;
      p.py = p.y;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return clock < end;
  };
}

/** 🔦 the room dims and a spotlight swings in from off-screen, dust drifting in its beam, and lands on the newcomer */
export function spotlight(w: number, h: number, target: Pt, ms = 2400): Burst {
  const wob = noise1();
  const wob2 = noise1();
  const src = { x: Math.random() < 0.5 ? rand(-0.1, 0.25) * w : rand(0.75, 1.1) * w, y: -40 };
  const start = { x: Math.random() < 0.5 ? -60 : w + 60, y: rand(0.2, 0.8) * h };
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: rand(-6, 6), s: rand(0.6, 1.6), ph: rand(0, 7) }));
  const mote = glow('rgba(255,250,225,1)', 16, 0.2);
  let clock = 0;
  const end = ms / 1000;
  return (ctx, dt, t) => {
    clock += dt;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    const k = easeOut(clock / (end * 0.5));
    const x = start.x + (target.x - start.x) * k + wob(t * 1.3) * 18 * (1 - k * 0.6);
    const y = start.y + (target.y - start.y) * k + wob2(t * 1.1) * 12 * (1 - k * 0.6);
    const fade = clamp(Math.min(clock / 0.3, (end - clock) / 0.45));
    const r = 70 + 14 * Math.sin(clock * 3) * k;
    ctx.fillStyle = `rgba(0,0,0,${0.62 * fade})`;
    ctx.fillRect(0, 0, w, h);
    // cut the light out of the dark
    ctx.globalCompositeOperation = 'destination-out';
    const hole = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
    hole.addColorStop(0, 'rgba(0,0,0,1)');
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // the beam from the lamp
    ctx.globalCompositeOperation = 'lighter';
    const ang = Math.atan2(y - src.y, x - src.x);
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const beam = ctx.createLinearGradient(src.x, src.y, x, y);
    beam.addColorStop(0, `rgba(255,248,220,${0.02 * fade})`);
    beam.addColorStop(1, `rgba(255,248,220,${0.16 * fade})`);
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(src.x + nx * 6, src.y + ny * 6);
    ctx.lineTo(x + nx * r * 0.8, y + ny * r * 0.8);
    ctx.lineTo(x - nx * r * 0.8, y - ny * r * 0.8);
    ctx.lineTo(src.x - nx * 6, src.y - ny * 6);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (const d of dust) {
      d.y = (d.y + (d.v * dt) / h + 1) % 1;
      blob(ctx, mote, d.x * w, d.y * h, d.s * 2.2, (0.35 + 0.35 * Math.sin(t * 2 + d.ph)) * fade);
    }
    ctx.restore();
    const pool = ctx.createRadialGradient(x, y, 0, x, y, r);
    pool.addColorStop(0, `rgba(255,245,210,${0.22 * fade})`);
    pool.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return clock < end;
  };
}

export const WIN_MS = 3800;
export const ENTRY_MS = 2400;

/** a fresh run of a win burst or entry flash; target is where it lands (the player's seat, or the middle) */
export function makeBurst(id: string, w: number, h: number, target: Pt): Burst | null {
  if (id === 'win-fireworks') return fireworks(w, h, WIN_MS);
  if (id === 'win-goldrain') return goldRain(w, h, WIN_MS);
  if (id === 'win-thunder') return thunder(w, h, target, { ms: WIN_MS, strikes: 3, dark: 0.5 });
  if (id === 'entry-thunder') return thunder(w, h, target, { ms: ENTRY_MS, strikes: 2, dark: 0.4 });
  if (id === 'entry-spotlight') return spotlight(w, h, target, ENTRY_MS);
  return null;
}
