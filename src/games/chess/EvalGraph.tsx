// The game's evaluation across moves as a white/black area graph; tap to jump to a move, mistakes as coloured dots
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { MoveReview } from './lib';

export const JUDGE_COLORS: Record<string, string> = { inaccuracy: '#56b4e9', mistake: '#e69f00', blunder: '#db3031', best: '#2ecc71', good: '#9ccc65', book: '#a1887f', forced: '#9e9e9e' };

/** white's winning chance 0..1 from a white-view score (mates clamp to the edges) */
export const shareOf = (cp: number) => 1 / (1 + Math.exp(-0.00368208 * Math.max(-1500, Math.min(1500, cp))));

export function EvalGraph({ moves, ply, onPly }: { moves: MoveReview[]; ply: number; onPly: (ply: number) => void }) {
  const n = moves.length;
  const W = 300;
  const H = 70;
  const xs = (i: number) => (n ? (i / n) * W : 0);
  const ys = (cp: number) => H - shareOf(cp) * H;
  const pts = [[0, ys(moves[0]?.evalBefore ?? 0)], ...moves.map((m, i) => [xs(i + 1), ys(m.evalAfter)])];
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const area = `${line}L${W} ${H}L0 ${H}Z`;
  const pick = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onPly(Math.max(0, Math.min(n, Math.round(((e.clientX - r.left) / r.width) * n))));
  };
  return (
    <svg className="ch-graph" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Evaluation graph" onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)}>
      <rect width={W} height={H} fill="#2b2724" />
      <path d={area} fill="#f4efe3" />
      <path d={`M0 ${H / 2}H${W}`} stroke="#888" strokeWidth="0.6" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <path d={line} fill="none" stroke="#c49a5a" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      {moves.map((m, i) =>
        m.judgement === 'inaccuracy' || m.judgement === 'mistake' || m.judgement === 'blunder' ? (
          <circle key={i} cx={xs(i + 1)} cy={ys(m.evalAfter)} r="2.6" fill={JUDGE_COLORS[m.judgement]} stroke="#fff" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        ) : null,
      )}
      <path d={`M${xs(ply)} 0V${H}`} stroke="#ff7043" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
