import { buzz } from '../../lib/throwSounds';
import type { Clip } from './lottie';
import { between, burst, centerOf, knock, place, shift, type Point, type Stage } from './stage';

/** everything an impact needs to know about the throw that just landed */
export interface Hit {
  s: Stage;
  /** where it landed */
  at: Point;
  /** which way it was flying (unit length) */
  dir: Point;
  /** the thing that flew: an emoji or the drawn egg */
  thrown: HTMLElement;
  /** the seat, hand or avatar that was hit */
  target: Element | null;
  /** the animated emoji, if it has one (anim is null until loaded) */
  clip: Clip | null;
  /** the hit is on this player's own hand */
  me: boolean;
}

/** what happens when one emoji lands; returns how long it all takes (ms) */
export type Impact = (h: Hit) => number;

export const HERO = 92;

interface ContactOptions {
  /** hit stop: how long it freezes squashed on contact */
  stop: number;
  /** glow colour of the impact flash */
  glow: string;
  /** how far the seat is knocked back */
  push: number;
  squash?: [number, number];
  /** leave the thrown thing alone (it stays, like the stuck axe) */
  keep?: boolean;
}

/** the moment of contact: freeze squashed, flash, ring, knock the seat; returns when to show what comes next */
export function contact(h: Hit, o: ContactOptions): number {
  const { s, at } = h;
  const [sx, sy] = o.squash ?? [1.45, 0.8];
  if (!o.keep) {
    s.run(
      h.thrown,
      [
        { transform: place(at, [sx, sy]), opacity: 1 },
        { transform: place(at, [sx * 1.04, sy * 0.97]), opacity: 1, offset: 0.85 },
        { transform: place(at, [sx * 1.1, sy * 0.9]), opacity: 0 },
      ],
      { duration: o.stop + 60 },
    );
  }
  flash(s, at, o.glow, 120, o.stop * 0.4);
  ring(s, at, o.glow, 2.6, o.stop * 0.4);
  knock(s, h.target, h.dir, o.push, 480, o.stop * 0.3);
  return o.stop;
}

/** a soft round glow that blooms and fades */
export function flash(s: Stage, at: Point, color: string, size: number, delay = 0, ms = 300): void {
  const el = s.add('tf-flash', '', { width: `${size}px`, height: `${size}px`, background: `radial-gradient(circle, #fff 0 16%, ${color} 42%, transparent 70%)` });
  s.toss(
    el,
    [
      { transform: place(at, 0.3), opacity: 0.95 },
      { transform: place(at, 1.25), opacity: 0.8, offset: 0.35 },
      { transform: place(at, 1.6), opacity: 0 },
    ],
    { duration: ms, delay, easing: 'ease-out' },
  );
}

/** a thin ring racing outwards */
export function ring(s: Stage, at: Point, color: string, to: number, delay = 0, ms = 420): void {
  const el = s.add('tf-ring', '', { borderColor: color });
  s.toss(el, [{ transform: place(at, 0.3), opacity: 0.9 }, { transform: place(at, to), opacity: 0 }], { duration: ms, delay, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
}

/** the animated emoji if it arrived in time, else a big plain emoji in the same spot */
export function hero(h: Hit, emoji: string): { el: HTMLElement; anim: Clip['anim'] } {
  if (h.clip?.anim) return { el: h.clip.box, anim: h.clip.anim };
  return { el: h.s.text('tf-hero', emoji), anim: null };
}

/** one animation from [ms, position, scale, turn, opacity] steps, eased between each pair */
export type Step = [number, Point, number | [number, number], number, number];

export function steps(s: Stage, el: Element, delay: number, list: Step[], easing = 'ease-in-out'): Animation {
  const end = list[list.length - 1][0];
  return s.run(
    el,
    list.map(([ms, p, scale, turn, opacity]) => ({ transform: place(p, scale, turn), opacity, offset: ms / end, easing })),
    { duration: end, delay },
  );
}

/** twinkling stars around a point */
export function twinkle(s: Stage, at: Point, make: () => HTMLElement, count: number, radius: number, delay: number, spread = 900): void {
  for (let i = 0; i < count; i++) {
    const a = between(0, Math.PI * 2);
    const p = shift(at, Math.cos(a) * radius * between(0.6, 1.1), Math.sin(a) * radius * between(0.5, 1));
    const turn = between(-90, 90);
    s.toss(
      make(),
      [
        { transform: place(p, 0, 0), opacity: 0 },
        { transform: place(p, 1, turn / 2), opacity: 1, offset: 0.4 },
        { transform: place(p, 0, turn), opacity: 0 },
      ],
      { duration: between(380, 560), delay: delay + between(0, spread), easing: 'ease-in-out' },
    );
  }
}

/** a blast pushes everyone nearby away from it, the closest first and hardest */
export function shockwave(s: Stage, at: Point, radius: number, px: number, delay: number, skip: Element | null): void {
  document.querySelectorAll('[data-member]').forEach((el) => {
    if (el === skip) return;
    const c = centerOf(el);
    if (!c) return;
    const d = Math.hypot(c.x - at.x, c.y - at.y);
    if (d > radius || d < 1) return;
    const dir = { x: (c.x - at.x) / d, y: (c.y - at.y) / d };
    knock(s, el, dir, px * (1 - d / radius) + 2, 420, delay + d * 0.6);
  });
}

/** a quick buzz when the hit is on you (Android; iPhones can't) */
export function feel(h: Hit, pattern: number[], delay = 0): void {
  if (h.me) h.s.later(() => buzz(pattern), delay);
}

/** colour blobs flying out: a shortcut for the common juice/debris case */
export function splash(s: Stage, at: Point, colors: string[], count: number, size: [number, number], speed: [number, number], delay = 0): void {
  burst(s, at, {
    count,
    make: (i) => {
      const w = between(...size);
      return s.add('tf-bit', '', { width: `${w}px`, height: `${w * between(0.8, 1.15)}px`, background: colors[i % colors.length] });
    },
    speed,
    life: [600, 900],
    gravity: 1100,
    drag: 3,
    grow: [1, 0.55],
    delay,
  });
}

/** a comic word that slams in at an angle, holds, then floats off (THAPP!, DHISHOOM!) */
export function word(s: Stage, spot: Point, text: string, color: string, shadow: string, delay: number, turn = -8, hold = 700): void {
  const el = s.text('tf-word', text, {
    color,
    fontSize: text.length > 7 ? '26px' : '30px',
    textShadow: `3px 3px 0 ${shadow}, 0 6px 12px rgba(0, 0, 0, 0.45)`,
  });
  // keep the whole word on screen, even over a seat at the edge
  const half = el.offsetWidth / 2 + 10;
  const at = { x: Math.min(Math.max(spot.x, half), window.innerWidth - half), y: Math.max(spot.y, el.offsetHeight / 2 + 8) };
  steps(s, el, delay, [
    [0, at, 2.2, turn * 2, 0],
    [110, at, 0.92, turn, 1],
    [190, at, 1.08, turn, 1],
    [260, at, 1, turn, 1],
    [260 + hold, shift(at, 0, -6), 1, turn, 1],
    [560 + hold, shift(at, 0, -24), 0.85, turn, 0],
  ]);
}

/** things circling a point (dizzy stars, flies): bigger in front, smaller behind */
export function orbit(s: Stage, center: Point, make: () => HTMLElement, count: number, rx: number, ry: number, ms: number, delay: number, laps = 2, jitter = 0): void {
  const n = 24;
  for (let k = 0; k < count; k++) {
    const phase = (k / count) * Math.PI * 2;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const a = phase + f * laps * Math.PI * 2;
      const p = shift(center, Math.cos(a) * rx + between(-jitter, jitter), Math.sin(a) * ry + between(-jitter, jitter));
      const fade = f < 0.1 ? f / 0.1 : f > 0.85 ? (1 - f) / 0.15 : 1;
      frames.push({ transform: place(p, 0.75 + 0.35 * Math.sin(a), a * 20), opacity: fade, offset: f });
    }
    s.toss(make(), frames, { duration: ms, delay, easing: 'linear' });
  }
}

/** a soft puff (steam, smoke) drifting off in a direction */
export function puff(s: Stage, from: Point, dx: number, dy: number, delay: number, className = 'tf-steam', ms = 650): void {
  s.toss(
    s.add(className),
    [
      { transform: place(from, 0.3), opacity: 0 },
      { transform: place(shift(from, dx * 0.3, dy * 0.3), 0.8), opacity: 0.9, offset: 0.25 },
      { transform: place(shift(from, dx, dy), 1.5), opacity: 0 },
    ],
    { duration: ms, delay, easing: 'ease-out' },
  );
}
