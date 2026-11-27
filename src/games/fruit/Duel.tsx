// Fruit Slice Duel's stage: the plate in the middle where each item pops in, everyone's talwar pointing at it, reaction times and pops
import { useLayoutEffect, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { FRUIT_ITEM_POINTS, type FruitItemKind, type FruitView } from '../../types';
import { PlateItem, Talwar } from './duelArt';

export interface Spot {
  id: string;
  /** hilt position in % of the stage and the angle the blade points (deg) */
  x: number;
  y: number;
  a: number;
}

/** sword spots: left column seats' swords come from the left, the right column's from the right, spread like the seats */
export function swordSpots(left: string[], right: string[]): Spot[] {
  const col = (ids: string[], x: number) =>
    ids.map((id, i) => {
      const y = 50 + (i - (ids.length - 1) / 2) * 44;
      return { id, x, y, a: (Math.atan2(50 - y, 50 - x) * 180) / Math.PI };
    });
  return [...col(left, 4), ...col(right, 96)];
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
  /** my strike on the live item: my sword swings at once */
  mine: { round: number; reaction: number } | null;
  early: number;
  onPainted: (round: number, at: number) => void;
}

const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export function Duel({ fv, spots, meId, colorOf, nameOf, live, shown, mine, early, onPainted }: Props) {
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

  return (
    <div className="fd-stage-in">
      <div className="fd-plate" aria-hidden>
        <i className="fd-plate-rim" />
      </div>
      <div className="fd-item-slot" aria-live="polite">
        {live && <PlateItem key={`l${live.round}`} kind={live.kind} />}
        {!live && shown && <PlateItem key={`r${shown.round}`} kind={shown.kind} cut={!!fruitWon || (shown.kind === 'magnet' && struck.length > 0)} angle={winnerSpot ? winnerSpot.a - 90 : 30} />}
        {!live && !shown && fv.phase === 'play' && <b className="fd-ready">Get ready…</b>}
        {!live && shown && !fruitWon && shown.kind !== 'magnet' && <b className="fd-nobody">Nobody!</b>}
      </div>

      {spots.map((s) => {
        const slow = (fv.slow[s.id] ?? 0) > 0;
        const rank = struck.findIndex(([id]) => id === s.id);
        const winner = !!fruitWon && shown.winner === s.id;
        const mySwing = s.id === meId && mine && live && mine.round === live.round;
        const anim = winner ? 'slice' : mySwing || rank >= 0 ? 'swing' : '';
        const tag = shown ? `r${shown.round}` : mySwing ? `m${mine.round}` : 'idle';
        return (
          <div
            key={`${s.id}-${anim}-${tag}`}
            className={cx('fd-sword', s.x > 50 && 'flip', s.id === meId && 'me', slow && 'slow', anim, s.id === meId && early && 'early')}
            style={{ '--c': colorOf(s.id), left: `${s.x}%`, top: `${s.y}%`, '--a': `${s.a}deg`, '--d': `${Math.max(0, rank) * 90}ms` } as CSSProperties}
          >
            <span className="fd-blade">
              <Talwar color={colorOf(s.id)} />
              {slow && <i className="fd-trail" />}
            </span>
            {slow && <em className="fd-slowmark">🧲</em>}
          </div>
        );
      })}

      {/* everyone's reaction under their hilt: mine at once, everyone's with the result */}
      {spots.map((s) => {
        const r = shown ? shown.reactions[s.id] : s.id === meId && mine && live && mine.round === live.round ? mine.reaction : undefined;
        if (r === undefined) return null;
        const zapped = shown?.slowed.includes(s.id);
        return (
          <span key={`t-${s.id}-${shown?.round ?? 'm'}`} className={cx('fd-time', s.id === meId && 'me', s.id === fastest && shown?.kind !== 'magnet' && 'best')} style={{ '--c': colorOf(s.id), left: `${s.x < 50 ? s.x + 9 : s.x - 9}%`, top: `${s.y + 13}%` } as CSSProperties}>
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
