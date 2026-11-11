import { throwSfx } from '../../lib/throwSounds';
import type { Flyer } from '../../useBluff';
import { flash, HERO, ring, steps, twinkle, type Hit, type Impact } from './hit';
import { clip, warm, type FxName } from './lottie';
import { bomb, egg, tomato } from './messy';
import { axeSvg, chappalSvg } from './props';
import { clown, plead, pray, scream, tease } from './cheeky';
import { angry, axe, chappal, punch } from './rough';
import { eggSvg, sparkSvg } from './shapes';
import { cake, cheers, poop } from './silly';
import { between, blob, burst, centerOf, knock, memberEl, place, shift, stage, type Point, type Stage } from './stage';
import { clap, kiss, laugh, party, plain, rose } from './sweet';

// The throw engine: loaded with the first throw so the main bundle stays small

interface ThrowFx {
  impact: Impact;
  /** animated emoji to fetch; the first is the one that lands */
  clips?: FxName[];
  /** frame the landing clip waits on, and its size */
  frame?: number;
  size?: number;
  /** tumbles end over end in the air, or just wobbles */
  spin: boolean;
  /** turns in the air when it spins (the axe goes end over end) */
  spins?: number;
  /** flaps as it flies (the chappal) */
  flap?: boolean;
  /** how much the path curves; under 1 flies straighter (the punch) */
  bend?: number;
  /** drawn instead of the emoji (Noto has no animated egg, axe or chappal), and its size */
  drawn?: () => string;
  drawnSize?: [number, number];
  /** a burning fuse leaves sparks behind */
  sparks?: boolean;
}

const THROW_FX: Record<string, ThrowFx> = {
  '🌹': { impact: rose, clips: ['rose'], spin: true },
  '💋': { impact: kiss, clips: ['kiss', 'heart'], spin: false },
  '👏': { impact: clap, clips: ['clap'], spin: false },
  '🎉': { impact: party, clips: ['party'], spin: true },
  '😂': { impact: laugh, clips: ['joy'], spin: true },
  '🍅': { impact: tomato, clips: ['tomato'], frame: 104, size: HERO * 1.2, spin: true },
  '🥚': { impact: egg, spin: true, drawn: eggSvg },
  '💣': { impact: bomb, clips: ['bomb', 'boom'], frame: 16, spin: true, sparks: true },
  '😡': { impact: angry, clips: ['angry'], frame: 30, spin: false },
  '🪓': { impact: axe, spin: true, spins: 2, drawn: axeSvg, drawnSize: [56, 56] },
  '🩴': { impact: chappal, spin: true, flap: true, drawn: chappalSvg, drawnSize: [30, 54] },
  '👊': { impact: punch, clips: ['punch'], frame: 18, spin: false, bend: 0.35 },
  '💩': { impact: poop, clips: ['poop'], spin: true },
  '🎂': { impact: cake, clips: ['cake'], frame: 20, spin: false },
  '🍻': { impact: cheers, clips: ['cheers'], frame: 15, spin: false },
  '😱': { impact: scream, clips: ['scream'], frame: 14, spin: true },
  '🥺': { impact: plead, clips: ['plead'], spin: false },
  '🙏': { impact: pray, clips: ['pray'], spin: false },
  '😝': { impact: tease, clips: ['tease'], frame: 14, spin: true },
  '🤡': { impact: clown, clips: ['clown'], spin: true },
};

const fxOf = (emoji: string): ThrowFx => THROW_FX[emoji] ?? { impact: plain(emoji), spin: true };

/** the pop and pull-back before the throw */
const WIND = 150;
/** further throws take a little longer, but never drag */
const flightMs = (a: Point, b: Point) => Math.round(Math.min(880, Math.max(580, 470 + Math.hypot(b.x - a.x, b.y - a.y) * 0.75)));
/** a touch faster at the end, so it hits rather than arrives */
const ease = (f: number) => f * (0.78 + 0.22 * f);

/** a curve from a to b: bends up the screen, or down over the table near the top; never quite the same twice */
function arc(a: Point, b: Point, curve = 1): (t: number) => Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  let n = { x: dy / d, y: -dx / d };
  if (n.y > 0 || (Math.abs(n.y) < 0.3 && Math.random() < 0.5)) n = { x: -n.x, y: -n.y };
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const bend = Math.min(170, d * between(0.3, 0.45) + 24) * curve;
  let c = shift(mid, n.x * bend, n.y * bend);
  if (c.y < 60) c = shift(mid, -n.x * bend, -n.y * bend);
  return (t) => {
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  };
}

const unit = (p: Point): Point => {
  const d = Math.hypot(p.x, p.y);
  return d ? { x: p.x / d, y: p.y / d } : { x: 0, y: 1 };
};

interface FlyOptions {
  spin: boolean;
  /** size when it lands */
  end: number;
  delay?: number;
  /** coins flip over and over */
  flip?: boolean;
  ghosts?: boolean;
  sparks?: boolean;
  /** share one curve between several flights (coins) */
  path?: (t: number) => Point;
  spins?: number;
  flap?: boolean;
  bend?: number;
}

/** one flight: pops out of the sender and pulls back, then arcs over with spin and lob, a shadow on the table and a fading trail */
function fly(s: Stage, make: () => HTMLElement, a: Point, b: Point, ms: number, o: FlyOptions): { el: HTMLElement; dir: Point } {
  const path = o.path ?? arc(a, b, o.bend);
  const delay = o.delay ?? 0;
  const total = WIND + ms;
  const turn = b.x >= a.x ? 1 : -1;
  const lead = unit({ x: path(0.1).x - a.x, y: path(0.1).y - a.y });
  const back = shift(a, -lead.x * 10, -lead.y * 10);
  const N = 16;
  const air: { f: number; transform: string }[] = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    // bigger near the top of the arc, as if closer to you
    const size = (1 + 0.5 * Math.sin(Math.PI * f)) * (1 + (o.end - 1) * f);
    const rot = o.spin ? turn * 360 * (o.spins ?? 1) * ease(f) : turn * 16 * Math.sin(f * Math.PI * 3);
    const flap = o.flap ? 0.6 + 0.4 * Math.abs(Math.cos(f * Math.PI * 7)) : 1;
    air.push({ f, transform: place(path(ease(f)), [size * (o.flip ? Math.cos(f * Math.PI * 6) : 1), size * flap], rot) });
  }
  const el = make();
  s.run(
    el,
    [
      { transform: place(a, 0.2), opacity: 0, offset: 0, easing: 'ease-out' },
      { transform: place(a, 1.3), opacity: 1, offset: (WIND * 0.55) / total, easing: 'ease-in-out' },
      { transform: place(back, [1.15, 0.88]), opacity: 1, offset: WIND / total },
      ...air.slice(1).map((k) => ({ transform: k.transform, opacity: 1, offset: (WIND + k.f * ms) / total })),
    ],
    { duration: total, delay, easing: 'linear' },
  );
  if (o.ghosts !== false) {
    [
      [45, 0.4],
      [90, 0.2],
    ].forEach(([lag, alpha]) => {
      const ghost = make();
      ghost.classList.add('tf-ghost');
      s.toss(
        ghost,
        air.map((k) => ({ transform: k.transform, opacity: alpha * Math.sin(Math.PI * k.f), offset: k.f })),
        { duration: ms, delay: delay + WIND + lag, easing: 'linear' },
      );
    });
  }
  // the shadow stays on the table, smaller and fainter while the throw is high
  const shadow: Keyframe[] = air.map(({ f }) => {
    const e = ease(f);
    const h = Math.sin(Math.PI * f);
    return { transform: place({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e + 18 }, 1 - 0.45 * h), opacity: f === 0 || f === 1 ? 0 : 0.5 - 0.25 * h, offset: f };
  });
  s.toss(s.add('tf-shadow'), shadow, { duration: ms, delay: delay + WIND, easing: 'linear' });
  if (o.sparks) {
    for (let i = 1; i <= 10; i++) {
      const f = i / 11;
      burst(s, path(ease(f)), {
        count: 2,
        make: () => blob(s, i % 2 ? '#ffd166' : '#ff9f1c', between(3, 5)),
        speed: [30, 110],
        gravity: 260,
        life: [260, 420],
        grow: [1, 0.3],
        delay: delay + WIND + f * ms,
      });
    }
  }
  const end = path(1);
  const near = path(0.94);
  return { el, dir: unit({ x: end.x - near.x, y: end.y - near.y }) };
}

/** a thrown emoji: the flight, then its own landing effect */
function throwOne(s: Stage, flyer: Flyer, fx: ThrowFx, a: Point, b: Point, done: () => void): void {
  fx.clips?.forEach(warm);
  // the landing clip is built (hidden) while it flies, so the hit doesn't stutter
  const landing = fx.clips ? clip(s, fx.clips[0], fx.size ?? HERO, fx.frame ?? 0) : null;
  const ms = flightMs(a, b);
  const { drawn, drawnSize: box } = fx;
  const css = box ? { width: `${box[0]}px`, height: `${box[1]}px` } : {};
  const make = () => (drawn ? s.add('tf-glyph tf-drawn', drawn(), css) : s.text('tf-glyph', flyer.emoji));
  const { el, dir } = fly(s, make, a, b, ms, { spin: fx.spin, end: 1.25, sparks: fx.sparks, spins: fx.spins, flap: fx.flap, bend: fx.bend });
  s.later(() => throwSfx.launch(ms, a.x, b.x), WIND);
  s.later(() => {
    const target = memberEl(flyer.to);
    const hit: Hit = { s, at: b, dir, thrown: el, target, clip: landing, me: !!target?.classList.contains('hand-area') };
    s.later(done, fx.impact(hit));
  }, WIND + ms);
}

/** gifted coins: flipping one after another, each landing with a ching, then the +amount tag */
function coins(s: Stage, flyer: Flyer, a: Point, b: Point, done: () => void): void {
  const ms = flightMs(a, b) + 80;
  const gap = 110;
  const target = memberEl(flyer.to);
  const dir = unit({ x: b.x - a.x, y: b.y - a.y });
  const path = arc(a, b);
  s.later(() => throwSfx.launch(ms + gap * flyer.count, a.x, b.x), WIND);
  for (let i = 0; i < flyer.count; i++) {
    const delay = i * gap;
    const land = delay + WIND + ms;
    const { el } = fly(s, () => s.text('tf-glyph tf-coin', flyer.emoji), a, b, ms, { spin: false, end: 1.1, flip: true, delay, ghosts: false, path });
    const spot = shift(b, between(-12, 12), between(-8, 8));
    // a little bounce where it lands, then it sinks in
    s.run(
      el,
      [
        { transform: place(b, 1.1), opacity: 1 },
        { transform: place(shift(spot, 0, -16), 1.25), opacity: 1, offset: 0.3 },
        { transform: place(spot, 1), opacity: 1, offset: 0.6 },
        { transform: place(spot, 0.4), opacity: 0 },
      ],
      { duration: 650, delay: land, fill: 'forwards', easing: 'ease-out' },
    );
    s.later(() => throwSfx.coin(i, b.x), land);
    burst(s, b, {
      count: 6,
      make: () => blob(s, i % 2 ? '#ffd84d' : '#fff3b0', between(3, 5)),
      angle: [-170, -10],
      speed: [120, 260],
      gravity: 700,
      life: [380, 560],
      grow: [1, 0.4],
      delay: land,
    });
    knock(s, target, dir, 3, 300, land);
  }
  const last = (flyer.count - 1) * gap + WIND + ms;
  s.later(() => throwSfx.kaching(b.x), last + 120);
  flash(s, b, 'rgba(255, 210, 80, 0.85)', 130, last, 420);
  ring(s, b, '#ffd84d', 2.6, last, 480);
  twinkle(s, b, () => s.add('tf-svg', sparkSvg('#ffd84d'), { width: '16px', height: '16px' }), 6, 50, last, 600);
  if (flyer.label) {
    const up = shift(b, 0, -42);
    steps(s, s.text('tf-label', flyer.label), last + 80, [
      [0, shift(b, 0, -20), 0.5, 0, 0],
      [180, up, 1.25, -4, 1],
      [300, up, 1, 0, 1],
      [1250, shift(up, 0, -6), 1, 0, 1],
      [1550, shift(up, 0, -26), 0.9, 0, 0],
    ]);
  }
  s.later(done, last + 1700);
}

/** starts one flight on the layer; returns a function that stops it and removes everything it drew */
export function play(layer: HTMLElement, flyer: Flyer, done: () => void): () => void {
  const s = stage(layer);
  const a = centerOf(memberEl(flyer.from)) ?? { x: window.innerWidth / 2, y: window.innerHeight - 60 };
  const b = centerOf(memberEl(flyer.to)) ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  if (flyer.count > 1) coins(s, flyer, a, b, done);
  else throwOne(s, flyer, fxOf(flyer.emoji), a, b, done);
  return () => s.stop();
}
