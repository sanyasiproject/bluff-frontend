// The Dots and Boxes sheet, drawn in HTML so it stays sharp on the tilted table: closed boxes with initials, lines, dots, tap diamonds
import { useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { cx } from '../../lib/cards';
import { dotsLineAt, dotsLineCount, type DotsView } from '../../types';

interface Props {
  dv: DotsView;
  colorOf: (id: string) => string;
  initialOf: (id: string) => string;
  /** my turn and nothing in flight: lines can be drawn */
  live: boolean;
  myColor: string;
  onLine: (line: number) => void;
}

/** a point on the sheet (dot units) as CSS position */
const at = (x: number, y: number, n: number) => ({ left: `${((x + 0.5) / n) * 100}%`, top: `${((y + 0.5) / n) * 100}%` });

/** a line's start dot and direction */
function lineStyle(size: number, line: number, color: string): { dir: 'h' | 'v'; style: CSSProperties } {
  const { dir, row, col } = dotsLineAt(size, line);
  return { dir, style: { ...at(col, row, size + 1), ['--c' as string]: color } };
}

/** the middle of a line, for its tap diamond */
function middle(size: number, line: number) {
  const { dir, row: r, col: c } = dotsLineAt(size, line);
  return dir === 'h' ? at(c + 0.5, r, size + 1) : at(c, r + 0.5, size + 1);
}

const lineUnder = (x: number, y: number): number | null => {
  const el = document.elementFromPoint(x, y);
  const v = el instanceof HTMLElement ? el.dataset.line : undefined;
  return v === undefined ? null : Number(v);
};

export function DotsBoard({ dv, colorOf, initialOf, live, myColor, onLine }: Props) {
  const { size } = dv;
  const n = size + 1;
  const [ghost, setGhost] = useState<number | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const free = (l: number | null) => l !== null && dv.lines[l] === undefined;
  const pick = (x: number, y: number) => {
    const d = down.current;
    // a drag from dot to dot: the line under the middle of the drag
    if (d && Math.hypot(x - d.x, y - d.y) > 10) return lineUnder((x + d.x) / 2, (y + d.y) / 2);
    return lineUnder(x, y);
  };

  const boxes: ReactElement[] = [];
  for (const [k, id] of Object.entries(dv.boxes)) {
    const b = Number(k);
    const fresh = dv.last?.closed.includes(b);
    boxes.push(
      <b key={`b${b}-${fresh ? dv.last?.seq : 0}`} className={cx('dt-box', fresh && 'pop')} style={{ ...at(b % size, Math.floor(b / size), n), ['--c' as string]: colorOf(id) }}>
        {initialOf(id)}
      </b>,
    );
  }
  const lines: ReactElement[] = [];
  for (const [k, id] of Object.entries(dv.lines)) {
    const l = Number(k);
    const fresh = dv.last?.line === l;
    const { dir, style } = lineStyle(size, l, colorOf(id));
    lines.push(<i key={`l${l}-${fresh ? dv.last?.seq : 0}`} className={cx('dt-line', `d-${dir}`, fresh && 'new')} style={style} />);
  }
  const g = live && free(ghost) ? lineStyle(size, ghost!, myColor) : null;
  const dots: ReactElement[] = [];
  for (let r = 0; r <= size; r++) for (let c = 0; c <= size; c++) dots.push(<i key={`d${r}-${c}`} className="dt-dot" style={at(c, r, n)} />);
  // tap areas: one diamond per free line
  const hits: ReactElement[] = [];
  if (live) for (let l = 0; l < dotsLineCount(size); l++) if (dv.lines[l] === undefined) hits.push(<i key={l} data-line={l} className="dt-hit" style={middle(size, l)} />);

  return (
    <div
      className={cx('dt-area', live && 'live')}
      style={{ ['--dt-n' as string]: n }}
      onPointerDown={(e) => {
        if (!live) return;
        down.current = { x: e.clientX, y: e.clientY };
        setGhost(lineUnder(e.clientX, e.clientY));
      }}
      onPointerMove={(e) => (live ? setGhost(pick(e.clientX, e.clientY)) : undefined)}
      onPointerLeave={() => (down.current ? undefined : setGhost(null))}
      onPointerUp={(e) => {
        const l = live ? pick(e.clientX, e.clientY) : null;
        down.current = null;
        setGhost(null);
        if (free(l)) onLine(l!);
      }}
      onPointerCancel={() => ((down.current = null), setGhost(null))}
    >
      {boxes}
      {g && <i className={cx('dt-line dt-ghost', `d-${g.dir}`)} style={g.style} />}
      {lines}
      {dots}
      {hits}
    </div>
  );
}
