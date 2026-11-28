// Moves as SAN in numbered pairs; scrolls to the newest (or the one picked in analysis), marks in colour
import { useEffect, useRef } from 'react';
import { cx } from '../../lib/cards';

export interface MoveMark { text: string; tone: 'inaccuracy' | 'mistake' | 'blunder' | 'best' | 'book' }

interface Props {
  sans: string[];
  /** number of the first move (a game from a set-up position with black to move starts at 1…) */
  blackFirst?: boolean;
  /** the ply shown (1-based; 0 = start); defaults to the last */
  ply?: number;
  marks?: (MoveMark | null)[];
  onPly?: (ply: number) => void;
  className?: string;
}

export function MoveList({ sans, blackFirst = false, ply, marks, onPly, className }: Props) {
  const box = useRef<HTMLOListElement>(null);
  const at = ply ?? sans.length;
  useEffect(() => {
    const el = box.current?.querySelector('.on');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [at, sans.length, marks?.length]);
  const offset = blackFirst ? 1 : 0;
  const rows: { n: number; w: number | null; b: number | null }[] = [];
  for (let i = -offset; i < sans.length; i += 2) rows.push({ n: rows.length + 1, w: i >= 0 ? i : null, b: i + 1 < sans.length ? i + 1 : null });
  const cell = (i: number | null, first = false) => {
    if (i === null) return <span className="ch-mv empty">{first ? '…' : ''}</span>;
    const m = marks?.[i];
    const body = (
      <>
        {sans[i]}
        {m && m.tone !== 'best' && m.tone !== 'book' && <sup>{m.text}</sup>}
      </>
    );
    const cls = cx('ch-mv', at === i + 1 && 'on', m && `mk-${m.tone}`);
    return onPly ? (
      <button type="button" className={cls} onClick={() => onPly(i + 1)}>
        {body}
      </button>
    ) : (
      <span className={cls}>{body}</span>
    );
  };
  return (
    <ol ref={box} className={cx('ch-moves', className)} aria-label="Moves">
      {rows.length === 0 && <li className="ch-moves-empty muted">No moves yet</li>}
      {rows.map((r) => (
        <li key={r.n}>
          <i>{r.n}.</i>
          {cell(r.w, true)}
          {cell(r.b)}
        </li>
      ))}
    </ol>
  );
}
