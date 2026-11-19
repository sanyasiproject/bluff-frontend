// live aura painters: each one keeps its own random state, so two seats never move alike and nothing loops
import {
  blob,
  chance,
  clamp,
  drawBolt,
  glow,
  makeBolt,
  noise1,
  noise2,
  onEdge,
  rand,
  roundRect,
  strikeAlpha,
  strikePattern,
  type Bolt,
  type Pt,
} from './engine';

/** the element's box inside the canvas (the canvas is bigger by a margin so light can spill out) */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export type AuraPainter = (ctx: CanvasRenderingContext2D, box: Box, dt: number, t: number) => void;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: number;
  seed: number;
}

const rim = (ctx: CanvasRenderingContext2D, b: Box, color: string | CanvasGradient, width: number) => {
  roundRect(ctx, b.x, b.y, b.w, b.h, b.r);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
};

const clipBox = (ctx: CanvasRenderingContext2D, b: Box) => {
  roundRect(ctx, b.x, b.y, b.w, b.h, b.r);
  ctx.clip();
};

/** ⚡ electric bolts crawl and leap off the edge at random, with re-strikes, sparks and the box lighting up */
function lightning(): AuraPainter {
  const buzz = noise2();
  let wait = rand(0.1, 0.5);
  const strikes: { bolt: Bolt; ends: [Pt, Pt]; life: number; dur: number; pattern: number[]; step: number }[] = [];
  const sparks: Spark[] = [];
  const blue = glow('rgba(140,200,255,1)', 64, 0.05);
  return (ctx, b, dt, t) => {
    ctx.globalCompositeOperation = 'lighter';
    // a faint charge always hums on the rim
    const hum = 0.35 + 0.25 * (buzz(t * 4) + 1) / 2;
    rim(ctx, b, `rgba(90,160,255,${hum * 0.35})`, 10);
    rim(ctx, b, `rgba(110,180,255,${hum * 0.6})`, 5);
    rim(ctx, b, `rgba(210,235,255,${hum})`, 1.6);

    wait -= dt;
    if (wait <= 0) {
      // strikes come in clusters, then go quiet for a while
      wait = Math.random() < 0.35 ? rand(0.05, 0.12) : rand(0.2, 0.9);
      const per = 2 * (b.w + b.h);
      const u = Math.random();
      const a = onEdge(b.x, b.y, b.w, b.h, u);
      let z: Pt;
      if (Math.random() < 0.65) {
        // crawls along the edge
        z = onEdge(b.x, b.y, b.w, b.h, u + rand(0.1, 0.32) * (Math.random() < 0.5 ? 1 : -1));
      } else {
        // leaps off the box into the air
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const ang = Math.atan2(a.y - cy, a.x - cx) + rand(-0.7, 0.7);
        const reach = rand(9, 14);
        z = { x: a.x + Math.cos(ang) * reach, y: a.y + Math.sin(ang) * reach };
      }
      const forks = Math.random() < 0.6 ? 1 : 2;
      strikes.push({ bolt: makeBolt(a, z, 0.4, forks, Math.max(3, per / 90)), ends: [a, z], life: 0, dur: rand(0.22, 0.5), pattern: strikePattern(), step: -1 });
      for (let i = 0; i < 6; i++) {
        const p = Math.random() < 0.5 ? a : z;
        const ang = rand(0, Math.PI * 2);
        const sp = rand(20, 90);
        sparks.push({ x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: rand(0.15, 0.4), size: rand(0.6, 1.4), kind: 0, seed: 0 });
      }
    }

    let light = 0;
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.life += dt / s.dur;
      if (s.life >= 1) {
        strikes.splice(i, 1);
        continue;
      }
      // each flicker re-draws the bolt a little differently, like a real re-strike
      const step = Math.floor(s.life * s.pattern.length);
      if (step !== s.step) {
        s.step = step;
        if (step > 0 && Math.random() < 0.6) s.bolt = makeBolt(s.ends[0], s.ends[1], 0.4, s.bolt.branches.length, 3);
      }
      const al = strikeAlpha(s.life, s.pattern);
      light = Math.max(light, al);
      drawBolt(ctx, s.bolt, al, 1.25);
      blob(ctx, blue, s.ends[0].x, s.ends[0].y, 10, al * 0.6);
    }
    // the box lights up with each strike
    if (light > 0.05) {
      ctx.save();
      clipBox(ctx, b);
      ctx.fillStyle = `rgba(120,180,255,${0.22 * light})`;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
      rim(ctx, b, `rgba(200,230,255,${0.6 * light})`, 2);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      if (p.life > p.max) {
        sparks.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      ctx.globalAlpha = 1 - p.life / p.max;
      ctx.fillStyle = '#e6f4ff';
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  };
}

/** 🔥 particle flames rise off every edge, swaying in a turbulent draft, with embers drifting high */
function inferno(): AuraPainter {
  const parts: Spark[] = [];
  const sway = noise2();
  const flick = noise2();
  const hot = glow('rgba(255,240,170,1)', 48, 0.1);
  const mid = glow('rgba(255,140,40,1)', 48, 0.05);
  const red = glow('rgba(220,50,20,1)', 48, 0.05);
  return (ctx, b, dt, t) => {
    ctx.globalCompositeOperation = 'lighter';
    // warm light from below, flickering
    const f = 0.55 + 0.45 * (flick(t * 6) + 1) / 2;
    ctx.save();
    clipBox(ctx, b);
    const g = ctx.createLinearGradient(0, b.y + b.h, 0, b.y + b.h * 0.3);
    g.addColorStop(0, `rgba(255,110,30,${0.32 * f})`);
    g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.restore();
    rim(ctx, b, `rgba(255,120,40,${0.3 * f})`, 7);
    rim(ctx, b, `rgba(255,170,70,${0.7 * f})`, 1.8);

    // flames lick up from the top and sides; the bottom edge only smoulders
    const scale = Math.min(1.4, Math.max(0.75, b.w / 80));
    let n = (b.w * 2 + b.h * 2) * 2.2 * dt;
    while (n > 0 && parts.length < 360) {
      if (n < 1 && Math.random() > n) break;
      n -= 1;
      const ember = Math.random() < 0.07;
      const side = Math.random();
      let x: number;
      let y: number;
      if (side < 0.5) {
        x = b.x + rand(0, b.w);
        y = b.y + rand(-1, 3);
      } else if (side < 0.9) {
        x = Math.random() < 0.5 ? b.x + rand(-2, 2) : b.x + b.w + rand(-2, 2);
        y = b.y + rand(0, b.h);
      } else {
        x = b.x + rand(0, b.w);
        y = b.y + b.h + rand(-2, 1);
      }
      const low = side >= 0.9;
      parts.push({
        x,
        y,
        vx: rand(-6, 6),
        vy: ember ? rand(-80, -45) : low ? rand(-14, -6) : rand(-62, -30),
        life: 0,
        max: ember ? rand(1, 1.8) : low ? rand(0.3, 0.5) : rand(0.45, 0.85),
        size: ember ? rand(0.8, 1.6) : (low ? rand(2.5, 4) : rand(5, 9.5)) * scale,
        kind: ember ? 1 : 0,
        seed: Math.random() * 100,
      });
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        parts.splice(i, 1);
        continue;
      }
      p.x += (p.vx + sway(p.seed + t * 2.4) * 30 * k) * dt;
      p.y += p.vy * dt;
      p.vy -= 30 * dt;
      if (p.kind === 1) {
        ctx.globalAlpha = (1 - k) * (0.55 + 0.45 * Math.sin(p.seed + t * 28));
        ctx.fillStyle = '#ffd27a';
        ctx.fillRect(p.x, p.y, p.size, p.size);
        continue;
      }
      // a tongue: wide and white-hot at the base, thinning into orange then smoky red
      const r = p.size * (1 - k * 0.65);
      if (k < 0.3) blob(ctx, hot, p.x, p.y, r * 1.2, 0.35 * (1 - k / 0.3));
      blob(ctx, k < 0.5 ? mid : red, p.x, p.y, r * (2.1 - k * 0.6), (1 - k) * 0.42);
    }
    ctx.globalAlpha = 1;
  };
}

/** ✨ a nebula breathes inside while stars drift on a wandering current; shooting stars at random */
function galaxy(): AuraPainter {
  const drift = noise1();
  const neb = [noise2(), noise2(), noise2(), noise2(), noise2(), noise2()];
  const tones = [glow('rgba(123,77,255,1)', 96, 0.02), glow('rgba(47,123,255,1)', 96, 0.02), glow('rgba(255,79,216,1)', 96, 0.02)];
  const star = glow('rgba(255,255,255,1)', 16, 0.2);
  let stars: { x: number; y: number; z: number; f: number; ph: number }[] = [];
  let shoot: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
  let wait = rand(1, 4);
  let size = '';
  return (ctx, b, dt, t) => {
    const key = `${Math.round(b.w)}x${Math.round(b.h)}`;
    if (key !== size) {
      size = key;
      stars = Array.from({ length: Math.round((b.w * b.h) / 120) }, () => ({ x: rand(0, b.w), y: rand(0, b.h), z: rand(0.25, 1), f: rand(1, 4), ph: rand(0, 7) }));
    }
    ctx.save();
    clipBox(ctx, b);
    ctx.globalCompositeOperation = 'lighter';
    const big = Math.max(b.w, b.h);
    tones.forEach((tone, i) => {
      const x = b.x + b.w * (0.5 + 0.45 * neb[i * 2](t * 0.12 + i * 9));
      const y = b.y + b.h * (0.5 + 0.45 * neb[i * 2 + 1](t * 0.1 + i * 5));
      blob(ctx, tone, x, y, big * 0.7, 0.17);
    });
    // the current turns slowly, so stars never loop the same way
    const ang = drift(t * 0.07) * Math.PI * 1.5;
    const vx = Math.cos(ang);
    const vy = Math.sin(ang);
    for (const s of stars) {
      s.x = (s.x + vx * 7 * s.z * dt + b.w) % b.w;
      s.y = (s.y + vy * 7 * s.z * dt + b.h) % b.h;
      const tw = 0.35 + 0.65 * Math.max(0, Math.sin(t * s.f + s.ph)) ** 3;
      const r = 0.6 + s.z * 1.1;
      blob(ctx, star, b.x + s.x, b.y + s.y, r * 2.4, tw * s.z);
      if (s.z > 0.9 && tw > 0.85) {
        ctx.globalAlpha = (tw - 0.85) * 4;
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x + s.x - 3.5, b.y + s.y - 0.3, 7, 0.6);
        ctx.fillRect(b.x + s.x - 0.3, b.y + s.y - 3.5, 0.6, 7);
      }
    }
    wait -= dt;
    if (!shoot && wait <= 0) {
      const a = rand(0.3, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI / 2);
      shoot = { x: rand(0, b.w * 0.6), y: rand(0, b.h * 0.4), vx: Math.cos(a) * rand(90, 150), vy: Math.sin(a) * rand(60, 120), life: 0 };
      wait = rand(1.5, 5.5);
    }
    if (shoot) {
      shoot.life += dt / 0.55;
      shoot.x += shoot.vx * dt;
      shoot.y += shoot.vy * dt;
      const al = Math.sin(Math.PI * Math.min(1, shoot.life));
      const g = ctx.createLinearGradient(b.x + shoot.x, b.y + shoot.y, b.x + shoot.x - shoot.vx * 0.18, b.y + shoot.y - shoot.vy * 0.18);
      g.addColorStop(0, `rgba(255,255,255,${al})`);
      g.addColorStop(1, 'rgba(160,140,255,0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(b.x + shoot.x, b.y + shoot.y);
      ctx.lineTo(b.x + shoot.x - shoot.vx * 0.18, b.y + shoot.y - shoot.vy * 0.18);
      ctx.stroke();
      if (shoot.life >= 1) shoot = null;
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    rim(ctx, b, `rgba(150,110,255,${0.25 + 0.1 * drift(t * 0.9 + 40)})`, 7);
    rim(ctx, b, `rgba(190,160,255,${0.6 + 0.25 * drift(t * 0.9 + 40)})`, 1.6);
    ctx.globalAlpha = 1;
  };
}

const AURORA = [
  [61, 255, 176],
  [40, 220, 255],
  [170, 110, 255],
] as const;

/** 🌌 curtains of light ripple across the box, shaped by noise, shifting from green to teal to violet */
function aurora(): AuraPainter {
  const base = noise2();
  const tall = noise2();
  const bright = noise2();
  const hue = noise1();
  const star = glow('rgba(220,255,240,1)', 16, 0.2);
  const dots = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.6, ph: rand(0, 7) }));
  return (ctx, b, _dt, t) => {
    ctx.save();
    clipBox(ctx, b);
    ctx.globalCompositeOperation = 'lighter';
    for (const d of dots) blob(ctx, star, b.x + d.x * b.w, b.y + d.y * b.h, 1.6, 0.25 + 0.25 * Math.sin(t * 2 + d.ph));
    const step = 2.5;
    for (let x = 0; x < b.w; x += step) {
      const yb = b.y + b.h * (0.42 + 0.2 * base(x * 0.022 + t * 0.32));
      const ht = b.h * (0.3 + 0.28 * (tall(x * 0.05 - t * 0.27) + 1) / 2);
      const k = ((bright(x * 0.035 + t * 0.55) + 1) / 2) ** 2;
      const m = clamp((hue(x * 0.012 + t * 0.09) + 1) / 2);
      const [c1, c2] = m < 0.5 ? [AURORA[0], AURORA[1]] : [AURORA[1], AURORA[2]];
      const q = m < 0.5 ? m * 2 : (m - 0.5) * 2;
      const c = c1.map((v, i) => Math.round(v + (c2[i] - v) * q)).join(',');
      const g = ctx.createLinearGradient(0, yb - ht, 0, yb + 5);
      g.addColorStop(0, `rgba(${c},0)`);
      g.addColorStop(0.75, `rgba(${c},${0.45 * k + 0.08})`);
      g.addColorStop(0.95, `rgba(${c},${0.85 * k + 0.12})`);
      g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(b.x + x, yb - ht, step + 0.6, ht + 5);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    rim(ctx, b, `rgba(60,255,190,${0.22 + 0.1 * base(t * 0.8 + 30)})`, 7);
    rim(ctx, b, `rgba(120,255,215,${0.55 + 0.2 * base(t * 0.8 + 30)})`, 1.6);
    ctx.globalAlpha = 1;
  };
}

/** 👑 a gold rim that turns at an uneven pace, glints popping up anywhere and a shine sweeping across now and then */
function royalGold(): AuraPainter {
  const pace = noise2();
  let angle = rand(0, 6.28);
  const glints: { x: number; y: number; life: number; size: number; rot: number }[] = [];
  const dust: Spark[] = [];
  let sweep = -1;
  let wait = rand(0.8, 3);
  const gold = glow('rgba(255,210,90,1)', 48, 0.08);
  return (ctx, b, dt, t) => {
    ctx.globalCompositeOperation = 'lighter';
    angle += dt * (0.5 + 0.9 * (pace(t * 0.4) + 1) / 2);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    let stroke: CanvasGradient;
    const c2 = ctx as CanvasRenderingContext2D & { createConicGradient?: (a: number, x: number, y: number) => CanvasGradient };
    if (typeof c2.createConicGradient === 'function') {
      stroke = c2.createConicGradient(angle, cx, cy);
      stroke.addColorStop(0, 'rgba(255,248,210,1)');
      stroke.addColorStop(0.12, 'rgba(255,200,70,0.9)');
      stroke.addColorStop(0.35, 'rgba(150,95,20,0.35)');
      stroke.addColorStop(0.55, 'rgba(255,214,90,0.85)');
      stroke.addColorStop(0.62, 'rgba(255,255,235,1)');
      stroke.addColorStop(0.8, 'rgba(160,100,20,0.35)');
      stroke.addColorStop(1, 'rgba(255,248,210,1)');
    } else {
      stroke = ctx.createLinearGradient(cx + Math.cos(angle) * b.w, cy + Math.sin(angle) * b.h, cx - Math.cos(angle) * b.w, cy - Math.sin(angle) * b.h);
      stroke.addColorStop(0, 'rgba(255,240,190,1)');
      stroke.addColorStop(0.5, 'rgba(170,110,20,0.4)');
      stroke.addColorStop(1, 'rgba(255,220,100,1)');
    }
    rim(ctx, b, 'rgba(255,190,60,0.28)', 9);
    rim(ctx, b, stroke, 2.6);

    if (chance(6, dt)) {
      const p = Math.random() < 0.7 ? onEdge(b.x, b.y, b.w, b.h, Math.random()) : { x: b.x + rand(4, b.w - 4), y: b.y + rand(4, b.h - 4) };
      glints.push({ ...p, life: 0, size: rand(5, 10), rot: rand(0, 1) });
    }
    for (let i = glints.length - 1; i >= 0; i--) {
      const g = glints[i];
      g.life += dt / 0.7;
      if (g.life >= 1) {
        glints.splice(i, 1);
        continue;
      }
      const s = Math.sin(Math.PI * g.life) * g.size;
      blob(ctx, gold, g.x, g.y, s * 1.4, 0.7);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot + g.life * 0.8);
      ctx.globalAlpha = Math.sin(Math.PI * g.life);
      ctx.fillStyle = '#fffbe8';
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.lineTo(0, -s * 0.12);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
    if (chance(2, dt)) dust.push({ x: b.x + rand(0, b.w), y: b.y + b.h, vx: rand(-4, 4), vy: rand(-22, -10), life: 0, max: rand(1.2, 2.4), size: rand(0.6, 1.3), kind: 0, seed: 0 });
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      d.life += dt;
      if (d.life > d.max) {
        dust.splice(i, 1);
        continue;
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      ctx.globalAlpha = Math.sin((Math.PI * d.life) / d.max) * 0.8;
      ctx.fillStyle = '#ffd86b';
      ctx.fillRect(d.x, d.y, d.size, d.size);
    }
    // now and then a shine sweeps over the box
    wait -= dt;
    if (sweep < 0 && wait <= 0) sweep = 0;
    if (sweep >= 0) {
      sweep += dt / 0.85;
      const x = b.x - b.w * 0.6 + sweep * b.w * 2.2;
      ctx.save();
      clipBox(ctx, b);
      const g = ctx.createLinearGradient(x - 22, b.y, x + 22, b.y + b.h * 0.4);
      g.addColorStop(0, 'rgba(255,230,150,0)');
      g.addColorStop(0.5, 'rgba(255,245,210,0.5)');
      g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
      if (sweep >= 1) {
        sweep = -1;
        wait = rand(1.4, 4);
      }
    }
    ctx.globalAlpha = 1;
  };
}

const MAKERS: Record<string, () => AuraPainter> = {
  'aura-lightning': lightning,
  'aura-fire': inferno,
  'aura-galaxy': galaxy,
  'aura-aurora': aurora,
  'aura-gold': royalGold,
};

/** extra room round the box some auras need, so flames aren't cut off (px) */
export const AURA_PAD: Record<string, number> = { 'aura-fire': 30 };

/** a fresh painter for a shop aura id; null for an unknown one */
export const makeAura = (id: string | null | undefined): AuraPainter | null => (id && MAKERS[id] ? MAKERS[id]() : null);
