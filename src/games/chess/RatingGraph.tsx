// One perf's rating over time: a line with the peak marked and the newest value at the end
export function RatingGraph({ history }: { history: [number, number][] }) {
  if (history.length < 2) return <p className="muted small ch-graph-empty">Play rated games to draw your graph</p>;
  const W = 320;
  const H = 90;
  const rs = history.map((h) => h[1]);
  const lo = Math.min(...rs) - 15;
  const hi = Math.max(...rs) + 15;
  const x = (i: number) => (i / (history.length - 1)) * W;
  const y = (r: number) => H - ((r - lo) / (hi - lo)) * H;
  const d = history.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(h[1]).toFixed(1)}`).join('');
  const peak = rs.indexOf(Math.max(...rs));
  return (
    <figure className="ch-rgraph">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Rating from ${rs[0]} to ${rs[rs.length - 1]}`}>
        <path d={`${d}L${W} ${H}L0 ${H}Z`} fill="rgba(196, 154, 90, 0.22)" />
        <path d={d} fill="none" stroke="#e0b46c" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <path d={`M${x(peak)} 0V${H}`} stroke="#ffd54f" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="muted small">{`low ${Math.round(Math.min(...rs))} · peak ${Math.round(rs[peak])} · now ${Math.round(rs[rs.length - 1])}`}</figcaption>
    </figure>
  );
}
