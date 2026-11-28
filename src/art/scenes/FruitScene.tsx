// Fruit Slice Duel: a white plate with a watermelon, four talwars pointing in, a cut orange flying and a magnet, festive bunting
import { SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

/** a talwar: hilt at (0,0), curved blade along +x; flip mirrors the curve */
function Talwar({ id, x, y, rot, grip, flip, s = 1 }: { id: IdFn; x: number; y: number; rot: number; grip: string; flip?: boolean; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s} ${flip ? -s : s})`}>
      <path d="M7-2.6C40-3 70-6 100-19C94-11 78-2 50 2.5C35 4.6 20 4.6 7 4.2Z" fill="#16052e" opacity="0.25" transform="translate(2 6)" />
      <path d="M7-2.6C40-3 70-6 100-19C94-11 78-2 50 2.5C35 4.6 20 4.6 7 4.2Z" fill={url(id('steel'))} stroke="#6f7b8a" strokeWidth="0.7" />
      <path d="M9-0.6C40-1 66-4 92-14" stroke="#fff" strokeWidth="1.3" strokeOpacity="0.95" fill="none" strokeLinecap="round" />
      <path d="M12 2.6C40 2.2 66-1 90-11" stroke="#8a96a6" strokeWidth="0.6" fill="none" />
      <path d="M-14 8C-6 13 3 12 4 6" stroke={url(id('gold'))} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="2" y="-8.5" width="6" height="17" rx="3" fill={url(id('gold'))} stroke="#8a5a00" strokeWidth="0.6" />
      <rect x="-17" y="-3.4" width="19" height="6.8" rx="3.2" fill={grip} stroke="#0003" strokeWidth="0.6" />
      <path d="M-15-1.6H0" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
      {[-12, -7, -2].map((g) => (
        <path key={g} d={`M${g}-3.2l2 6.4`} stroke="#0004" strokeWidth="0.8" />
      ))}
      <ellipse cx="-19" rx="3.2" ry="6.5" fill={url(id('gold'))} stroke="#8a5a00" strokeWidth="0.6" />
      <circle cx="-19.6" cy="-2" r="1.2" fill="#fff" opacity="0.7" />
    </g>
  );
}

/** a small red horseshoe magnet with silver tips */
function Magnet({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M-8-9V1A8 8 0 0 0 8 1V-9" stroke="#16052e" strokeOpacity="0.3" strokeWidth="7" fill="none" transform="translate(2 4)" />
      <path d="M-8-9V1A8 8 0 0 0 8 1V-9" stroke="#e8213a" strokeWidth="7" fill="none" />
      <path d="M-9.5-6V1A9.5 9.5 0 0 0 0 10.5" stroke="#ff8a99" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <rect x="-11.5" y="-15" width="7" height="7" rx="1" fill="#e9eef3" stroke="#7d8896" strokeWidth="0.6" />
      <rect x="4.5" y="-15" width="7" height="7" rx="1" fill="#e9eef3" stroke="#7d8896" strokeWidth="0.6" />
      <path d="M-14-19l-3-3M0-20v-4M14-19l3-3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
    </g>
  );
}

const FLAGS = ['#ff3b4e', '#ffc531', '#25c26e', '#2f8bff', '#ff7a1a', '#c04bff'];
const BOKEH: [number, number, number, string][] = [[52, 120, 16, '#ffe36e'], [276, 96, 13, '#7ef0ff'], [96, 176, 10, '#ff9ad1'], [238, 170, 12, '#fff'], [30, 72, 8, '#fff']];

export function FruitScene({ id, colors }: SceneProps) {
  const flags = Array.from({ length: 11 }, (_, i) => {
    const t = (i + 0.5) / 11;
    const x = 6 + 308 * t;
    const y = (1 - t) * (1 - t) * 8 + 2 * t * (1 - t) * 34 + t * t * 8;
    return <path key={i} d={`M${x - 7} ${y}L${x + 7} ${y}L${x} ${y + 13}Z`} fill={FLAGS[i % FLAGS.length]} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" />;
  });
  const px = 160;
  const py = 126;
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        <linearGradient id={id('steel')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#dfe6ee" />
          <stop offset="1" stopColor="#8794a5" />
        </linearGradient>
        <linearGradient id={id('gold')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="0.5" stopColor="#f5b800" />
          <stop offset="1" stopColor="#b87a00" />
        </linearGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d99a5b" />
          <stop offset="1" stopColor="#8a4f1c" />
        </linearGradient>
        <linearGradient id={id('rimSide')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4f1c" />
          <stop offset="1" stopColor="#4e2a0c" />
        </linearGradient>
        <radialGradient id={id('plate')} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe4ec" />
        </radialGradient>
        <radialGradient id={id('melon')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#9ef07a" />
          <stop offset="0.55" stopColor="#36a83f" />
          <stop offset="1" stopColor="#145c1f" />
        </radialGradient>
        <radialGradient id={id('orange')} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#f07800" />
        </radialGradient>
        <radialGradient id={id('pulp')} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="1" stopColor="#ffb02e" />
        </radialGradient>
        <linearGradient id={id('slash')} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id={id('warm')}>
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('mclip')}>
          <ellipse cx={px} cy={py - 22} rx="27" ry="25" />
        </clipPath>
      </defs>
      <g opacity="0.12">
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${px} ${py - 20}L${px - 30} -200L${px + 30} -200Z`} fill="#fff" transform={`rotate(${i * 30} ${px} ${py - 20})`} />
        ))}
      </g>
      <ellipse cx={px} cy={py - 20} rx="130" ry="95" fill={url(id('warm'))} />
      {BOKEH.map(([x, y, r, c]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill={c} opacity="0.22" />
      ))}
      <path d="M6 8Q160 60 314 8" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" fill="none" />
      {flags}
      {/* the plate on its wooden rim */}
      <ellipse cx={px + 5} cy={py + 14} rx="76" ry="30" fill="#16052e" opacity="0.4" />
      <ellipse cx={px} cy={py + 8} rx="72" ry="30" fill={url(id('rimSide'))} />
      <ellipse cx={px} cy={py} rx="72" ry="30" fill={url(id('rim'))} />
      <ellipse cx={px} cy={py} rx="72" ry="30" fill="none" stroke="#ffd9a8" strokeOpacity="0.6" strokeWidth="1" />
      <ellipse cx={px} cy={py} rx="63" ry="25" fill={url(id('plate'))} />
      <ellipse cx={px} cy={py + 1} rx="46" ry="17" fill="none" stroke="#c9d2de" strokeWidth="1.4" />
      <path d={`M${px - 52} ${py - 8}Q${px - 30} ${py - 22} ${px + 10} ${py - 24}`} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* a watermelon sitting on the plate */}
      <ellipse cx={px + 3} cy={py + 1} rx="26" ry="7" fill="#16052e" opacity="0.25" />
      <ellipse cx={px} cy={py - 22} rx="27" ry="25" fill={url(id('melon'))} />
      <g clipPath={url(id('mclip'))} opacity="0.55">
        {[-18, -6, 6, 18].map((d) => (
          <path key={d} d={`M${px + d * 0.6} ${py - 48}Q${px + d * 1.6} ${py - 22} ${px + d * 0.6} ${py + 4}`} stroke="#0d4a17" strokeWidth="4.5" fill="none" />
        ))}
      </g>
      <ellipse cx={px - 9} cy={py - 35} rx="9" ry="5" fill="#fff" opacity="0.55" transform={`rotate(-28 ${px - 9} ${py - 35})`} />
      <path d={`M${px} ${py - 47}q2-5 6-6`} stroke="#5b3a12" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* the four talwars, one per player */}
      <Talwar id={id} x={38} y={50} rot={27} grip="#ff3b4e" s={0.95} />
      <Talwar id={id} x={40} y={178} rot={-27} grip="#25c26e" flip s={0.95} />
      <Talwar id={id} x={282} y={50} rot={153} grip="#2f8bff" flip s={0.95} />
      <Talwar id={id} x={280} y={178} rot={207} grip="#ffc531" s={0.95} />
      {/* a cut orange flying off with a slash */}
      <path d="M150 64L238 22" stroke={url(id('slash'))} strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(206 44) rotate(-24)" filter={url(id('shadow'))}>
        <circle r="14" fill={url(id('orange'))} />
        <circle r="11.5" fill={url(id('pulp'))} />
        {[0, 45, 90, 135].map((a) => (
          <path key={a} d="M-11 0H11" stroke="#fff8e0" strokeWidth="1" transform={`rotate(${a})`} />
        ))}
        <circle r="2" fill="#fff8e0" />
      </g>
      <g transform="translate(184 32) rotate(150)">
        <circle r="12" fill={url(id('orange'))} />
        <ellipse cx="-4" cy="-4" rx="4" ry="2.4" fill="#fff" opacity="0.5" transform="rotate(-30 -4 -4)" />
      </g>
      {[[226, 56, 2.4], [232, 40, 1.6], [190, 58, 1.8]].map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#ffb02e" />
      ))}
      <Magnet x={270} y={120} rot={18} />
      <Spark x={110} y={46} r={7} />
      <Spark x={252} y={150} r={5} fill="#fff6c2" />
      <Spark x={64} y={110} r={5} />
    </g>
  );
}
