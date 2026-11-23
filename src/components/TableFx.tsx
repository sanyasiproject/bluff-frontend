import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { reducedMotion } from '../lib/motion';

/** the big moments of colour-card games: skip, reverse, a pick penalty, a wild's colour, last card and a missed call */
export type FxKind = 'skip' | 'reverse' | 'draw' | 'wild' | 'call' | 'missed';

interface FxItem {
  key: number;
  kind: FxKind;
  x: number;
  y: number;
  /** the big words (+4, RED!, LAST CARD!) */
  text?: string;
  /** a wild's chosen colour, as a CSS colour */
  color?: string;
}

const LIFE_MS = 1700;

/** effects for a table: fx(kind, where, { text, color }) shows one; layer must be rendered once */
export function useTableFx() {
  const [items, setItems] = useState<FxItem[]>([]);
  const seq = useRef(0);
  const fx = useCallback((kind: FxKind, at: Element | DOMRect | null | undefined, opts: { text?: string; color?: string; shake?: boolean } = {}) => {
    if (!at || reducedMotion()) return;
    const r = at instanceof Element ? at.getBoundingClientRect() : at;
    const key = ++seq.current;
    setItems((all) => [...all, { key, kind, x: r.left + r.width / 2, y: r.top + r.height / 2, text: opts.text, color: opts.color }]);
    window.setTimeout(() => setItems((all) => all.filter((i) => i.key !== key)), LIFE_MS);
    // a heavy hit (+4) shakes the whole table for a moment
    if (opts.shake) {
      document.querySelector('main.table')?.animate(
        [{ translate: '0 0' }, { translate: '-7px 3px' }, { translate: '6px -3px' }, { translate: '-4px 2px' }, { translate: '3px -1px' }, { translate: '0 0' }],
        { duration: 420, easing: 'ease-out' },
      );
    }
  }, []);
  const layer = items.length > 0 ? createPortal(<FxLayer items={items} />, document.body) : null;
  return { fx, layer };
}

function FxLayer({ items }: { items: FxItem[] }) {
  return (
    <div className="tfx-layer" aria-hidden>
      {items.map((i) => (
        <div key={i.key} className={`tfx tfx-${i.kind}`} style={{ left: i.x, top: i.y, ['--fx-color' as string]: i.color } as CSSProperties}>
          {i.kind === 'skip' && (
            <>
              <span className="tfx-ring" />
              <span className="tfx-badge">⊘</span>
              <b className="tfx-word">{i.text ?? 'SKIP!'}</b>
            </>
          )}
          {i.kind === 'reverse' && (
            <>
              <span className="tfx-spin">⇄</span>
              <b className="tfx-word">{i.text ?? 'REVERSE'}</b>
            </>
          )}
          {i.kind === 'draw' && (
            <>
              <span className="tfx-ring" />
              <b className="tfx-big">{i.text}</b>
            </>
          )}
          {i.kind === 'wild' && (
            <>
              <span className="tfx-wheel" />
              <span className="tfx-flood" />
              <b className="tfx-word">{i.text}</b>
            </>
          )}
          {i.kind === 'call' && (
            <>
              <span className="tfx-star" />
              <b className="tfx-shout">{i.text ?? 'LAST CARD!'}</b>
            </>
          )}
          {i.kind === 'missed' && <b className="tfx-stamp">{i.text ?? 'CAUGHT!'}</b>}
        </div>
      ))}
    </div>
  );
}
