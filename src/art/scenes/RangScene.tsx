// Rang: a fan of red, blue, green and yellow colour cards with a wild on top
import type { ReactNode } from 'react';
import { ART_FONT, Card, SceneBg, Spark, url, type IdFn, type SceneProps } from './common';

const W = 72;
const H = 104;
const COLOURS: { k: string; from: string; to: string; mark: string }[] = [
  { k: 'r', from: '#ff6b6b', to: '#d81b3a', mark: '5' },
  { k: 'b', from: '#5ab4ff', to: '#1d4fd8', mark: '+2' },
  { k: 'g', from: '#5fe39a', to: '#119a55', mark: '9' },
  { k: 'y', from: '#ffe27a', to: '#f0a000', mark: 'skip' },
];

/** a rounded-diamond badge in the middle of a colour card with a soft inner glow, holding its mark */
function Badge({ colour, children }: { colour: string; children: ReactNode }) {
  const cx = W / 2;
  const cy = H / 2;
  const r = 27;
  const k = 6;
  const d = `M${cx} ${cy - r + k}Q${cx} ${cy - r} ${cx + k} ${cy - r + k}L${cx + r - k} ${cy - k}Q${cx + r} ${cy} ${cx + r - k} ${cy + k}L${cx + k} ${cy + r - k}Q${cx} ${cy + r} ${cx - k} ${cy + r - k}L${cx - r + k} ${cy + k}Q${cx - r} ${cy} ${cx - r + k} ${cy - k}Z`;
  return (
    <g>
      <path d={d} fill="#fff" />
      <circle cx={cx} cy={cy} r="15" fill={colour} opacity="0.12" />
      <path d={d} fill="none" stroke={colour} strokeOpacity="0.25" strokeWidth="3" transform={`translate(${cx} ${cy}) scale(0.84) translate(${-cx} ${-cy})`} />
      <g fill={colour} stroke={colour}>{children}</g>
    </g>
  );
}

function Mark({ mark, colour }: { mark: string; colour: string }) {
  if (mark === 'skip') {
    return (
      <Badge colour={colour}>
        <circle cx={W / 2} cy={H / 2} r="10" fill="none" strokeWidth="4.5" />
        <path d={`M${W / 2 - 7} ${H / 2 + 7}L${W / 2 + 7} ${H / 2 - 7}`} strokeWidth="4.5" strokeLinecap="round" />
      </Badge>
    );
  }
  return (
    <Badge colour={colour}>
      <text x={W / 2} y={H / 2 + (mark.length > 1 ? 8 : 10)} fontFamily={ART_FONT} fontWeight="900" fontSize={mark.length > 1 ? 21 : 28} textAnchor="middle" stroke="none">
        {mark}
      </text>
    </Badge>
  );
}

/** the wild: a four-blade pinwheel star in the four colours around a glowing hub */
function Wild({ id }: { id: IdFn }) {
  const cx = W / 2;
  const cy = H / 2;
  const blades = ['#ff3b4e', '#2f8bff', '#25c26e', '#ffc531'];
  const blade = `M${cx} ${cy}Q${cx + 6} ${cy - 16} ${cx} ${cy - 30}Q${cx + 16} ${cy - 18} ${cx + 13} ${cy - 3}Z`;
  return (
    <>
      <defs>
        <radialGradient id={id('wildHub')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r="30" fill={url(id('wildHub'))} opacity="0.35" />
      {blades.map((c, i) => (
        <path key={c} d={blade} fill={c} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" transform={`rotate(${i * 90} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r="7" fill="#fff" />
      <text x={cx} y={cy + 4} fontFamily={ART_FONT} fontWeight="900" fontSize="10" textAnchor="middle" fill="#1d1250">W</text>
      <text x="8" y="20" fontFamily={ART_FONT} fontWeight="900" fontSize="13" fill="#fff">W</text>
    </>
  );
}

export function RangScene({ id, colors }: SceneProps) {
  const shadow = url(id('shadow'));
  const sheen = url(id('sheen'));
  const angles = [-36, -18, 0, 18];
  return (
    <g>
      <SceneBg id={id} colors={colors} />
      <defs>
        {COLOURS.map((c) => (
          <linearGradient key={c.k} id={id(`rc-${c.k}`)} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c.from} />
            <stop offset="1" stopColor={c.to} />
          </linearGradient>
        ))}
        <linearGradient id={id('wild')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2a8a" />
          <stop offset="1" stopColor="#120b2e" />
        </linearGradient>
        <radialGradient id={id('halo')} cx="0.5" cy="0.6" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="160" cy="110" rx="140" ry="90" fill={url(id('halo'))} />
      {COLOURS.map((c, i) => (
        <g key={c.k} transform={`rotate(${angles[i]} 160 250)`}>
          <Card x={124} y={40} w={W} h={H} fill={url(id(`rc-${c.k}`))} shadow={shadow} sheen={sheen}>
            <text x="8" y="20" fontFamily={ART_FONT} fontWeight="900" fontSize="13" fill="#fff">{c.mark === 'skip' ? '⦸' : c.mark}</text>
            <Mark mark={c.mark} colour={c.to} />
          </Card>
        </g>
      ))}
      <g transform="rotate(36 160 250)">
        <Card x={124} y={36} w={W} h={H} fill={url(id('wild'))} shadow={shadow} sheen={sheen}>
          <Wild id={id} />
        </Card>
      </g>
      <Spark x={262} y={40} r={10} fill="#ffe27a" />
      <Spark x={48} y={44} r={8} />
      <Spark x={290} y={120} r={5} />
      <Spark x={34} y={150} r={6} fill="#bff6ff" />
    </g>
  );
}
