import { throwSfx } from '../../lib/throwSounds';
import { contact, feel, flash, hero, HERO, orbit, puff, steps, word, type Impact, type Step } from './hit';
import { playParts } from './lottie';
import { angerSvg, AXE_EDGE, burstSvg, crackSvg, slapMarkSvg, starSvg } from './props';
import { between, blob, burst, pick, place, quake, shift, type Point, type Stage } from './stage';

/** short white streaks bursting out from a hit */
function streaks(s: Stage, at: Point, count: number, from: number, to: number, delay: number, color = '#fff'): void {
  for (let j = 0; j < count; j++) {
    const deg = (j * 360) / count + between(-10, 10);
    s.toss(
      s.add('tf-line', '', { background: color }),
      [
        { transform: `${place(at)} rotate(${deg}deg) translateY(-${from}px) scaleY(0.6)`, opacity: 0 },
        { transform: `${place(at)} rotate(${deg}deg) translateY(-${(from + to) / 2}px) scaleY(1.4)`, opacity: 1, offset: 0.3 },
        { transform: `${place(at)} rotate(${deg}deg) translateY(-${to}px) scaleY(0.3)`, opacity: 0 },
      ],
      { duration: 280, delay, easing: 'ease-out' },
    );
  }
}

export const angry: Impact = (h) => {
  const { s, at, target } = h;
  const t = contact(h, { stop: 60, glow: 'rgba(255, 60, 40, 0.9)', push: 7 });
  s.later(() => throwSfx.angry(at.x), 0);
  const { el, anim } = hero(h, '😡');
  // the face boils from cross to red
  if (anim) s.later(() => playParts(anim, [[30, 128, 1.45]]), t);
  // swells with rage, shaking harder and harder
  const list: Step[] = [
    [0, at, 0.5, 0, 0],
    [140, at, 1.2, 0, 1],
    [240, at, 1, 0, 1],
  ];
  for (let i = 1; i <= 16; i++) {
    const m = 1 + i * 0.25;
    list.push([240 + i * 60, shift(at, between(-m, m), between(-m, m)), 1 + i * 0.012, (i % 2 ? 1 : -1) * m, 1]);
  }
  list.push([1300, at, 1.2, 0, 1], [1600, shift(at, 0, -14), 0.75, 0, 0]);
  steps(s, el, t, list, 'linear');
  [200, 520, 840].forEach((ms) => flash(s, at, 'rgba(255, 30, 30, 0.75)', 150, t + ms, 320));
  quake(s, target, 3, 700, t + 300);
  // steam blasts out of both ears, again and again
  for (let k = 0; k < 4; k++) [-1, 1].forEach((side) => puff(s, shift(at, side * HERO * 0.44, -HERO * 0.12), side * 46, -26, t + 260 + k * 230));
  // anger marks pop around the head
  [
    [0.42, -0.42],
    [-0.46, -0.32],
    [0.5, 0.06],
  ].forEach(([fx, fy], i) => {
    const p = shift(at, fx * HERO, fy * HERO);
    steps(s, s.add('tf-svg', angerSvg(), { width: '22px', height: '22px' }), t + 180 + i * 220, [
      [0, p, 0, 0, 0],
      [120, p, 1.4, 10, 1],
      [220, p, 1, 0, 1],
      [330, p, 1.25, 0, 1],
      [440, p, 1, 0, 1],
      [700, p, 1.1, 0, 1],
      [900, p, 0.6, 0, 0],
    ]);
  });
  return t + 1650;
};

export const axe: Impact = (h) => {
  const { s, at, target, thrown } = h;
  const t = contact(h, { stop: 90, glow: 'rgba(255, 220, 160, 0.8)', push: 13, keep: true });
  s.later(() => throwSfx.axe(at.x), 0);
  feel(h, [35]);
  // THUNK: the blade edge bites into the middle of the seat and the handle wobbles about it
  thrown.style.transformOrigin = AXE_EDGE;
  const p = shift(at, 2.8, -23);
  const list: Step[] = [
    [0, p, 1.55, -7, 1],
    [t, p, [1.45, 1.5], -4, 1],
  ];
  [9, -7, 5, -3.5, 2, -1, 0].forEach((turn, i) => list.push([t + 70 + i * 75, p, 1.45, turn, 1]));
  list.push([1350, p, 1.45, 0, 1], [1700, shift(p, -12, -34), 1.25, -28, 0]);
  steps(s, thrown, 0, list);
  // a crack under the blade, wood chips flying
  const cut = shift(at, 0, 2);
  steps(s, s.add('tf-svg tf-decal', crackSvg(), { width: '74px', height: '48px' }), 0, [
    [0, cut, 0.5, 0, 0],
    [60, cut, 1.08, 0, 1],
    [130, cut, 1, 0, 1],
    [1500, cut, 1, 0, 1],
    [1850, cut, 1, 0, 0],
  ]);
  burst(s, at, {
    count: 13,
    make: () => blob(s, pick(['#c58b52', '#a86d3b', '#e2b07a', '#7a4a22']), between(4, 8), between(2, 4), false),
    angle: [-172, -8],
    speed: [220, 470],
    gravity: 1200,
    life: [600, 900],
    spin: 720,
    grow: [1, 0.8],
    delay: 20,
  });
  streaks(s, at, 6, 26, 52, 10, '#ffe7b0');
  quake(s, target, 4, 320, t);
  return 1900;
};

export const chappal: Impact = (h) => {
  const { s, at, target, thrown, dir } = h;
  const t = contact(h, { stop: 70, glow: 'rgba(255, 255, 255, 0.9)', push: 15, keep: true });
  s.later(() => throwSfx.chappal(at.x), 0);
  feel(h, [30]);
  // SLAP: it lands flat and big, then bounces off and drops away
  const side = dir.x >= 0 ? 1 : -1;
  steps(s, thrown, 0, [
    [0, at, [1.65, 1.4], -18, 1],
    [t, at, [1.6, 1.36], -18, 1],
    [t + 260, shift(at, side * 34, -64), 1.25, -18 + side * 190, 1],
    [t + 520, shift(at, side * 58, -40), 1.15, -18 + side * 300, 1],
    [t + 900, shift(at, side * 78, 70), 1, -18 + side * 420, 0],
  ]);
  // the red mark it leaves
  steps(s, s.add('tf-svg tf-decal', slapMarkSvg(), { width: '30px', height: '54px' }), 20, [
    [0, at, [1.5, 1.3], -18, 0],
    [60, at, [1.6, 1.36], -18, 0.6],
    [1100, at, [1.6, 1.36], -18, 0.45],
    [1600, at, [1.6, 1.36], -18, 0],
  ]);
  // the seat squashes sideways
  if (target) {
    s.run(target, [{ scale: '1' }, { scale: '0.8 1.12', offset: 0.2 }, { scale: '1.08 0.95', offset: 0.5 }, { scale: '0.98 1.02', offset: 0.75 }, { scale: '1' }], {
      duration: 540,
      fill: 'none',
    });
  }
  streaks(s, at, 8, 30, 64, 0);
  word(s, shift(at, 0, -HERO * 0.6), 'THAPP!', '#ffffff', '#e5383b', 30, -10, 650);
  return t + 1550;
};

export const punch: Impact = (h) => {
  const { s, at, target, dir } = h;
  const t = contact(h, { stop: 95, glow: 'rgba(255, 210, 60, 0.95)', push: 22, squash: [1.3, 0.85] });
  s.later(() => throwSfx.punch(at.x), 0);
  feel(h, [45]);
  // a comic POW burst behind the fist
  steps(s, s.add('tf-svg tf-decal', burstSvg(), { width: '150px', height: '150px' }), 10, [
    [0, at, 0.3, 0, 1],
    [90, at, 1.15, 8, 1],
    [160, at, 1, 0, 1],
    [650, at, 1.04, 4, 1],
    [850, at, 1.2, 8, 0],
  ]);
  const { el, anim } = hero(h, '👊');
  // the fist winds back and lands the blow
  if (anim) s.later(() => playParts(anim, [[18, 45, 1.3]]), t);
  steps(s, el, t, [
    [0, shift(at, -dir.x * 12, -dir.y * 12), 0.8, 0, 0],
    [90, shift(at, dir.x * 14, dir.y * 14), 1.25, 0, 1],
    [180, at, 1.05, 0, 1],
    [560, at, 1, 0, 1],
    [800, shift(at, dir.x * 10, dir.y * 10), 0.7, 0, 0],
  ]);
  streaks(s, at, 10, 40, 80, 20, '#fff6c2');
  word(s, shift(at, 0, -HERO * 0.62), 'DHISHOOM!', '#ffd400', '#d62828', t + 30, -8, 600);
  quake(s, target, 6, 520, t);
  // dizzy stars circle the head
  orbit(s, shift(at, 0, -HERO * 0.32), () => s.add('tf-svg', starSvg('#ffd84d'), { width: '19px', height: '19px' }), 4, 36, 10, 1350, t + 450, 2);
  return t + 1850;
};
