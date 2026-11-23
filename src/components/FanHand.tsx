import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { cx } from '../lib/cards';
import { loadPref, savePref } from '../lib/storage';
import type { Card, Rank } from '../types';
import { PlayingCard } from './PlayingCard';

type Mode = 'auto' | 'fan' | 'stacks';
const MODE_PREF = 'handMode';
// card height is about this share of the hand's height (the bottom of the cards sits off the screen, like a real hand)
const HEIGHT_SHARE = 0.86;
const MIN_CW = 46;
const MAX_CW = 128;
// a row needs at least this much of each card showing to read its corner
const MIN_STEP_SHARE = 0.3;
// a later row sits this share of a card higher, behind the front row
const ROW_RISE = 0.48;

interface Props {
  cards: Card[];
  selected?: string[];
  /** omit for a read-only hand (watchers) */
  onToggle?: (id: string) => void;
  /** stacks replace the selection in one go (tap order kept) */
  onSet?: (ids: string[]) => void;
  /** Bluff: big hands may show one stack per rank */
  stackable?: boolean;
  deal?: boolean;
  playable?: string[];
  dimRest?: boolean;
  fresh?: string[];
  kismat?: Rank | null;
}

export interface Spot<T = Card> {
  card: T;
  style: CSSProperties;
}

/** the hand box's size, kept up to date */
export function useBox(ref: RefObject<HTMLElement>) {
  const [box, setBox] = useState({ w: 600, h: 150 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return box;
}

/** card width that fills the hand's height */
export const fanCardWidth = (h: number) => Math.round(Math.min(MAX_CW, Math.max(MIN_CW, (h * HEIGHT_SHARE) / 1.4)));

/** fanned rows for any kind of card (Rang uses it too): more rows, a little smaller, when one row can't show every corner */
export function fanLayout<T>(cards: T[], box: { w: number; h: number }): { cw: number; rows: number; spots: Spot<T>[] } {
  const n = cards.length;
  const baseCw = fanCardWidth(box.h);
  let rows = 1;
  let cw = baseCw;
  for (; rows < 4; rows++) {
    cw = Math.round(Math.max(MIN_CW * 0.85, Math.min(baseCw, (box.h * HEIGHT_SHARE) / (1.4 * (1 + ROW_RISE * (rows - 1))))));
    const perRow = Math.ceil(n / rows);
    if (perRow <= 1 || (box.w - cw) / (perRow - 1) >= cw * MIN_STEP_SHARE) break;
  }
  const ch = cw * 1.4;
  const perRow = Math.max(1, Math.ceil(n / rows));
  const frontTop = box.h - ch * 0.84;
  const spots: Spot<T>[] = [];
  for (let r = 0; r < rows; r++) {
    const row = cards.slice(r * perRow, (r + 1) * perRow);
    // the first cards sit in the back row, so the hand still reads left to right, top to bottom
    const top = frontTop - (rows - 1 - r) * ch * ROW_RISE;
    spots.push(...fanRow(row, cw, box.w, top, r * 100));
  }
  return { cw, rows, spots };
}

/** where each card of one fanned row goes: spread along a gentle arc, rotated round its foot */
function fanRow<T>(row: T[], cw: number, width: number, top: number, z0: number): Spot<T>[] {
  const m = row.length;
  const ch = cw * 1.4;
  // the end cards lean out by up to about a quarter card, so keep that much clear on each side
  const edge = m > 6 ? cw * 0.28 : 0;
  const room = Math.max(0, width - cw - edge * 2);
  const step = m > 1 ? Math.min(cw * 0.72, room / (m - 1)) : 0;
  const total = step * (m - 1) + cw;
  const x0 = (width - total) / 2;
  const spread = Math.min(24, 2.6 * (m - 1));
  return row.map((card, j) => {
    const t = m > 1 ? (j - (m - 1) / 2) / ((m - 1) / 2) : 0;
    const angle = (t * spread) / 2;
    const drop = t * t * ch * 0.1 * (spread / 24);
    return {
      card,
      style: { left: x0 + j * step, top: top + drop, rotate: `${angle.toFixed(2)}deg`, zIndex: z0 + j },
    };
  });
}

/** my hand on a landscape table: a fan like cards held in the hand; a big Bluff hand can fold into one stack per rank */
export function FanHand({ cards, selected = [], onToggle, onSet, stackable, deal, playable, dimRest, fresh = [], kismat }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const box = useBox(ref);
  const [mode, setMode] = useState<Mode>(() => (loadPref(MODE_PREF) as Mode | null) ?? 'auto');

  const n = cards.length;
  const baseCw = fanCardWidth(box.h);
  const fitsOneRow = (cw: number) => n <= 1 || (box.w - cw) / (n - 1) >= cw * MIN_STEP_SHARE;
  const stacks = !!stackable && n > 1 && (mode === 'stacks' || (mode === 'auto' && !fitsOneRow(baseCw)));

  const layout = useMemo(() => (stacks ? null : fanLayout(cards, box)), [stacks, cards, box]);

  const pickMode = (next: Mode) => {
    setMode(next);
    savePref(MODE_PREF, next);
  };

  return (
    <div className={cx('fan-hand', stacks && 'stacked', layout && layout.rows > 1 && 'multi', !onToggle && !onSet && 'read-only')} ref={ref}>
      {n === 0 && <p className="hand-empty">No cards left</p>}
      {layout &&
        layout.spots.map(({ card, style }, i) => {
          const pick = selected.indexOf(card.id);
          const can = playable?.includes(card.id);
          return (
            <PlayingCard
              key={card.id}
              card={card}
              dataId={card.id}
              selected={pick !== -1}
              order={pick !== -1 ? pick + 1 : undefined}
              onClick={onToggle ? () => onToggle(card.id) : undefined}
              wild={!!kismat && card.rank === kismat}
              note={can ? ', playable' : undefined}
              className={cx('fan-card', deal && 'deal', fresh.includes(card.id) && 'fresh', can && 'playable', dimRest && playable && !can && 'dim')}
              style={{ ...style, ['--cw' as string]: `${layout.cw}px`, animationDelay: deal ? `${i * 26}ms` : undefined, zIndex: style.zIndex }}
            />
          );
        })}
      {stacks && <Stacks cards={cards} selected={selected} onSet={onSet} box={box} cw={baseCw} kismat={kismat ?? null} fresh={fresh} deal={deal} />}
      {stackable && n > 12 && (onToggle || onSet) && (
        <button type="button" className="hand-mode" onClick={() => pickMode(stacks ? 'fan' : 'stacks')} aria-label={stacks ? 'Show every card' : 'Group cards by rank'}>
          {stacks ? '🂠 Fan' : '▦ Stacks'}
        </button>
      )}
    </div>
  );
}

/** one stack per rank: tap to take one more card of it, tap a full stack to put them all back */
function Stacks({
  cards,
  selected,
  onSet,
  box,
  cw: baseCw,
  kismat,
  fresh,
  deal,
}: {
  cards: Card[];
  selected: string[];
  onSet?: (ids: string[]) => void;
  box: { w: number; h: number };
  cw: number;
  kismat: Rank | null;
  fresh: string[];
  deal?: boolean;
}) {
  const groups: Card[][] = [];
  for (const c of cards) {
    const g = groups.find((x) => x[0].rank === c.rank);
    if (g) g.push(c);
    else groups.push([c]);
  }
  const g = groups.length;
  // leave room for the depth of the tallest stack
  const cw = Math.round(Math.min(baseCw, (box.h * 0.8) / 1.4));
  const room = Math.max(0, box.w - cw - 10);
  const step = g > 1 ? Math.min(cw * 1.12, room / (g - 1)) : 0;
  const x0 = (box.w - (step * (g - 1) + cw)) / 2;
  const top = box.h - cw * 1.4 * 0.96;

  /** the rank whose "how many?" chooser is open */
  const [open, setOpen] = useState<Rank | null>(null);
  // take exactly n of a rank: keep what's already picked of it first, in tap order, then add more
  const take = (group: Card[], n: number) => {
    if (!onSet) return;
    const ids = group.map((c) => c.id);
    const kept = selected.filter((id) => ids.includes(id)).slice(0, n);
    const more = ids.filter((id) => !kept.includes(id)).slice(0, n - kept.length);
    onSet([...selected.filter((id) => !ids.includes(id) || kept.includes(id)), ...more]);
    setOpen(null);
  };
  // a single card toggles at once; a stack asks how many
  const tap = (group: Card[]) => {
    if (!onSet) return;
    if (group.length === 1) take(group, selected.includes(group[0].id) ? 0 : 1);
    else setOpen((o) => (o === group[0].rank ? null : group[0].rank));
  };

  return (
    <>
      {groups.map((group, i) => {
        const picked = group.filter((c) => selected.includes(c.id));
        const orders = picked.map((c) => selected.indexOf(c.id) + 1);
        const shown = group.slice(0, Math.min(group.length, 4));
        const isNew = group.some((c) => fresh.includes(c.id));
        const label = `${group.length} × ${group[0].rank}${picked.length ? `, ${picked.length} selected` : ''}. Tap to choose how many`;
        return (
          <Fragment key={group[0].rank}>
          <button
            type="button"
            className={cx('rank-stack', picked.length > 0 && 'has-pick', picked.length === group.length && 'all', isNew && 'fresh', deal && 'deal')}
            style={{ left: x0 + i * step, top, ['--cw' as string]: `${cw}px`, zIndex: i + 1, animationDelay: deal ? `${i * 40}ms` : undefined }}
            onClick={onSet ? () => tap(group) : undefined}
            disabled={!onSet}
            aria-label={label}
          >
            {shown
              .map((c, k) => (
                <PlayingCard
                  key={c.id}
                  card={c}
                  dataId={c.id}
                  wild={kismat === c.rank}
                  className="stack-card"
                  style={{ translate: `${k * 2.5}px ${-k * 3}px`, zIndex: 10 - k }}
                />
              ))
              .reverse()}
            <span className="stack-count">×{group.length}</span>
            {picked.length > 0 && (
              <span className="stack-pick" aria-hidden title={`Order ${orders.join(', ')}`}>
                ✓{picked.length}
              </span>
            )}
          </button>
          {open === group[0].rank && (
            <div className="stack-picker" role="group" aria-label={`How many ${group[0].rank}s`} style={{ left: x0 + i * step + cw / 2, top }}>
              {Array.from({ length: group.length }, (_, k) => k + 1).map((n) => (
                <button key={n} type="button" className={cx(n === picked.length && 'on')} onClick={() => take(group, n)}>
                  {n === group.length && n > 1 ? `All ${n}` : n}
                </button>
              ))}
              {picked.length > 0 && (
                <button type="button" className="none" onClick={() => take(group, 0)}>
                  None
                </button>
              )}
            </div>
          )}
          </Fragment>
        );
      })}
    </>
  );
}
