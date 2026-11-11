export type Point = { x: number; y: number };

export const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
export const shift = (p: Point, dx: number, dy: number): Point => ({ x: p.x + dx, y: p.y + dy });
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

/** centre an element on a point; scale may be [x, y] for squash and stretch */
export const place = (p: Point, scale: number | [number, number] = 1, turn = 0) =>
  `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%) rotate(${turn.toFixed(1)}deg) scale(${
    typeof scale === 'number' ? scale.toFixed(3) : `${scale[0].toFixed(3)}, ${scale[1].toFixed(3)}`
  })`;

/** middle of whatever on screen stands for that person (seat, hand, lobby avatar) */
export function centerOf(el: Element | null): Point | null {
  const r = el?.getBoundingClientRect();
  return r && r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
}

export const memberEl = (id: string) => document.querySelector(`[data-member="${CSS.escape(id)}"]`);

/** everything one flight puts on screen, so it can all be stopped and removed */
export function stage(layer: HTMLElement) {
  const anims: Animation[] = [];
  const nodes: Element[] = [];
  const timers: number[] = [];
  const ends: (() => void)[] = [];
  let live = true;
  return {
    isLive: () => live,
    /** a new element on the layer; html is trusted markup from shapes.ts */
    add(className: string, html = '', css: Partial<CSSStyleDeclaration> = {}): HTMLElement {
      const el = document.createElement('div');
      el.className = `tf ${className}`;
      if (html) el.innerHTML = html;
      Object.assign(el.style, css);
      layer.appendChild(el);
      nodes.push(el);
      return el;
    },
    /** an emoji or word as text */
    text(className: string, text: string, css: Partial<CSSStyleDeclaration> = {}): HTMLElement {
      const el = this.add(className, '', css);
      el.textContent = text;
      return el;
    },
    // forwards only: while waiting on a delay the element keeps its hidden CSS state
    run(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation {
      const a = el.animate(frames, { fill: 'forwards', ...opts });
      anims.push(a);
      return a;
    },
    /** a one-off bit (particle) that removes itself when done */
    toss(el: HTMLElement, frames: Keyframe[], opts: KeyframeAnimationOptions): void {
      this.run(el, frames, opts).onfinish = () => el.remove();
    },
    later(fn: () => void, ms: number) {
      timers.push(window.setTimeout(() => live && fn(), ms));
    },
    onStop(fn: () => void) {
      ends.push(fn);
    },
    stop() {
      live = false;
      timers.forEach((t) => window.clearTimeout(t));
      anims.forEach((a) => a.cancel());
      ends.forEach((fn) => fn());
      nodes.forEach((n) => n.remove());
    },
  };
}
export type Stage = ReturnType<typeof stage>;

export interface BurstOptions {
  count: number;
  /** builds bit number i (a coloured blob, an emoji, an svg) */
  make: (i: number) => HTMLElement;
  /** direction range in degrees, 0 = right, -90 = up; full circle by default */
  angle?: [number, number];
  /** launch speed range, px per second */
  speed: [number, number];
  /** px per second squared; negative floats up */
  gravity?: number;
  /** air drag: how fast the launch speed fades */
  drag?: number;
  life: [number, number];
  delay?: number;
  /** degrees of spin over its life, either way */
  spin?: number;
  /** size at the start and the end */
  grow?: [number, number];
  /** start fading at this part of its life */
  fade?: number;
  /** flip over and over like paper (confetti, petals) */
  flutter?: boolean;
  /** start this far from the centre */
  from?: number;
}

/** bits thrown out from a point that fly in real arcs (drag + gravity), then fade: juice, debris, confetti */
export function burst(s: Stage, at: Point, o: BurstOptions): void {
  const [lo, hi] = o.angle ?? [0, 360];
  const g = o.gravity ?? 900;
  const k = o.drag ?? 2.2;
  const [g0, g1] = o.grow ?? [0.6, 1];
  const fade = o.fade ?? 0.6;
  const steps = 9;
  for (let i = 0; i < o.count; i++) {
    const el = o.make(i);
    const deg = o.angle ? between(lo, hi) : (i / o.count) * 360 + between(-12, 12);
    const rad = (deg * Math.PI) / 180;
    const v = between(...o.speed);
    const vx = Math.cos(rad) * v;
    const vy = Math.sin(rad) * v;
    const life = between(...o.life);
    const turn = between(-1, 1) * (o.spin ?? 0);
    const start = o.from ? shift(at, Math.cos(rad) * o.from, Math.sin(rad) * o.from) : at;
    const wobble = between(0, Math.PI * 2);
    const frames: Keyframe[] = [];
    for (let j = 0; j <= steps; j++) {
      const f = j / steps;
      const t = (life / 1000) * f;
      const e = (1 - Math.exp(-k * t)) / k;
      const p = shift(start, vx * e, vy * e + (g / k) * (t - e));
      const size = g0 + (g1 - g0) * Math.min(1, f * 3);
      // flips over without ever going paper-thin, so petals and confetti keep their shape
      const turnOver = Math.cos(wobble + f * 14);
      const flat = Math.sign(turnOver) * Math.max(0.3, Math.abs(turnOver));
      const scale: [number, number] = o.flutter ? [size, size * flat] : [size, size];
      frames.push({
        transform: place(p, scale, turn * f),
        opacity: f <= fade ? 1 : 1 - (f - fade) / (1 - fade),
        offset: f,
      });
    }
    s.toss(el, frames, { duration: life, delay: o.delay ?? 0, easing: 'linear' });
  }
}

/** a coloured blob for burst() */
export function blob(s: Stage, color: string, w: number, h = w, round = true): HTMLElement {
  return s.add('tf-bit', '', {
    width: `${w}px`,
    height: `${h}px`,
    background: color,
    borderRadius: round ? '50%' : '2px',
  });
}

/** the seat or avatar is knocked back the way the throw was going, then springs back */
export function knock(s: Stage, el: Element | null, dir: Point, px: number, ms = 460, delay = 0): void {
  if (!el) return;
  // the individual translate/scale properties, so the seat's own transform (turn lift) is left alone
  const f = [0, 1, -0.45, 0.22, -0.08, 0];
  s.run(el, f.map((m) => ({ translate: `${(dir.x * px * m).toFixed(1)}px ${(dir.y * px * m).toFixed(1)}px` })), {
    duration: ms,
    delay,
    easing: 'ease-out',
    fill: 'none',
  });
  s.run(el, [{ scale: '1' }, { scale: '0.93 1.05', offset: 0.18 }, { scale: '1.03 0.98', offset: 0.45 }, { scale: '1' }], {
    duration: ms,
    delay,
    fill: 'none',
  });
}

/** a hard shake that settles: strong at first, fading fast */
export function quake(s: Stage, el: Element | null, px: number, ms: number, delay = 0): void {
  if (!el) return;
  const frames: Keyframe[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const left = (1 - i / n) ** 2;
    const m = i === n ? 0 : px * left;
    frames.push({ translate: `${between(-m, m).toFixed(1)}px ${between(-m, m).toFixed(1)}px`, rotate: `${between(-m, m) * 0.3}deg` });
  }
  s.run(el, frames, { duration: ms, delay, fill: 'none' });
}
