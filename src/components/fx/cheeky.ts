import { throwSfx } from '../../lib/throwSounds';
import { contact, flash, hero, HERO, ring, steps, twinkle, word, type Impact, type Step } from './hit';
import { playParts } from './lottie';
import { HAND_PIVOT, handSvg } from './props';
import { dropSvg, heartSvg, sparkSvg } from './shapes';
import { between, blob, burst, pick, place, quake, shift, type Point, type Stage } from './stage';

const CLOWN = ['#ff4d4d', '#ffd43b', '#4dabf7', '#51cf66', '#cc5de8', '#ff922b', '#ffffff'];
const sparkle = (s: Stage, color: string, size = 15) => s.add('tf-svg', sparkSvg(color), { width: `${size}px`, height: `${size}px` });

/** a quick pop that twinkles and is gone */
function glint(s: Stage, p: Point, delay: number, color = '#ffffff'): void {
  steps(s, sparkle(s, color, 14), delay, [
    [0, p, 0, 0, 0],
    [120, p, 1.1, 25, 1],
    [260, p, 0, 50, 0],
  ]);
}

export const scream: Impact = (h) => {
  const { s, at, target } = h;
  const t = contact(h, { stop: 50, glow: 'rgba(120, 190, 255, 0.9)', push: 6 });
  s.later(() => throwSfx.scream(at.x), 0);
  const { el, anim } = hero(h, '😱');
  if (anim) s.later(() => playParts(anim, [[14, 92, 1.3]]), t);
  // trembles with fright the whole time it screams
  const list: Step[] = [
    [0, at, 0.5, 0, 0],
    [140, at, 1.15, 0, 1],
    [220, at, 1.08, 0, 1],
  ];
  for (let i = 1; i <= 18; i++) list.push([220 + i * 55, shift(at, between(-2.5, 2.5), between(-2, 2)), 1.1, between(-3, 3), 1]);
  list.push([1300, at, 1.05, 0, 1], [1600, shift(at, 0, -12), 0.75, 0, 0]);
  steps(s, el, t, list, 'linear');
  // a cold shiver: pale blue ripples and a shaking seat
  [0, 260, 520].forEach((ms) => ring(s, at, 'rgba(160, 215, 255, 0.95)', 2.4, t + ms, 520));
  flash(s, at, 'rgba(120, 190, 255, 0.6)', 170, t, 1100);
  quake(s, target, 2.5, 950, t);
  // hair standing on end: shock lines flicker over the head
  const r = HERO * 0.55;
  for (let j = 0; j < 7; j++) {
    const base = `${place(at)} rotate(${(j - 3) * 24}deg)`;
    s.toss(
      s.add('tf-line', '', { background: '#d0ebff', height: '18px' }),
      [
        { transform: `${base} translateY(-${r}px) scaleY(0.4)`, opacity: 0 },
        { transform: `${base} translateY(-${r + 6}px) scaleY(1.3)`, opacity: 1, offset: 0.15 },
        { transform: `${base} translateY(-${r + 2}px) scaleY(0.9)`, opacity: 0.5, offset: 0.35 },
        { transform: `${base} translateY(-${r + 8}px) scaleY(1.3)`, opacity: 1, offset: 0.55 },
        { transform: `${base} translateY(-${r + 4}px) scaleY(1)`, opacity: 0.6, offset: 0.75 },
        { transform: `${base} translateY(-${r + 12}px) scaleY(0.5)`, opacity: 0 },
      ],
      { duration: 950, delay: t + 80 + j * 20, easing: 'linear' },
    );
  }
  // a bead of cold sweat runs down
  const drop = shift(at, HERO * 0.36, -HERO * 0.3);
  steps(s, s.add('tf-svg', dropSvg('#74c0fc'), { width: '13px', height: '13px' }), t + 250, [
    [0, drop, 0, 0, 0],
    [150, drop, 1, 0, 1],
    [800, shift(drop, 2, 26), 1, 0, 1],
    [1000, shift(drop, 2, 34), 0.8, 0, 0],
  ]);
  word(s, shift(at, 0, -HERO * 0.62), 'AAAA!', '#e7f5ff', '#1c7ed6', t + 60, -6, 650);
  return t + 1650;
};

export const plead: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 150, 190, 0.9)', push: 3, squash: [1.25, 0.85] });
  s.later(() => throwSfx.plead(at.x), t);
  const { el, anim } = hero(h, '🥺');
  if (anim) s.later(() => playParts(anim, [[0, 205, 1.5]], true), t);
  // leans in and swells, swaying as if begging
  steps(s, el, t, [
    [0, at, 0.5, 0, 0],
    [150, at, 1.12, 0, 1],
    [260, at, 1, 0, 1],
    [600, shift(at, 0, -3), 1.1, -5, 1],
    [950, at, 1.16, 5, 1],
    [1300, shift(at, 0, -3), 1.2, -4, 1],
    [1500, at, 1.18, 0, 1],
    [1800, shift(at, 0, -14), 0.8, 0, 0],
  ]);
  flash(s, at, 'rgba(255, 140, 190, 0.55)', 190, t, 1500);
  // the big wet eyes shine
  [300, 750, 1200].forEach((ms, k) => [-1, 1].forEach((side) => glint(s, shift(at, side * HERO * 0.19 - 3, -HERO * 0.05), t + ms + k * 20)));
  burst(s, at, {
    count: 7,
    make: (i) => {
      const size = `${between(10, 16)}px`;
      return s.add('tf-svg', heartSvg(['#ff8fab', '#ff4d6d', '#ffc2d1'][i % 3]), { width: size, height: size });
    },
    angle: [-160, -20],
    speed: [90, 200],
    gravity: -110,
    drag: 2,
    life: [1100, 1500],
    spin: 30,
    grow: [0.5, 1],
    delay: t + 200,
  });
  twinkle(s, at, () => sparkle(s, pick(['#ffd6e8', '#ffffff'])), 5, 62, t + 150, 1200);
  word(s, shift(at, 0, -HERO * 0.66), 'Pleaseee 🥺', '#ffe3ee', '#d6336c', t + 150, -5, 800);
  return t + 1850;
};

export const pray: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 215, 110, 0.9)', push: 3 });
  s.later(() => throwSfx.pray(at.x), t);
  // soft golden rays turn slowly behind the hands
  steps(s, s.add('tf-rays tf-decal'), t, [
    [0, at, 0.4, 0, 0],
    [300, at, 1, 20, 0.85],
    [1500, at, 1.05, 100, 0.85],
    [1900, at, 1.15, 130, 0],
  ], 'linear');
  flash(s, at, 'rgba(255, 210, 100, 0.6)', 180, t, 1600);
  const { el, anim } = hero(h, '🙏');
  if (anim) s.later(() => playParts(anim, [[0, 119, 1]], true), t);
  // bows twice, humbly
  const down = shift(at, 0, 8);
  steps(s, el, t, [
    [0, at, 0.5, 0, 0],
    [150, at, 1.15, 0, 1],
    [260, at, 1, 0, 1],
    [460, down, [1.06, 0.88], 0, 1],
    [660, at, 1, 0, 1],
    [760, at, 1, 0, 1],
    [960, down, [1.06, 0.88], 0, 1],
    [1160, at, 1, 0, 1],
    [1500, at, 1, 0, 1],
    [1800, shift(at, 0, -14), 0.75, 0, 0],
  ]);
  [460, 960].forEach((ms) => ring(s, at, 'rgba(255, 220, 120, 0.85)', 2, t + ms, 520));
  twinkle(s, at, () => sparkle(s, pick(['#ffd84d', '#fff3bf'])), 7, 62, t + 100, 1300);
  word(s, shift(at, 0, -HERO * 0.66), 'Plz yaar!', '#fff3bf', '#b7791f', t + 120, -5, 800);
  return t + 1900;
};

export const tease: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 120, 170, 0.85)', push: 4 });
  s.later(() => throwSfx.tease(at.x), t);
  const { el, anim } = hero(h, '😝');
  if (anim) s.later(() => playParts(anim, [[14, 95, 1.1]]), t);
  // the face rocks side to side, tongue out
  const face: Step[] = [
    [0, at, 0.5, 0, 0],
    [150, at, 1.15, 0, 1],
    [240, at, 1, 0, 1],
  ];
  for (let i = 0; i < 9; i++) face.push([300 + i * 120, at, 1.02, i % 2 ? 6 : -6, 1]);
  face.push([1450, at, 1, 0, 1], [1750, shift(at, 0, -12), 0.75, 0, 0]);
  steps(s, el, t, face);
  // both hands up, thumbs on the temples, fingers flapping: "nyah nyah"
  [-1, 1].forEach((side) => {
    const hand = s.add('tf-svg', handSvg(), { width: '52px', height: '52px', transformOrigin: HAND_PIVOT });
    // the pivot is the thumb tip, 21.7px right of and 6.5px below the box centre
    const p = shift(at, side * HERO * 0.4 - 21.7, -HERO * 0.16 - 6.5);
    // the drawing is a left hand (thumb pointing right); the right one is mirrored and flaps the other way
    const m = side < 0 ? 1 : -1;
    const sc = (k: number): [number, number] => [m * k, k];
    const list: Step[] = [
      [0, p, sc(0.2), 30 * m, 0],
      [140, p, sc(1.15), 0, 1],
      [220, p, sc(1), 0, 1],
    ];
    for (let i = 0; i < 16; i++) list.push([280 + i * 70, p, sc(1), (i % 2 ? 1 : -1) * 16 * m, 1]);
    list.push([1420, p, sc(1), 0, 1], [1600, p, sc(0.3), 30 * m, 0]);
    steps(s, hand, t + 80, list);
  });
  word(s, shift(at, 0, -HERO * 0.7), 'BLEHH!', '#ffffff', '#e64980', t + 200, -8, 700);
  return t + 1800;
};

export const clown: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 45, glow: 'rgba(255, 100, 120, 0.85)', push: 5 });
  s.later(() => throwSfx.clown(at.x), t);
  const { el, anim } = hero(h, '🤡');
  if (anim) s.later(() => playParts(anim, [[0, 137, 1.2]], true), t);
  // pops up on a spring, then bounces about
  steps(s, el, t, [
    [0, at, 0.2, 0, 0],
    [130, at, [1.3, 0.8], 0, 1],
    [240, at, [0.85, 1.2], 0, 1],
    [340, at, [1.12, 0.9], 0, 1],
    [430, at, [0.96, 1.05], 0, 1],
    [500, at, 1, 0, 1],
    [640, shift(at, 0, -22), [0.95, 1.08], -8, 1],
    [780, at, [1.15, 0.85], 0, 1],
    [880, at, 1, 0, 1],
    [1010, shift(at, 0, -14), [0.97, 1.05], 8, 1],
    [1130, at, [1.1, 0.9], 0, 1],
    [1220, at, 1, 0, 1],
    [1450, at, 1, 0, 1],
    [1750, shift(at, 0, -12), 0.75, 0, 0],
  ]);
  // a pop of bright dots
  burst(s, at, {
    count: 26,
    make: (i) => blob(s, CLOWN[i % CLOWN.length], between(6, 11)),
    speed: [240, 500],
    gravity: 700,
    drag: 2.6,
    life: [700, 1000],
    grow: [1, 0.6],
    delay: t,
  });
  // the red nose honks twice
  const nose = shift(at, 0, HERO * 0.06);
  [0, 200].forEach((ms) => ring(s, nose, '#ff6b6b', 1.4, t + ms, 300));
  ring(s, at, '#ffd43b', 2.2, t, 420);
  word(s, shift(at, 0, -HERO * 0.66), 'JOKER!', '#ffd43b', '#d6336c', t + 120, -8, 750);
  return t + 1800;
};
