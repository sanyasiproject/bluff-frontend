import { useLayoutEffect, useRef, useState } from 'react';
import type { Card } from '../types';
import { PlayingCard } from './PlayingCard';

const MIN_SLICE = 28;
const RATIO = 1.4;

interface Props {
  cards: Card[];
  selected?: string[];
  /** omit for a read-only hand (watchers looking at someone's cards) */
  onToggle?: (id: string) => void;
  /** cards slide in one by one, at the start of a game */
  deal?: boolean;
}

/** Overlapping rows of cards that fit the screen width; each row shows the card corners */
export function Hand({ cards, selected = [], onToggle, deal }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cw = width >= 480 ? 70 : 58;
  const perRowMax = Math.max(1, Math.floor((width - cw) / MIN_SLICE) + 1);
  const rowCount = Math.max(1, Math.ceil(cards.length / perRowMax));
  const perRow = Math.ceil(cards.length / rowCount);
  const slice = perRow > 1 ? Math.min(cw + 6, (width - cw) / (perRow - 1)) : 0;
  const rows = Array.from({ length: rowCount }, (_, r) => cards.slice(r * perRow, (r + 1) * perRow));

  return (
    <div className="hand" ref={ref} style={{ ['--cw' as string]: `${cw}px` }}>
      {cards.length === 0 && <p className="hand-empty">No cards left</p>}
      {cards.length > 0 &&
        rows.map((row, r) => (
          <div
            key={r}
            className="hand-row"
            style={{ width: slice * (row.length - 1) + cw, height: cw * RATIO + 14 }}
          >
            {row.map((card, i) => {
              const pick = selected.indexOf(card.id);
              const isSelected = pick !== -1;
              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  selected={isSelected}
                  order={isSelected ? pick + 1 : undefined}
                  onClick={onToggle ? () => onToggle(card.id) : undefined}
                  className={deal ? 'in-hand deal' : 'in-hand'}
                  style={{
                    left: i * slice,
                    zIndex: isSelected ? 1000 + i : r * 100 + i,
                    animationDelay: deal ? `${(r * perRow + i) * 28}ms` : undefined,
                  }}
                />
              );
            })}
          </div>
        ))}
    </div>
  );
}
