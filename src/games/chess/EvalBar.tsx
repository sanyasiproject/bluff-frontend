// The engine's view: a white/black eval bar, the best lines with scores, and arrows for the best moves
import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import type { Arrow } from './BoardLayers';
import { barOf, scoreText, type EngineLine } from './engineTypes';
import type { Color } from './lib';
import { uciMove } from './texts';

/** a tall bar: white's share from the bottom (or top when the board is flipped) */
export function EvalBar({ line, bottom, className }: { line: Pick<EngineLine, 'cp' | 'mate'> | null; bottom: Color; className?: string }) {
  const v = barOf(line);
  const white = 50 + v * 50;
  return (
    <div className={cx('ch-evalbar', bottom === 'b' && 'flipped', className)} role="meter" aria-label="Evaluation" aria-valuetext={line ? scoreText(line) : 'Thinking'}>
      <i style={{ '--w': white / 100 } as CSSProperties} />
      <b className={cx(v >= 0 ? 'w' : 'b')}>{line ? scoreText(line).replace('+', '') : '…'}</b>
    </div>
  );
}

/** the top lines: score, depth and the first moves of each */
export function EngineLines({ lines, busy, max = 3, onPick }: { lines: EngineLine[]; busy: boolean; max?: number; onPick?: (i: number) => void }) {
  const depth = lines[0]?.depth;
  return (
    <div className="ch-lines">
      <p className="ch-lines-head">
        <span>🧠 Engine</span>
        <small>{busy ? `thinking${depth ? ` · depth ${depth}` : '…'}` : depth ? `depth ${depth}` : ''}</small>
      </p>
      {lines.slice(0, max).map((l, i) => (
        <button key={i} type="button" className={cx('ch-line', i === 0 && 'best')} onClick={onPick ? () => onPick(i) : undefined} tabIndex={onPick ? 0 : -1}>
          <b className={cx('ch-score', (l.mate ?? l.cp ?? 0) >= 0 ? 'w' : 'b')}>{scoreText(l)}</b>
          <span data-no-translate>{l.sans.slice(0, 8).join(' ')}</span>
        </button>
      ))}
      {!lines.length && <p className="muted small">{busy ? 'Thinking…' : 'No moves here'}</p>}
    </div>
  );
}

const ARROW_COLS = ['#2ecc71', '#4aa3ff', '#ffb74d'];

/** best-move arrows from the top lines (best is thickest) */
export function lineArrows(lines: EngineLine[], max = 3): Arrow[] {
  const out: Arrow[] = [];
  lines.slice(0, max).forEach((l, i) => {
    const m = uciMove(l.ucis[0]);
    if (m) out.push({ from: m.from, to: m.to, color: ARROW_COLS[i], width: i ? 0.11 : 0.17, opacity: i ? 0.6 : 0.9 });
  });
  return out.reverse();
}
