// The letter grid: chunky wooden tiles, drag through touching tiles (picked inside a 70% circle) with a glowing line through their centres
import { useRef, useState, type CSSProperties, type PointerEvent as RPE } from 'react';
import { cx } from '../../lib/cards';
import { wordHuntTouches } from '../../types';
import { tileText } from './lib';

export interface Flash {
  key: number;
  path: number[];
  kind: 'ok' | 'dup' | 'bad';
}

interface Props {
  grid: string[];
  size: number;
  live: boolean;
  /** letters hidden (the countdown) */
  hidden?: boolean;
  flash: Flash | null;
  onPath: (path: number[]) => void;
  onDone: (path: number[]) => void;
  onTile?: (n: number) => void;
}

/** a tile is picked when the finger is inside this share of its width, so diagonals don't clip neighbours */
const INNER = 0.35;

export function LetterGrid({ grid, size, live, hidden, flash, onPath, onDone, onTile }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<number[]>([]);
  const dragging = useRef(false);
  const cur = useRef<number[]>([]);

  const set = (p: number[]) => {
    cur.current = p;
    setPath(p);
    onPath(p);
  };

  /** the tile whose inner circle holds this point */
  const tileAt = (x: number, y: number): number | null => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return null;
    const cw = r.width / size;
    const ch = r.height / size;
    const c = Math.floor((x - r.left) / cw);
    const rr = Math.floor((y - r.top) / ch);
    if (c < 0 || rr < 0 || c >= size || rr >= size) return null;
    const dx = x - r.left - (c + 0.5) * cw;
    const dy = y - r.top - (rr + 0.5) * ch;
    return Math.hypot(dx / cw, dy / ch) <= INNER ? rr * size + c : null;
  };

  const visit = (x: number, y: number) => {
    const t = tileAt(x, y);
    const p = cur.current;
    if (t === null) return;
    if (!p.length) {
      onTile?.(1);
      return set([t]);
    }
    if (t === p[p.length - 1]) return;
    // back onto the previous tile: undo the last one
    if (p.length > 1 && t === p[p.length - 2]) return set(p.slice(0, -1));
    if (p.includes(t) || !wordHuntTouches(size, p[p.length - 1], t)) return;
    onTile?.(p.length + 1);
    set([...p, t]);
  };

  const down = (e: RPE<HTMLDivElement>) => {
    if (!live) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    cur.current = [];
    visit(e.clientX, e.clientY);
  };
  const move = (e: RPE<HTMLDivElement>) => {
    if (!dragging.current) return;
    // coalesced points keep fast swipes from skipping a tile
    const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [];
    for (const ev of evs.length ? evs : [e]) visit(ev.clientX, ev.clientY);
  };
  const up = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = cur.current;
    set([]);
    if (p.length) onDone(p);
  };

  const centre = (i: number) => `${((i % size) + 0.5) * (100 / size)} ${(Math.floor(i / size) + 0.5) * (100 / size)}`;
  const shown = path.length ? path : (flash?.path ?? []);
  const lineKind = path.length ? 'drag' : flash?.kind;

  return (
    <div
      ref={box}
      className={cx('wh-grid', `n${size}`, live && 'live', hidden && 'hidden')}
      style={{ ['--n' as string]: size } as CSSProperties}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      role="grid"
      aria-label="Letter grid"
    >
      {(grid.length ? grid : Array<string>(size * size).fill('')).map((t, i) => {
        const at = shown.indexOf(i);
        return (
          <span
            key={`${i}-${at >= 0 && !path.length ? flash?.key : ''}`}
            className={cx('wh-tile', at >= 0 && (path.length ? 'on' : `fl-${flash?.kind}`), at === 0 && path.length > 0 && 'first')}
            style={{ ['--i' as string]: i } as CSSProperties}
          >
            <b>{hidden ? '' : tileText(t)}</b>
          </span>
        );
      })}
      {shown.length > 1 && (
        <svg key={path.length ? 'drag' : flash?.key} className={cx('wh-line', `k-${lineKind}`)} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <polyline points={shown.map(centre).join(' ')} />
        </svg>
      )}
    </div>
  );
}
