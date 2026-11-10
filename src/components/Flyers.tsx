import { useLayoutEffect, useRef } from 'react';
import { reducedMotion } from '../lib/motion';
import type { Flyer } from '../useBluff';

type Point = { x: number; y: number };

/** middle of whatever on screen stands for that person (seat, hand, lobby avatar) */
function centerOf(memberId: string): Point | null {
  const r = document.querySelector(`[data-member="${memberId}"]`)?.getBoundingClientRect();
  return r && r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
}

const place = (p: Point, scale = 1, turn = 0) => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${scale}) rotate(${turn}deg)`;
const shift = (p: Point, dx: number, dy: number): Point => ({ x: p.x + dx, y: p.y + dy });
const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

const FLY_MS = 950;

/** everything one flight puts on screen, so it can all be stopped if the screen changes */
function stage(layer: HTMLElement) {
  const anims: Animation[] = [];
  const nodes: HTMLElement[] = [];
  const timers: number[] = [];
  return {
    add(className: string, text = '', css: Partial<CSSStyleDeclaration> = {}): HTMLElement {
      const el = document.createElement('span');
      el.className = className;
      el.textContent = text;
      Object.assign(el.style, css);
      layer.appendChild(el);
      nodes.push(el);
      return el;
    },
    run(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation {
      const a = el.animate(frames, { fill: 'forwards', ...opts });
      anims.push(a);
      return a;
    },
    later(fn: () => void, ms: number) {
      timers.push(window.setTimeout(fn, ms));
    },
    stop() {
      timers.forEach((t) => window.clearTimeout(t));
      anims.forEach((a) => a.cancel());
      nodes.forEach((n) => n.remove());
    },
  };
}
type Stage = ReturnType<typeof stage>;

interface SprayOptions {
  count: number;
  /** coloured blobs, or emoji/text bits when texts is set */
  colors?: string[];
  texts?: string[];
  size: [number, number];
  reach: [number, number];
  /** how far bits drop (negative floats them up) after flying out */
  fall: number;
  duration: number;
  delay?: number;
  round?: boolean;
  /** only fly upwards */
  up?: boolean;
}

/** bits flying out from a point and falling: splashes, debris, petals, hearts */
function spray(s: Stage, at: Point, o: SprayOptions) {
  // seats near the top of the screen have no room above, so rising bits drift out to the sides instead
  const roomAbove = at.y > 190;
  const fall = o.up && !roomAbove ? Math.max(o.fall, -12) : o.fall;
  for (let i = 0; i < o.count; i++) {
    const angle = !o.up
      ? (i / o.count) * Math.PI * 2 + between(0, 0.6)
      : roomAbove
        ? -Math.PI / 2 + between(-0.9, 0.9)
        : (i % 2 ? 0 : Math.PI) + (i % 2 ? -1 : 1) * between(0.05, 0.5);
    const reach = between(...o.reach);
    const size = between(...o.size);
    const el = o.texts
      ? s.add('fx-bit', o.texts[i % o.texts.length], { fontSize: `${size}px` })
      : s.add('fx-bit', '', {
          width: `${size}px`,
          height: `${o.round ? size : size * 0.65}px`,
          background: o.colors![i % o.colors!.length],
          borderRadius: o.round ? '50%' : '2px',
        });
    const end = shift(at, Math.cos(angle) * reach, Math.sin(angle) * reach);
    const turn = between(-260, 260);
    s.run(
      el,
      [
        { transform: place(at, 0.3), opacity: 1 },
        { transform: place(end, 1, turn / 2), opacity: 1, offset: 0.45 },
        { transform: place(shift(end, between(-10, 10), fall), 0.75, turn), opacity: 0 },
      ],
      { duration: o.duration * between(0.85, 1.15), delay: o.delay ?? 0, easing: 'cubic-bezier(0.15, 0.7, 0.4, 1)' },
    );
  }
}

/** juice sliding down from a splat */
function drips(s: Stage, at: Point, kind: 'tomato' | 'egg', delay: number) {
  [-18, 4, 20].forEach((dx, i) => {
    const el = s.add(`fx-drip ${kind}`);
    const top = shift(at, dx, 12);
    s.run(
      el,
      [
        { transform: `${place(top)} scaleY(0.4)`, opacity: 0 },
        { transform: `${place(top)} scaleY(1)`, opacity: 1, offset: 0.15 },
        { transform: `${place(shift(top, 0, 34 + i * 8))} scaleY(2)`, opacity: 0.9, offset: 0.85 },
        { transform: `${place(shift(top, 0, 44 + i * 8))} scaleY(1.6)`, opacity: 0 },
      ],
      { duration: 1300, delay: delay + i * 120, easing: 'ease-in' },
    );
  });
}

/** the target's seat or avatar trembles */
function shake(s: Stage, target: Element | null, px: number, duration: number, delay: number) {
  if (!target) return;
  // the individual translate property, so the seat's own transform (turn lift) is left alone
  s.run(
    target,
    [0, -px, px, -px * 0.7, px * 0.7, -px * 0.3, 0].map((x, i) => ({ translate: `${x}px ${i % 2 ? px / 3 : 0}px` })),
    { duration, delay, fill: 'none' },
  );
}

/** a flat stain that sticks for a moment then slides away */
function splat(s: Stage, at: Point, kind: 'tomato' | 'egg', delay: number) {
  const el = s.add(`fx-splat ${kind}`);
  s.run(
    el,
    [
      { transform: place(at, 0.2), opacity: 0 },
      { transform: place(at, 1.15), opacity: 0.95, offset: 0.1 },
      { transform: place(at, 1), opacity: 0.92, offset: 0.2 },
      { transform: place(shift(at, 0, 12), 1), opacity: 0.85, offset: 0.8 },
      { transform: place(shift(at, 0, 20), 0.95), opacity: 0 },
    ],
    { duration: 1700, delay },
  );
}

/** what happens when each thrown emoji lands; returns how long it takes */
type Impact = (s: Stage, emoji: HTMLElement, at: Point, target: Element | null) => number;

const bomb: Impact = (s, e, at, target) => {
  // the fuse burns: it swells and trembles, then blows up
  s.run(
    e,
    [
      { transform: place(at, 1.3) },
      { transform: place(shift(at, -3, 0), 1.45, -10), offset: 0.25 },
      { transform: place(shift(at, 3, 0), 1.6, 10), offset: 0.5 },
      { transform: place(shift(at, -3, 0), 1.75, -10), offset: 0.75 },
      { transform: place(at, 1.95) },
    ],
    { duration: 560 },
  );
  s.run(e, [{ opacity: 1 }, { opacity: 0 }], { duration: 60, delay: 560 });
  const flash = s.add('fx-flash');
  s.run(
    flash,
    [
      { transform: place(at, 0.3), opacity: 0 },
      { transform: place(at, 1.4), opacity: 1, offset: 0.2 },
      { transform: place(at, 2.1), opacity: 0 },
    ],
    { duration: 520, delay: 560 },
  );
  const ring = s.add('fx-ring');
  s.run(ring, [{ transform: place(at, 0.2), opacity: 0.9 }, { transform: place(at, 3.6), opacity: 0 }], {
    duration: 620,
    delay: 560,
    easing: 'ease-out',
  });
  const boom = s.add('fx-emoji', '💥');
  s.run(
    boom,
    [
      { transform: place(at, 0.3), opacity: 0 },
      { transform: place(at, 2.6, -8), opacity: 1, offset: 0.25 },
      { transform: place(at, 2.9, 6), opacity: 1, offset: 0.55 },
      { transform: place(at, 3.3), opacity: 0 },
    ],
    { duration: 800, delay: 580, easing: 'ease-out' },
  );
  spray(s, at, { count: 18, colors: ['#ff8a00', '#ffd166', '#e5484d', '#4a4a4a', '#222'], size: [6, 13], reach: [60, 140], fall: 70, duration: 950, delay: 580 });
  spray(s, at, { count: 4, texts: ['💨'], size: [24, 32], reach: [30, 60], fall: -30, duration: 1200, delay: 650, up: true });
  shake(s, target, 10, 480, 580);
  return 1850;
};

const tomato: Impact = (s, e, at, target) => {
  // squashes against them, then bursts
  s.run(
    e,
    [
      { transform: place(at, 1.3), opacity: 1 },
      { transform: `${place(at)} scale(1.6, 0.7)`, offset: 0.55 },
      { transform: `${place(at)} scale(2, 0.3)`, opacity: 0 },
    ],
    { duration: 240, easing: 'ease-in' },
  );
  splat(s, at, 'tomato', 200);
  spray(s, at, { count: 16, colors: ['#e5383b', '#ba181b', '#ff6b6b', '#9d0208'], size: [7, 14], reach: [40, 100], fall: 70, duration: 900, delay: 200, round: true });
  spray(s, at, { count: 3, colors: ['#3a9d23'], size: [8, 11], reach: [30, 55], fall: 40, duration: 800, delay: 200 });
  drips(s, at, 'tomato', 450);
  shake(s, target, 5, 320, 200);
  return 2000;
};

const egg: Impact = (s, e, at, target) => {
  // cracks open on impact: shell bits fly, the yolk splats and drips
  s.run(
    e,
    [
      { transform: place(at, 1.3), opacity: 1 },
      { transform: place(at, 1.35, -14), opacity: 1, offset: 0.3 },
      { transform: place(at, 1.35, 14), opacity: 1, offset: 0.6 },
      { transform: `${place(at)} scale(1.8, 0.5)`, opacity: 0 },
    ],
    { duration: 320, easing: 'ease-in' },
  );
  splat(s, at, 'egg', 280);
  spray(s, at, { count: 10, colors: ['#fffdf2', '#f3e9d2', '#e8dcc0'], size: [6, 11], reach: [35, 80], fall: 60, duration: 850, delay: 280 });
  spray(s, at, { count: 7, colors: ['#ffcc00', '#ffb700'], size: [6, 10], reach: [30, 70], fall: 60, duration: 850, delay: 280, round: true });
  drips(s, at, 'egg', 520);
  shake(s, target, 4, 300, 280);
  return 2050;
};

const kiss: Impact = (s, e, at) => {
  // two heartbeats while little hearts float up
  s.run(
    e,
    [
      { transform: place(at, 1.3), opacity: 1 },
      { transform: place(at, 2.1, -6), offset: 0.14 },
      { transform: place(at, 1.4), offset: 0.28 },
      { transform: place(at, 2.3, 6), offset: 0.42 },
      { transform: place(at, 1.5), offset: 0.58 },
      { transform: place(at, 1.6), opacity: 1, offset: 0.85 },
      { transform: place(shift(at, 0, -24), 0.8), opacity: 0 },
    ],
    { duration: 1600, easing: 'ease-in-out' },
  );
  spray(s, at, { count: 7, texts: ['❤️', '💕', '💗'], size: [14, 22], reach: [40, 85], fall: -50, duration: 1400, delay: 150, up: true });
  return 1650;
};

const rose: Impact = (s, e, at) => {
  // grows and shrinks with a gentle sway; petals drift down, sparkles rise
  s.run(
    e,
    [
      { transform: place(at, 1.3), opacity: 1 },
      { transform: place(at, 2.1, -14), offset: 0.2 },
      { transform: place(at, 1.5, 10), offset: 0.4 },
      { transform: place(at, 2, -8), offset: 0.6 },
      { transform: place(at, 1.6), opacity: 1, offset: 0.85 },
      { transform: place(shift(at, 0, -18), 0.8), opacity: 0 },
    ],
    { duration: 1700, easing: 'ease-in-out' },
  );
  spray(s, at, { count: 7, texts: ['🌸'], size: [12, 18], reach: [20, 55], fall: 90, duration: 1600, delay: 250 });
  spray(s, at, { count: 4, texts: ['✨'], size: [14, 20], reach: [35, 70], fall: -30, duration: 1200, delay: 150, up: true });
  return 1750;
};

const clap: Impact = (s, e, at) => {
  // four quick claps, each with a burst of lines
  const frames: Keyframe[] = [{ transform: place(at, 1.3), opacity: 1 }];
  for (let i = 0; i < 4; i++) {
    frames.push({ transform: place(at, 2.1, i % 2 ? 8 : -8), opacity: 1, offset: (i + 0.4) / 5 });
    frames.push({ transform: place(at, 1.4), opacity: 1, offset: (i + 0.9) / 5 });
  }
  frames.push({ transform: place(shift(at, 0, -16), 0.9), opacity: 0 });
  s.run(e, frames, { duration: 1400, easing: 'ease-in-out' });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 6; j++) {
      const deg = j * 60 + i * 20;
      const line = s.add('fx-line');
      s.run(
        line,
        [
          { transform: `${place(at)} rotate(${deg}deg) translateY(-26px)`, opacity: 0 },
          { transform: `${place(at)} rotate(${deg}deg) translateY(-34px)`, opacity: 1, offset: 0.3 },
          { transform: `${place(at)} rotate(${deg}deg) translateY(-50px) scaleY(0.4)`, opacity: 0 },
        ],
        { duration: 320, delay: ((i + 0.4) / 5) * 1400, easing: 'ease-out' },
      );
    }
  }
  return 1450;
};

const laugh: Impact = (s, e, at) => {
  // rocks and bounces with laughter, tears flying, HA HA floating up
  const frames: Keyframe[] = [{ transform: place(at, 1.5), opacity: 1 }];
  for (let i = 0; i < 5; i++) {
    frames.push({ transform: place(shift(at, 0, -10), 1.75, i % 2 ? 18 : -18), opacity: 1, offset: (i + 0.5) / 6 });
    frames.push({ transform: place(at, 1.55, 0), opacity: 1, offset: (i + 1) / 6 });
  }
  frames.push({ transform: place(shift(at, 0, -18), 0.9), opacity: 0 });
  s.run(e, frames, { duration: 1500, easing: 'ease-in-out' });
  spray(s, at, { count: 4, texts: ['💧'], size: [12, 16], reach: [30, 50], fall: 50, duration: 900, delay: 200, up: true });
  ['HA', 'HA', 'HA'].forEach((text, i) => {
    const ha = s.add('fx-text', text);
    const from = shift(at, (i - 1) * 26, -20);
    s.run(
      ha,
      [
        { transform: place(from, 0.5), opacity: 0 },
        { transform: place(shift(from, 0, -16), 1.2, (i - 1) * 12), opacity: 1, offset: 0.3 },
        { transform: place(shift(from, 0, -52), 1, (i - 1) * 12), opacity: 0 },
      ],
      { duration: 1000, delay: 150 + i * 220, easing: 'ease-out' },
    );
  });
  return 1550;
};

const party: Impact = (s, e, at) => {
  // the popper tips over and bursts into confetti
  s.run(
    e,
    [
      { transform: place(at, 1.3), opacity: 1 },
      { transform: place(at, 1.6, -35), offset: 0.28 },
      { transform: place(at, 2.1, 18), offset: 0.42 },
      { transform: place(at, 1.6, 0), opacity: 1, offset: 0.85 },
      { transform: place(shift(at, 0, -16), 0.9), opacity: 0 },
    ],
    { duration: 1400, easing: 'ease-out' },
  );
  spray(s, at, {
    count: 30,
    colors: ['#f6c453', '#3ccf91', '#ff6b81', '#7cc4ff', '#ffffff', '#c792ff'],
    size: [6, 10],
    reach: [50, 120],
    fall: 110,
    duration: 1300,
    delay: 380,
  });
  return 1700;
};

const IMPACTS: Record<string, Impact> = { '💣': bomb, '🍅': tomato, '🥚': egg, '💋': kiss, '🌹': rose, '👏': clap, '😂': laugh, '🎉': party };

/** one flight: an emoji arcs across and plays its landing effect; coins fly one after another with a +amount tag */
function Flight({ flyer, onDone }: { flyer: Flyer; onDone: (key: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const label = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (reducedMotion() || !box.current) {
      onDone(flyer.key);
      return;
    }
    const s = stage(box.current);
    const a = centerOf(flyer.from) ?? { x: window.innerWidth / 2, y: window.innerHeight - 60 };
    const b = centerOf(flyer.to) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    // seat to seat along the top of the table has no room above, so that arc dips down over the table
    const sideways = Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
    const dip = sideways && Math.min(a.y, b.y) < 170;
    // each throw arcs a little differently, so two crossing throws don't sit on top of each other
    const lift = between(55, 105);
    const top = { x: (a.x + b.x) / 2, y: dip ? Math.max(a.y, b.y) + lift : Math.min(a.y, b.y) - lift - 10 };

    if (flyer.count > 1) {
      // coins fly flat, one after another, then the tag pops up
      const runs = items.current.map((el, i) =>
        el
          ? s.run(
              el,
              [
                { transform: place(a, 0.4), opacity: 0 },
                { transform: place(a, 1), opacity: 1, offset: 0.08 },
                { transform: place(top, 1.4), offset: 0.36 },
                { transform: place(b, 1.9), offset: 0.56 },
                { transform: place(b, 1.3), offset: 0.64 },
                { transform: place(b, 1.3), opacity: 1, offset: 0.92 },
                { transform: place(shift(b, 0, -24), 1), opacity: 0 },
              ],
              { duration: 3000, delay: i * 90, easing: 'ease-in-out' },
            )
          : null,
      );
      if (label.current) {
        s.run(
          label.current,
          [
            { transform: place(b, 0.5), opacity: 0 },
            { transform: place(b, 0.5), opacity: 0, offset: 0.56 },
            { transform: place(shift(b, 0, -34), 1.2), opacity: 1, offset: 0.66 },
            { transform: place(shift(b, 0, -40), 1), opacity: 1, offset: 0.92 },
            { transform: place(shift(b, 0, -60), 1), opacity: 0 },
          ],
          { duration: 3000 + (flyer.count - 1) * 90, easing: 'ease-out' },
        );
      }
      const last = runs[runs.length - 1];
      if (last) last.onfinish = () => onDone(flyer.key);
      else onDone(flyer.key);
      return () => s.stop();
    }

    const emoji = items.current[0];
    if (!emoji) {
      onDone(flyer.key);
      return;
    }
    // the throw: an arc with a spin, landing a little bigger
    const flight = s.run(
      emoji,
      [
        { transform: place(a, 0.4), opacity: 0 },
        { transform: place(a, 1), opacity: 1, offset: 0.12 },
        { transform: place(top, 1.5, 200), opacity: 1, offset: 0.55 },
        { transform: place(b, 1.3, 360), opacity: 1 },
      ],
      { duration: FLY_MS, easing: 'cubic-bezier(0.3, 0.5, 0.4, 1)' },
    );
    flight.onfinish = () => {
      const target = document.querySelector(`[data-member="${flyer.to}"]`);
      const ms = (IMPACTS[flyer.emoji] ?? kiss)(s, emoji, b, target);
      s.later(() => onDone(flyer.key), ms);
    };
    return () => s.stop();
  }, [flyer.key]);

  return (
    <div ref={box}>
      {Array.from({ length: flyer.count }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            items.current[i] = el;
          }}
          className="flyer"
        >
          {flyer.emoji}
        </span>
      ))}
      {flyer.label && (
        <span ref={label} className="flyer-label">
          {flyer.label}
        </span>
      )}
    </div>
  );
}

/** emoji and coins flying between people; everyone in the room sees the same flight */
export function Flyers({ items, onDone }: { items: Flyer[]; onDone: (key: number) => void }) {
  return (
    <div className="flyers" aria-hidden>
      {items.map((f) => (
        <Flight key={f.key} flyer={f} onDone={onDone} />
      ))}
    </div>
  );
}
