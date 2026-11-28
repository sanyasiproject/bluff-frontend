// Fruit Slice Duel's stage: the plate in the middle where each item pops in, everyone's talwar pointing at it, reaction times and pops
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { FRUIT_ITEM_POINTS, type FruitItemKind, type FruitView } from '../../types';
import { PlateItem, Slash, Talwar } from './duelArt';

export interface Spot {
  id: string;
  /** hilt position in % of the stage and the angle the blade points (deg) */
  x: number;
  y: number;
  a: number;
  /** how far the swing carries the sword forward, in % of its own length */
  reach: number;
}

/** the stage size and the free room beside it (px), measured by the table */
export interface SwordRoom {
  fs: number;
  side: number;
}

/** sword length in % of the stage: as long as fits while its tip stays ~28% of the way short of the fruit */
export function swordSize(room: SwordRoom): { hilt: number; len: number } {
  const fs = Math.max(1, room.fs);
  // the hilt sits in the free room beside the stage, clear of the seat cards
  const hilt = Math.max(0, Math.min(room.side - 10, fs * 0.32)) / fs * 100;
  // fruit radius ~15.5% of the stage; on small phones the gap shrinks to ~20% so the sword stays big
  const reach = 50 + hilt - 15.5;
  const len = (reach * 0.72 * fs) / 100 < 130 ? reach * 0.8 : reach * 0.72;
  return { hilt, len };
}

/** sword spots: left column seats' swords rest beside the stage on the left, the right column's on the right, spread like the seats */
export function swordSpots(left: string[], right: string[], room: SwordRoom): Spot[] {
  const { hilt, len } = swordSize(room);
  const col = (ids: string[], x: number) =>
    ids.map((id, i) => {
      const y = 50 + (i - (ids.length - 1) / 2) * 40;
      const d = Math.hypot(50 - x, 50 - y);
      return { id, x, y, a: (Math.atan2(50 - y, 50 - x) * 180) / Math.PI, reach: ((d - len * 0.98 + 2) / len) * 100 };
    });
  return [...col(left, -hilt), ...col(right, 100 + hilt)];
}

export interface Shown {
  round: number;
  kind: FruitItemKind;
  winner: string | null;
  reactions: Record<string, number | null>;
  slowed: string[];
}

interface Props {
  fv: FruitView;
  spots: Spot[];
  meId: string;
  colorOf: (id: string) => string;
  nameOf: (id: string) => string;
  /** the item up now (null between items, or while its result shows) */
  live: { round: number; kind: FruitItemKind } | null;
  /** the result on show */
  shown: Shown | null;
  /** sword length in % of the stage */
  swordLen: number;
  /** my strike on the live item: my sword swings at once */
  mine: { round: number; reaction: number } | null;
  early: number;
  onPainted: (round: number, at: number) => void;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;
/** my blade holds its follow-through this long if no result comes, then goes back to rest */
const HOLD_MS = 700;
/** when a blade reaches the fruit, ms into its swing */
export const CONTACT_MS = 125;

export function Duel({ fv, spots, swordLen, meId, colorOf, nameOf, live, shown, mine, early, onPainted }: Props) {
  // the moment the item is first on screen: reaction counts from here
  const round = live?.round ?? null;
  useLayoutEffect(() => {
    if (round === null) return;
    const raf = requestAnimationFrame(() => onPainted(round, performance.now()));
    return () => cancelAnimationFrame(raf);
  }, [round]);

  // strikers by speed, fastest first (their swords swing in that order)
  const struck = shown ? Object.entries(shown.reactions).filter((e): e is [string, number] => e[1] !== null).sort((a, b) => a[1] - b[1]) : [];
  const fastest = struck[0]?.[0];
  const fruitWon = shown && shown.kind !== 'magnet' && shown.winner;
  const winnerSpot = fruitWon ? spots.find((s) => s.id === shown.winner) : undefined;
  // one tap = one swing: my sword swings on the tap and is never replayed by the result
  const myRound = mine && ((live && mine.round === live.round) || (shown && shown.round === mine.round)) ? mine.round : null;
  const [settled, setSettled] = useState<number | null>(null);
  useEffect(() => {
    if (myRound === null) return;
    const t = window.setTimeout(() => setSettled(myRound), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [myRound]);
  // whether my blade was still in follow-through when a magnet result came (fixed, so the yank never restarts)
  const yankFrom = useRef<{ round: number; held: boolean } | null>(null);
  if (shown && myRound === shown.round && yankFrom.current?.round !== shown.round) yankFrom.current = { round: shown.round, held: settled !== myRound };
  // slash trails: mine from the tap; the others' with the result, fastest first (none on a magnet)
  const slashes: { id: string; d: number; k: string }[] = [];
  if (myRound !== null) slashes.push({ id: meId, d: CONTACT_MS - 45, k: `m${myRound}` });
  if (shown && shown.kind !== 'magnet')
    struck.forEach(([id], i) => {
      if (id !== meId || myRound === null) slashes.push({ id, d: CONTACT_MS - 35 + i * 140, k: `r${shown.round}` });
    });

  return (
    <div className="fd-stage-in">
      <div className="fd-plate" aria-hidden>
        <i className="fd-plate-rim" />
      </div>
      <div className="fd-item-slot" aria-live="polite">
        {live && <PlateItem key={`l${live.round}`} kind={live.kind} />}
        {!live && shown && <PlateItem key={`r${shown.round}`} kind={shown.kind} cut={!!fruitWon || (shown.kind === 'magnet' && struck.length > 0)} angle={winnerSpot ? winnerSpot.a : 0} />}
        {!live && !shown && fv.phase === 'play' && <b className="fd-ready">Get ready…</b>}
        {!live && shown && !fruitWon && shown.kind !== 'magnet' && <b className="fd-nobody">Nobody!</b>}
      </div>

      {spots.map((s) => {
        const slow = (fv.slow[s.id] ?? 0) > 0;
        const rank = struck.findIndex(([id]) => id === s.id);
        const winner = !!fruitWon && shown.winner === s.id;
        const magnet = shown?.kind === 'magnet' && rank >= 0;
        let anim = '';
        let tag = 'idle';
        if (s.id === meId && myRound !== null) {
          // my swing from the tap: it holds its follow-through, then rests; a magnet yanks the blade I already swung
          const held = magnet && yankFrom.current?.round === myRound && yankFrom.current.held;
          anim = cx('strike', !held && (settled === myRound || !!shown) && 'ret', magnet && 'yank', held && 'held');
          tag = `m${myRound}`;
        } else if (shown) {
          // everyone else swings once, when their strike is known, fastest first
          anim = winner ? 'slice' : magnet ? 'yank' : rank >= 0 ? 'late' : '';
          tag = `r${shown.round}`;
        }
        return (
          <div
            key={`${s.id}-${tag}`}
            className={cx('fd-sword', s.x > 50 && 'flip', s.id === meId && 'me', slow && 'slow', anim, s.id === meId && early && myRound === null && 'early')}
            style={{ '--c': colorOf(s.id), left: `${s.x}%`, top: `${s.y}%`, width: `${swordLen}%`, '--a': `${s.a}deg`, '--d': `${Math.max(0, rank) * 140}ms`, '--reach': s.reach.toFixed(1) } as CSSProperties}
          >
            <span className="fd-arm">
              <span className="fd-blade">
                <i className="fd-smear" />
                <Talwar color={colorOf(s.id)} />
                {slow && <i className="fd-trail" />}
                {magnet && <i className="fd-sparks" />}
              </span>
            </span>
            {slow && <em className="fd-slowmark">🧲</em>}
          </div>
        );
      })}

      {/* every slash in its player's colour, from their side: mine at once, everyone's with the result */}
      <div className="fd-slashes" aria-hidden>
        {slashes.map(({ id, d, k }) => {
          const s = spots.find((x) => x.id === id);
          if (!s) return null;
          return <Slash key={`${id}-${k}`} color={colorOf(id)} angle={s.a + (s.x > 50 ? -90 : 90)} delay={d} flip={s.x > 50} />;
        })}
      </div>

      {/* everyone's reaction under their hilt: mine at once, everyone's with the result */}
      {spots.map((s) => {
        const r = shown ? shown.reactions[s.id] : s.id === meId && mine && live && mine.round === live.round ? mine.reaction : undefined;
        if (r === undefined) return null;
        const zapped = shown?.slowed.includes(s.id);
        return (
          <span key={`t-${s.id}-${shown?.round ?? 'm'}`} className={cx('fd-time', s.id === meId && 'me', s.id === fastest && shown?.kind !== 'magnet' && 'best')} style={{ '--c': colorOf(s.id), left: `${s.x < 50 ? 13 : 87}%`, top: `${s.y + 13}%` } as CSSProperties}>
            {r === null ? `${nameOf(s.id)} —` : `${nameOf(s.id)} ${secs(r)}${s.id === fastest && shown?.kind !== 'magnet' ? ' ⚡' : ''}`}
            {zapped && <b className="fd-zap">🧲 Slowed 2 items</b>}
          </span>
        );
      })}

      {fruitWon && winnerSpot && shown.kind !== 'magnet' && (
        <b key={`p${shown.round}`} className="fd-points" style={{ '--c': colorOf(winnerSpot.id) } as CSSProperties}>
          {`+${FRUIT_ITEM_POINTS[shown.kind]} ${winnerSpot.id === meId ? 'You!' : nameOf(winnerSpot.id)}`}
        </b>
      )}
    </div>
  );
}
