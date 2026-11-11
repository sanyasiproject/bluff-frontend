import { throwSfx } from '../../lib/throwSounds';
import { contact, hero, HERO, orbit, puff, ring, splash, steps, twinkle, word, type Impact } from './hit';
import { playParts } from './lottie';
import { drips, stain } from './messy';
import { flySvg, stinkSvg } from './props';
import { sparkSvg, splatSvg } from './shapes';
import { between, blob, burst, pick, place, shift, type Point, type Stage } from './stage';

const SPRINKLES = ['#ff5d8f', '#ffd400', '#3ccf91', '#7cc4ff', '#c792ff', '#ff9f1c'];

/** lands soft and wobbles like jelly before settling */
const jelly = (at: Point, hold: number): [number, Point, number | [number, number], number, number][] => [
  [0, at, [1.4, 0.66], 0, 1],
  [120, at, [0.88, 1.15], 0, 1],
  [230, at, [1.08, 0.94], 0, 1],
  [330, at, [0.97, 1.03], 0, 1],
  [420, at, 1, 0, 1],
  [hold, at, 1, 0, 1],
  [hold + 300, shift(at, 0, -10), 0.72, 0, 0],
];

/** wavy lines rising and swaying (stink) */
function stink(s: Stage, at: Point, delay: number): void {
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 3; i++) {
      const p = shift(at, (i - 1) * 22, -HERO * 0.42);
      steps(s, s.add('tf-svg', stinkSvg(), { width: '12px', height: '32px' }), delay + k * 520 + i * 160, [
        [0, p, 0.6, 0, 0],
        [250, shift(p, 0, -10), 1, 6, 0.9],
        [600, shift(p, 3, -26), 1.1, -6, 0.8],
        [900, shift(p, -2, -42), 1.2, 4, 0],
      ]);
    }
  }
}

export const poop: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 80, glow: 'rgba(140, 90, 40, 0.85)', push: 9, squash: [1.7, 0.55] });
  s.later(() => throwSfx.poop(at.x), 0);
  splash(s, at, ['#6b3e1f', '#8a5530', '#4e2b12'], 18, [6, 13], [200, 440], t * 0.4);
  stain(s, s.add('tf-svg tf-decal', splatSvg('#6b3e1f', '#8f5a32'), { width: '128px', height: '116px' }), at, t * 0.4, 1500);
  const { el, anim } = hero(h, '💩');
  if (anim) s.later(() => playParts(anim, [[0, 143, 1.1]], true), t);
  steps(s, el, t, jelly(at, 1450));
  drips(s, at, ['#6b3e1f', '#8a5530'], 3, t + 420);
  stink(s, at, t + 200);
  // flies buzz round and round
  orbit(s, shift(at, 0, -HERO * 0.15), () => s.add('tf-svg', flySvg(), { width: '19px', height: '15px' }), 3, 50, 24, 1550, t + 220, 3, 7);
  return t + 1850;
};

export const cake: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 75, glow: 'rgba(255, 190, 210, 0.9)', push: 9, squash: [1.6, 0.6] });
  s.later(() => throwSfx.cake(at.x), 0);
  // frosting splats out, sprinkles fly
  stain(s, s.add('tf-svg tf-decal', splatSvg('#fff6f2', '#ffd6e4'), { width: '128px', height: '116px' }), at, t * 0.4, 1500);
  splash(s, at, ['#ffd6e4', '#fff6f2', '#ff9ec0'], 14, [6, 12], [200, 420], t * 0.4);
  burst(s, at, {
    count: 22,
    make: () => blob(s, pick(SPRINKLES), 3, between(8, 10), false),
    speed: [220, 480],
    gravity: 1100,
    life: [600, 950],
    spin: 720,
    grow: [1, 0.8],
    delay: t * 0.4,
  });
  // the cake squashes, wobbles, and its candles go out
  const { el, anim } = hero(h, '🎂');
  if (anim) s.later(() => playParts(anim, [[20, 92, 1.05]]), t);
  steps(s, el, t, jelly(at, 1300));
  const out = t + 790;
  s.later(() => throwSfx.candles(at.x), out);
  [-12, 0, 12].forEach((dx, i) => puff(s, shift(at, dx, -HERO * 0.44), dx * 0.8, -34, out + i * 50, 'tf-smoke', 800));
  drips(s, at, ['#fff6f2', '#ffc2d6', '#fff6f2'], 3, t + 450);
  return t + 1800;
};

export const cheers: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 200, 80, 0.9)', push: 3 });
  const { el, anim } = hero(h, '🍻');
  // the mugs swing together and clink
  if (anim) s.later(() => playParts(anim, [[15, 105, 1.25]]), t);
  const clink = t + 400;
  steps(s, el, t, [
    [0, at, 0.5, 0, 0],
    [150, at, 1.2, 0, 1],
    [260, at, 1, 0, 1],
    [400, at, 1.14, 0, 1],
    [480, at, 1, 0, 1],
    [1400, at, 1, 0, 1],
    [1700, shift(at, 0, -14), 0.7, 0, 0],
  ]);
  s.later(() => throwSfx.clink(at.x), clink);
  const top = shift(at, 0, -HERO * 0.3);
  ring(s, top, '#fff', 1.6, clink, 360);
  twinkle(s, top, () => s.add('tf-svg', sparkSvg(pick(['#fff', '#ffd84d'])), { width: '15px', height: '15px' }), 6, 38, clink, 250);
  // foam sprays up and bubbles rise
  burst(s, top, {
    count: 16,
    make: () => blob(s, pick(['#fffdf2', '#fff3cf', '#ffffff']), between(5, 10)),
    angle: [-160, -20],
    speed: [160, 360],
    gravity: 900,
    life: [500, 800],
    grow: [1, 0.6],
    delay: clink,
  });
  for (let i = 0; i < 10; i++) {
    const from = shift(at, between(-30, 30), between(-10, 10));
    const sway = between(-14, 14);
    const size = `${between(6, 12)}px`;
    s.toss(
      s.add('tf-bubble', '', { width: size, height: size }),
      [
        { transform: place(from, 0.4), opacity: 0 },
        { transform: place(shift(from, sway, -40), 1), opacity: 0.9, offset: 0.4 },
        { transform: place(shift(from, -sway, -90), 1.1), opacity: 0 },
      ],
      { duration: between(900, 1300), delay: clink + i * 70, easing: 'ease-out' },
    );
  }
  word(s, shift(at, 0, -HERO * 0.62), 'CHEERS!', '#ffd84d', '#9a5b00', clink - 20, -6, 600);
  return t + 1750;
};
