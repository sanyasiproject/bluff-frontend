import { throwSfx } from '../../lib/throwSounds';
import { contact, feel, flash, hero, HERO, ring, shockwave, splash, steps, type Impact } from './hit';
import { clip, playParts } from './lottie';
import { dripSvg, eggBottomSvg, eggTopSvg, shellSvg, splatSvg, yolkSvg } from './shapes';
import { between, blob, burst, pick, place, quake, shift, type Point, type Stage } from './stage';

/** juice running down from a splat, stretching as it goes */
export function drips(s: Stage, at: Point, colors: string[], count: number, delay: number): void {
  for (let i = 0; i < count; i++) {
    const top = shift(at, (i - (count - 1) / 2) * between(13, 18), between(16, 26));
    const el = s.add('tf-svg', dripSvg(colors[i % colors.length]), { width: `${between(7, 10)}px`, height: '30px' });
    const fall = between(30, 56);
    s.toss(
      el,
      [
        { transform: place(top, [1, 0.2]), opacity: 0 },
        { transform: place(shift(top, 0, 8), [1, 0.8]), opacity: 1, offset: 0.2 },
        { transform: place(shift(top, 0, fall * 0.7), [0.9, 1.25]), opacity: 1, offset: 0.75 },
        { transform: place(shift(top, 0, fall), [0.7, 1.4]), opacity: 0 },
      ],
      { duration: between(1100, 1500), delay: delay + i * 140, easing: 'ease-in' },
    );
  }
}

/** a stain that sticks, slides down a bit and fades */
export function stain(s: Stage, el: HTMLElement, at: Point, delay: number, hold = 1300): void {
  steps(s, el, delay, [
    [0, at, 0.25, 0, 0],
    [110, at, [1.12, 1.05], 0, 1],
    [220, at, 1, 0, 1],
    [hold, shift(at, 0, 10), [1, 1.06], 0, 1],
    [hold + 500, shift(at, 0, 24), [0.97, 1.14], 0, 0],
  ]);
}

export const tomato: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 85, glow: 'rgba(230, 40, 40, 0.9)', push: 10, squash: [1.6, 0.6] });
  s.later(() => throwSfx.tomato(at.x), 0);
  feel(h, [25]);
  splash(s, at, ['#e5383b', '#ba181b', '#ff6b6b', '#9d0208'], 24, [6, 14], [220, 500], t * 0.4);
  splash(s, at, ['#f6e7a1', '#e9d77e'], 7, [3, 5], [160, 340], t * 0.4);
  splash(s, at, ['#3a9d23', '#2d7a1b'], 3, [6, 9], [150, 280], t * 0.4);
  const { el, anim } = hero(h, '🍅');
  if (anim) {
    // the tomato squashes into a splat (the clip played backwards), then wobbles and drips
    s.later(() => playParts(anim, [[104, 62, 2.4], [62, 6, 1.1]]), t);
    steps(s, el, t, [
      [0, at, [1.25, 0.8], 0, 1],
      [120, at, [1.12, 0.94], 0, 1],
      [300, at, 1.04, 0, 1],
      [1150, shift(at, 0, 8), [1.04, 1.1], 0, 1],
      [1550, shift(at, 0, 22), [1, 1.16], 0, 0],
    ]);
  } else {
    // not loaded yet: the emoji flattens into a drawn splat
    steps(s, el, t, [
      [0, at, [1.4, 0.7], 0, 1],
      [160, at, [2, 0.3], 0, 0],
    ]);
    stain(s, s.add('tf-svg', splatSvg('#d62828', '#ff5a5a'), { width: '96px', height: '88px' }), at, t);
  }
  drips(s, at, ['#c1121f', '#d62828'], 4, t + 380);
  return t + 1700;
};

export const egg: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 85, glow: 'rgba(255, 240, 200, 0.9)', push: 8, squash: [1.4, 0.75] });
  s.later(() => throwSfx.egg(at.x), 0);
  feel(h, [20]);
  const side = Math.random() < 0.5 ? -1 : 1;
  const size = { width: '46px', height: '48px' };
  // the shell cracks open: the top flies off spinning, the bottom drops away
  steps(s, s.add('tf-svg', eggTopSvg(), size), t, [
    [0, at, 1.3, 0, 1],
    [70, at, [1.36, 1.22], -4 * side, 1],
    [420, shift(at, -40 * side, -66), 1.15, -130 * side, 1],
    [780, shift(at, -58 * side, -20), 1, -210 * side, 0],
  ]);
  steps(s, s.add('tf-svg', eggBottomSvg(), size), t, [
    [0, at, 1.3, 0, 1],
    [70, at, [1.36, 1.22], 3 * side, 1],
    [380, shift(at, 22 * side, 22), 1.2, 40 * side, 1],
    [700, shift(at, 30 * side, 54), 1.1, 60 * side, 0],
  ]);
  burst(s, at, {
    count: 9,
    make: () => s.add('tf-svg', shellSvg(), { width: `${between(8, 13)}px`, height: `${between(8, 13)}px` }),
    speed: [220, 440],
    gravity: 1200,
    life: [600, 900],
    spin: 540,
    grow: [1, 0.8],
    delay: t + 40,
  });
  // the inside splats on the seat and the yolk wobbles
  stain(s, s.add('tf-svg', splatSvg('#fffdf6', '#ffffff'), { width: '100px', height: '92px' }), at, t + 30);
  const yolk = shift(at, between(-6, 6), -4);
  steps(s, s.add('tf-svg', yolkSvg(), { width: '36px', height: '36px' }), t + 50, [
    [0, yolk, 0.3, 0, 0],
    [110, yolk, [1.35, 0.7], 0, 1],
    [210, yolk, [0.9, 1.12], 0, 1],
    [310, yolk, [1.06, 0.95], 0, 1],
    [410, yolk, 1, 0, 1],
    [1300, shift(yolk, 0, 12), [1, 1.05], 0, 1],
    [1800, shift(yolk, 0, 26), [0.96, 1.12], 0, 0],
  ]);
  splash(s, at, ['#ffc21a', '#fffdf6', '#ffaa00'], 12, [4, 9], [180, 380], t + 40);
  drips(s, at, ['#fff8e6', '#ffc21a', '#fff8e6'], 3, t + 520);
  return t + 1950;
};

const FUSE = 700;

export const bomb: Impact = (h) => {
  const { s, at, target } = h;
  const t = contact(h, { stop: 60, glow: 'rgba(255, 170, 60, 0.8)', push: 7, squash: [1.3, 0.82] });
  s.later(() => throwSfx.fuse(at.x, FUSE + t), 0);
  // the blast clip loads while the fuse burns
  const blast = clip(s, 'boom', 240);
  const { el, anim } = hero(h, '💣');
  if (anim) s.later(() => playParts(anim, [[16, 46, 30 / ((FUSE / 1000) * 60)]]), t);
  // it trembles and swells as the fuse burns down
  const list: [number, Point, number, number, number][] = [
    [0, at, 0.7, 0, 0],
    [120, at, 1.15, 0, 1],
    [200, at, 1, 0, 1],
  ];
  for (let i = 1; i <= 10; i++) {
    const m = 1 + i * 0.4;
    list.push([200 + i * 48, shift(at, between(-m, m), between(-m, m)), 1 + i * 0.045, (i % 2 ? 1 : -1) * (2 + i), 1]);
  }
  list.push([FUSE, at, 1.6, 0, 1], [FUSE + 40, at, 1.8, 0, 0]);
  steps(s, el, t, list, 'linear');
  [150, 380, 560].forEach((ms) => flash(s, at, 'rgba(255, 40, 40, 0.7)', 120, t + ms, 240));
  const fuse = shift(at, HERO * 0.28, -HERO * 0.36);
  for (let k = 0; k < 4; k++) {
    burst(s, fuse, {
      count: 4,
      make: () => blob(s, pick(['#ffd166', '#ffb703', '#fff3b0']), between(3, 5)),
      angle: [-160, -20],
      speed: [60, 170],
      gravity: 320,
      life: [240, 400],
      grow: [1, 0.4],
      delay: t + 120 + k * 140,
    });
  }

  const boom = t + FUSE;
  s.later(() => throwSfx.boom(at.x), boom);
  feel(h, [40, 30, 140], boom);
  // the whole screen lights up for a moment
  const screen = s.add('tf-screen', '', {
    background: `radial-gradient(circle at ${at.x}px ${at.y}px, rgba(255, 250, 230, 0.95), rgba(255, 170, 60, 0.5) 22%, rgba(255, 90, 0, 0) 60%)`,
  });
  s.toss(screen, [{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0 }], { duration: 520, delay: boom, easing: 'ease-out' });
  flash(s, at, 'rgba(255, 140, 0, 0.95)', 200, boom, 560);
  s.later(() => {
    const b = blast.anim ? blast.box : s.text('tf-hero', '💥');
    if (blast.anim) playParts(blast.anim, [[0, 75, 1.15]]);
    const k = blast.anim ? 1 : 2.4;
    steps(s, b, 0, [
      [0, at, 0.4 * k, 0, 1],
      [130, at, 1.1 * k, 0, 1],
      [700, at, 1.15 * k, 0, 1],
      [1000, at, 1.2 * k, 0, 0],
    ]);
  }, boom);
  ring(s, at, '#ffd166', 4.4, boom, 520);
  ring(s, at, 'rgba(255, 255, 255, 0.7)', 6.5, boom + 70, 720);
  burst(s, at, {
    count: 18,
    make: () => blob(s, pick(['#2b2b2b', '#444', '#6b4f2a', '#ff8a00']), between(5, 11), between(4, 9), false),
    speed: [360, 740],
    gravity: 1300,
    life: [700, 1050],
    spin: 720,
    grow: [1, 0.7],
    delay: boom,
  });
  burst(s, at, {
    count: 14,
    make: () => blob(s, pick(['#ffb703', '#fb8500', '#ffd166']), between(3, 6)),
    speed: [150, 420],
    gravity: -160,
    drag: 2.6,
    life: [800, 1300],
    grow: [1, 0.3],
    fade: 0.4,
    delay: boom + 40,
  });
  // smoke rolls up and spreads
  for (let i = 0; i < 7; i++) {
    const from = shift(at, between(-22, 22), between(-10, 14));
    const to = shift(from, between(-46, 46), between(-95, -40));
    s.toss(
      s.add('tf-smoke'),
      [
        { transform: place(from, 0.4), opacity: 0 },
        { transform: place(shift(from, 0, -10), 1), opacity: 0.75, offset: 0.2 },
        { transform: place(to, 1.7), opacity: 0 },
      ],
      { duration: between(1300, 1750), delay: boom + 90 + i * 35, easing: 'ease-out' },
    );
  }
  // a scorch mark left on the seat
  steps(s, s.add('tf-scorch'), boom + 60, [
    [0, at, 0.6, 0, 0],
    [90, at, 1, 0, 0.85],
    [1400, at, 1, 0, 0.6],
    [1900, at, 1.05, 0, 0],
  ]);
  quake(s, target, 10, 680, boom);
  shockwave(s, at, 320, 14, boom, target);
  return boom + 1950;
};
