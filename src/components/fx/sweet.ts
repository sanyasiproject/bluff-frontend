import { throwSfx } from '../../lib/throwSounds';
import { contact, flash, hero, HERO, ring, steps, twinkle, type Impact, type Step } from './hit';
import { clip, playParts } from './lottie';
import { curlSvg, dropSvg, heartSvg, petalSvg, sparkSvg } from './shapes';
import { between, burst, pick, place, shift, type Point, type Stage } from './stage';

const CONFETTI = ['#f6c453', '#3ccf91', '#ff6b81', '#7cc4ff', '#ffffff', '#c792ff', '#ff9f1c'];
const sparkle = (s: Stage, color = '#ffd84d', size = 16) => s.add('tf-svg', sparkSvg(color), { width: `${size}px`, height: `${size}px` });

/** a gentle sway in place after popping in; ends faded and a little higher */
function present(at: Point, hold: number, sway: number, big = 1): Step[] {
  const list: Step[] = [
    [0, at, 0.5, 0, 0],
    [150, at, 1.25 * big, -sway / 2, 1],
    [260, at, big, 0, 1],
  ];
  for (let ms = 260, i = 0; ms + 340 < hold; ms += 340, i++) list.push([ms + 340, shift(at, 0, i % 2 ? 0 : -4), big * (i % 2 ? 1 : 1.07), i % 2 ? -sway : sway, 1]);
  const last = list[list.length - 1][0];
  list.push([last + 180, at, big, 0, 1], [last + 480, shift(at, 0, -18), big * 0.7, 0, 0]);
  return list;
}

export const rose: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 50, glow: 'rgba(255, 110, 150, 0.9)', push: 5, squash: [1.3, 0.85] });
  s.later(() => throwSfx.rose(at.x), 0);
  const { el, anim } = hero(h, '🌹');
  if (anim) s.later(() => playParts(anim, [[0, 143, 1.1]]), t);
  const list = present(at, 1500, 7);
  steps(s, el, t, list);
  flash(s, at, 'rgba(255, 90, 140, 0.55)', 190, t, 1100);
  // petals burst out and flutter down like paper
  burst(s, at, {
    count: 14,
    make: (i) => {
      const size = `${between(18, 28)}px`;
      return s.add('tf-svg', petalSvg(i % 3 ? '#e5383b' : '#ff5d73', '#a4161a'), { width: size, height: size });
    },
    speed: [160, 330],
    gravity: 240,
    drag: 2.6,
    life: [1300, 1900],
    spin: 420,
    flutter: true,
    grow: [0.5, 1],
    fade: 0.65,
    delay: t,
  });
  twinkle(s, at, () => sparkle(s), 7, 58, t + 80, 1200);
  return t + list[list.length - 1][0] + 80;
};

export const kiss: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 50, glow: 'rgba(255, 80, 130, 0.9)', push: 5, squash: [1.35, 0.8] });
  s.later(() => throwSfx.kiss(at.x), 0);
  const lips = hero(h, '💋');
  if (lips.anim) s.later(() => playParts(lips.anim!, [[0, 119, 1.3]]), t);
  // the lips stamp onto the seat, then pucker
  steps(s, lips.el, t, [
    [0, at, 1.7, 0, 0],
    [90, at, [1.18, 0.82], 0, 1],
    [200, at, 1.06, 0, 1],
    [300, at, 1, 0, 1],
    [1350, at, 1, 0, 1],
    [1650, shift(at, 0, -10), 0.7, 0, 0],
  ]);
  // a big beating heart rises from behind the lips
  const big = clip(s, 'heart', 70);
  const up = shift(at, 0, -48);
  s.later(() => {
    throwSfx.heart(at.x);
    const el = big.anim ? big.box : s.add('tf-svg', heartSvg('#ff3b5c'), { width: '64px', height: '64px' });
    if (big.anim) playParts(big.anim, [[0, 109, 1.5]], true);
    steps(s, el, 0, [
      [0, at, 0.3, 0, 0],
      [220, up, 1.2, -6, 1],
      [380, up, 1, 0, 1],
      [1000, shift(up, 6, -18), 1.05, 6, 1],
      [1350, shift(up, 0, -40), 0.6, 0, 0],
    ]);
  }, t + 330);
  burst(s, at, {
    count: 10,
    make: (i) => s.add('tf-svg', heartSvg(['#ff4d6d', '#ff8fab', '#e5383b'][i % 3]), { width: `${between(14, 22)}px`, height: `${between(14, 22)}px` }),
    angle: [-165, -15],
    speed: [120, 260],
    gravity: -140,
    drag: 2,
    life: [1100, 1600],
    spin: 40,
    grow: [0.5, 1],
    delay: t + 100,
  });
  return t + 330 + 1400;
};

export const clap: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 200, 60, 0.9)', push: 4 });
  s.later(() => throwSfx.clap(at.x), 0);
  const { el, anim } = hero(h, '👏');
  if (anim) s.later(() => playParts(anim, [[0, 43, 1.35]], true), t);
  // bobs with every clap
  const list: Step[] = [
    [0, at, 0.5, 0, 0],
    [150, at, 1.2, 0, 1],
  ];
  for (let i = 0; i < 5; i++) list.push([300 + i * 280, at, 1.12, i % 2 ? 6 : -6, 1], [440 + i * 280, at, 1, 0, 1]);
  list.push([1600, shift(at, 0, -16), 0.7, 0, 0]);
  steps(s, el, t, list);
  // a burst of lines and a ring on each clap
  for (let i = 0; i < 5; i++) {
    const delay = t + 60 + i * 280;
    ring(s, at, i % 2 ? '#fff' : '#ffd84d', 1.9, delay, 360);
    for (let j = 0; j < 8; j++) {
      const deg = j * 45 + i * 22;
      const line = s.add('tf-line', '', { background: j % 2 ? '#fff' : '#ffd84d' });
      s.toss(
        line,
        [
          { transform: `${place(at)} rotate(${deg}deg) translateY(-${HERO * 0.45}px) scaleY(0.6)`, opacity: 0 },
          { transform: `${place(at)} rotate(${deg}deg) translateY(-${HERO * 0.6}px) scaleY(1)`, opacity: 1, offset: 0.3 },
          { transform: `${place(at)} rotate(${deg}deg) translateY(-${HERO * 0.82}px) scaleY(0.3)`, opacity: 0 },
        ],
        { duration: 300, delay, easing: 'ease-out' },
      );
    }
  }
  twinkle(s, at, () => sparkle(s, pick(['#ffd84d', '#fff'])), 6, 62, t + 100, 1200);
  return t + 1680;
};

export const party: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(124, 196, 255, 0.9)', push: 4 });
  const { el, anim } = hero(h, '🎉');
  if (anim) s.later(() => playParts(anim, [[0, 91, 1.15]]), t);
  // leans back, then kicks as it pops
  steps(s, el, t, [
    [0, at, 0.5, 0, 0],
    [150, at, 1.15, 0, 1],
    [260, at, [1.05, 0.95], -16, 1],
    [330, at, [1.25, 1.1], 12, 1],
    [500, at, 1, 0, 1],
    [1350, at, 1, 0, 1],
    [1650, shift(at, 0, -16), 0.7, 0, 0],
  ]);
  const pop = t + 310;
  s.later(() => throwSfx.party(at.x), pop);
  const mouth = shift(at, -8, -HERO * 0.25);
  // seats near the top have little room above: a wider, softer pop so the confetti stays on screen
  const room = Math.min(1, Math.max(0.4, (mouth.y - 30) / 300));
  flash(s, mouth, 'rgba(255, 230, 140, 0.9)', 100, pop, 260);
  burst(s, mouth, {
    count: 46,
    make: (i) =>
      i % 6 === 0
        ? s.add('tf-svg', curlSvg(CONFETTI[i % CONFETTI.length]), { width: '22px', height: '16px' })
        : s.add('tf-bit', '', {
            width: `${between(6, 10)}px`,
            height: `${between(4, 7)}px`,
            background: CONFETTI[i % CONFETTI.length],
            borderRadius: i % 4 === 0 ? '50%' : '2px',
          }),
    angle: room < 1 ? [-178, -2] : [-150, -30],
    speed: [380 * room, 760 * room],
    gravity: 650,
    drag: 2.4,
    life: [1300, 1900],
    spin: 720,
    flutter: true,
    grow: [1, 1],
    fade: 0.72,
    delay: pop,
  });
  return pop + 1950;
};

export const laugh: Impact = (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 210, 80, 0.9)', push: 4 });
  s.later(() => throwSfx.laugh(at.x), t);
  const { el, anim } = hero(h, '😂');
  if (anim) s.later(() => playParts(anim, [[0, 117, 1.25]], true), t);
  // bounces with laughter, squashing on each landing
  const list: Step[] = [
    [0, at, 0.5, 0, 0],
    [150, at, 1.2, 0, 1],
  ];
  for (let i = 0; i < 4; i++) {
    const at0 = 250 + i * 300;
    list.push([at0 + 130, shift(at, 0, -14), 1.08, i % 2 ? 12 : -12, 1], [at0 + 260, at, [1.14, 0.88], 0, 1], [at0 + 300, at, 1, 0, 1]);
  }
  list.push([1600, at, 1, 0, 1], [1850, shift(at, 0, -16), 0.7, 0, 0]);
  steps(s, el, t, list);
  // tears squirt from both eyes
  for (let k = 0; k < 3; k++) {
    [-1, 1].forEach((side) =>
      burst(s, shift(at, side * HERO * 0.24, -HERO * 0.04), {
        count: 3,
        make: () => s.add('tf-svg', dropSvg('#5ec8ff'), { width: `${between(10, 14)}px`, height: `${between(10, 14)}px` }),
        angle: side < 0 ? [-175, -125] : [-55, -5],
        speed: [170, 300],
        gravity: 950,
        life: [480, 680],
        grow: [0.6, 1],
        delay: t + 150 + k * 360,
      }),
    );
  }
  ['HA', 'HA', 'HA!'].forEach((word, i) => {
    const from = shift(at, (i - 1) * 30, -HERO * 0.45);
    const turn = (i - 1) * 14;
    s.toss(
      s.text('tf-ha', word),
      [
        { transform: place(from, 0.4, turn), opacity: 0 },
        { transform: place(shift(from, 0, -16), 1.25, turn), opacity: 1, offset: 0.25 },
        { transform: place(shift(from, 0, -24), 1, turn), opacity: 1, offset: 0.6 },
        { transform: place(shift(from, 0, -52), 0.9, turn), opacity: 0 },
      ],
      { duration: 1000, delay: t + 200 + i * 260, easing: 'ease-out' },
    );
  });
  return t + 1900;
};

/** anything without its own effect: pop, glow, sparkles */
export const plain = (emoji: string): Impact => (h) => {
  const { s, at } = h;
  const t = contact(h, { stop: 40, glow: 'rgba(255, 255, 255, 0.8)', push: 4 });
  steps(s, s.text('tf-hero', emoji), t, present(at, 900, 6));
  twinkle(s, at, () => sparkle(s), 5, 55, t, 700);
  return t + 1500;
};
