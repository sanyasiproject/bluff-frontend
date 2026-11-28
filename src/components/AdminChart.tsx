import type { AdminDayStats } from '../types';

const W = 560;
const H = 150;
const PAD_B = 18;
const PAD_T = 14;

/** one row of hand-drawn bars over the 14 days; the numbers also sit in a hidden table for screen readers */
function Bars({ days, pick, color, label }: { days: AdminDayStats[]; pick: (d: AdminDayStats) => number; color: string; label: string }) {
  const max = Math.max(1, ...days.map(pick));
  const slot = W / Math.max(1, days.length);
  const bw = Math.min(26, slot * 0.62);
  const plot = H - PAD_B - PAD_T;
  return (
    <figure className="as-chart">
      <figcaption>{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} data-no-translate>
        <line x1={0} x2={W} y1={H - PAD_B} y2={H - PAD_B} className="as-axis" />
        {days.map((d, i) => {
          const v = pick(d);
          const h = (v / max) * plot;
          const x = i * slot + (slot - bw) / 2;
          const y = H - PAD_B - h;
          const last = i === days.length - 1;
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={bw} height={Math.max(h, v > 0 ? 2 : 0)} rx={3} fill={color} opacity={last ? 1 : 0.78} />
              {v > 0 && (
                <text x={x + bw / 2} y={y - 3} className="as-val" textAnchor="middle">
                  {v}
                </text>
              )}
              <text x={x + bw / 2} y={H - 4} className={last ? 'as-day today' : 'as-day'} textAnchor="middle">
                {Number(d.day.slice(8))}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** games and new accounts per IST day, with an accessible table fallback */
export function AdminChart({ days }: { days: AdminDayStats[] }) {
  return (
    <div className="as-charts">
      <Bars days={days} pick={(d) => d.games} color="var(--gold)" label="Games per day" />
      <Bars days={days} pick={(d) => d.newAccounts} color="var(--ok)" label="New accounts per day" />
      <table className="sr-only">
        <caption>Last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Games</th>
            <th scope="col">New accounts</th>
            <th scope="col">Active</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.games}</td>
              <td>{d.newAccounts}</td>
              <td>{d.active}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
