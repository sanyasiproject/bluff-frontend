// A dartboard drawn in board units (scoring radius 1, y up), every ring from DART_RINGS: black surround, chrome number ring, sisal beds, raised wires
import { memo, type ReactElement } from 'react';
import { DART_NUMBERS, DART_RINGS } from '../../types';

/** the board's drawing reaches this far from the centre (board units) */
export const BOARD_SPAN = 1.34;

const pt = (r: number, deg: number): [number, number] => [Math.sin((deg * Math.PI) / 180) * r, -Math.cos((deg * Math.PI) / 180) * r];

function sector(r1: number, r2: number, a1: number, a2: number) {
  const [x1, y1] = pt(r2, a1);
  const [x2, y2] = pt(r2, a2);
  const [x3, y3] = pt(r1, a2);
  const [x4, y4] = pt(r1, a1);
  return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
}

const R = DART_RINGS;
const NUM_R = 1.16;

export const DartBoard = memo(function DartBoard() {
  const beds: ReactElement[] = [];
  const wires: ReactElement[] = [];
  const nums: ReactElement[] = [];
  DART_NUMBERS.forEach((n, i) => {
    const a1 = i * 18 - 9;
    const a2 = a1 + 18;
    const dark = i % 2 === 0;
    const bed = dark ? '#141416' : '#f1deb4';
    const ring = dark ? 'url(#db-red)' : 'url(#db-green)';
    beds.push(
      <g key={n}>
        <path d={sector(R.outerBull, R.trebleIn, a1, a2)} fill={bed} />
        <path d={sector(R.trebleIn, R.trebleOut, a1, a2)} fill={ring} />
        <path d={sector(R.trebleOut, R.doubleIn, a1, a2)} fill={bed} />
        <path d={sector(R.doubleIn, R.doubleOut, a1, a2)} fill={ring} />
      </g>,
    );
    const [x1, y1] = pt(R.outerBull, a1);
    const [x2, y2] = pt(R.doubleOut + 0.03, a1);
    wires.push(<path key={n} d={`M${x1} ${y1}L${x2} ${y2}`} />);
    const [tx, ty] = pt(NUM_R, i * 18);
    nums.push(
      <text key={n} x={tx} y={ty} transform={`rotate(${i * 18 > 90 && i * 18 < 270 ? i * 18 + 180 : i * 18} ${tx} ${ty})`}>
        {n}
      </text>,
    );
  });
  const rings = [R.doubleOut, R.doubleIn, R.trebleOut, R.trebleIn, R.outerBull, R.bull];
  return (
    <svg className="da-board-svg" viewBox={`${-BOARD_SPAN} ${-BOARD_SPAN} ${BOARD_SPAN * 2} ${BOARD_SPAN * 2}`} aria-hidden>
      <defs>
        <radialGradient id="db-surround" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#2a2a30" />
          <stop offset="0.8" stopColor="#0f0f12" />
          <stop offset="1" stopColor="#050507" />
        </radialGradient>
        <radialGradient id="db-red" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff3b45" />
          <stop offset="1" stopColor="#c8121d" />
        </radialGradient>
        <radialGradient id="db-green" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1ec463" />
          <stop offset="1" stopColor="#0b8a3f" />
        </radialGradient>
        <linearGradient id="db-chrome" x1="-1" y1="-1" x2="1" y2="1" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#9aa3a8" />
          <stop offset="0.55" stopColor="#eef2f4" />
          <stop offset="1" stopColor="#5f686d" />
        </linearGradient>
        <radialGradient id="db-light" cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <pattern id="db-sisal" width="0.03" height="0.03" patternUnits="userSpaceOnUse">
          <circle cx="0.008" cy="0.01" r="0.004" fill="#000" fillOpacity="0.1" />
          <circle cx="0.022" cy="0.024" r="0.003" fill="#fff" fillOpacity="0.06" />
        </pattern>
      </defs>
      <circle r={BOARD_SPAN - 0.005} fill="url(#db-chrome)" />
      <circle r={BOARD_SPAN - 0.035} fill="url(#db-surround)" />
      <circle r={NUM_R + 0.085} fill="none" stroke="url(#db-chrome)" strokeWidth="0.012" opacity="0.8" />
      <circle r={NUM_R - 0.085} fill="none" stroke="url(#db-chrome)" strokeWidth="0.012" opacity="0.8" />
      <g className="da-nums">{nums}</g>
      <circle r={R.doubleOut + 0.035} fill="#0b0b0d" />
      {beds}
      <circle r={R.outerBull} fill="url(#db-green)" />
      <circle r={R.bull} fill="url(#db-red)" />
      <circle r={R.doubleOut} fill="url(#db-sisal)" />
      {/* wires: a dark shadow, then the chrome on top so they look raised */}
      <g className="da-wires shadow" transform="translate(0.006 0.008)">
        {wires}
        {rings.map((r) => (
          <circle key={r} r={r} fill="none" />
        ))}
      </g>
      <g className="da-wires">
        {wires}
        {rings.map((r) => (
          <circle key={r} r={r} fill="none" />
        ))}
      </g>
      <circle r={BOARD_SPAN - 0.01} fill="url(#db-light)" />
    </svg>
  );
});
