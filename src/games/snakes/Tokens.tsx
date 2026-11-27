// Saanp Seedhi tokens: Ludo gotis that hop square by square, bounce off 100, slide down snakes, climb ladders and get bitten back
import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import type { LudoColor, SnakesLastMove, SnakesSeat } from '../../types';
import { Pawn } from '../ludo/Gotis';
import { ludoSfx } from '../ludo/sounds';
import { centreOf, ladderParts, snakePoints, walkOf, type Pt, type TokenSpot } from './geometry';
import { snakesSfx } from './sounds';

interface Els {
  wrap: HTMLDivElement | null;
  stand: HTMLElement | null;
  pawn: HTMLElement | null;
}

interface Props {
  seats: SnakesSeat[];
  spots: TokenSpot[];
  /** one square in px */
  cell: number;
  last: SnakesLastMove | null;
  six: boolean;
  cornerOf: (id: string) => string;
  styleOf: (id: string) => string;
  turnId: string | null;
  meId: string;
  onBite?: (el: Element) => void;
  onFinish?: (el: Element) => void;
  /** the move's animation length, so banners wait for it */
  onPlayed?: (ms: number) => void;
  /** a short name tag for a player's goti, shown when gotis share a square */
  tagOf?: (id: string) => string;
}

/** the dice tumbles first, then the goti sets off */
export const DICE_MS = 550;

const px = (p: Pt, cell: number, dx = 0, dy = 0) => `translate3d(${(p[0] + dx) * cell}px, ${(p[1] + dy) * cell}px, 0)`;

/** how long a move takes to play, for the table's banners */
export function moveMs(last: SnakesLastMove, six: boolean): number {
  const n = walkOf(last.from, last.roll, last.landed, last.bounced, last.from === 0 && six).length;
  const walk = Math.min(200, 1400 / n) * n;
  return DICE_MS + walk + (last.via ? (last.via.kind === 'snake' ? 950 : 750) : 0);
}

export function TokenLayer({ seats, spots, cell, last, six, cornerOf, styleOf, turnId, meId, onBite, onFinish, onPlayed, tagOf }: Props) {
  const els = useRef(new Map<string, Els>());
  const seen = useRef<number>(last?.seq ?? -1);

  useLayoutEffect(() => {
    if (!last || seen.current === last.seq) return;
    seen.current = last.seq;
    if (reducedMotion() || cell <= 0) return;
    const el = els.current.get(last.playerId);
    const spot = spots.find((s) => s.playerId === last.playerId);
    if (!el?.wrap || !el.stand || !spot || last.landed === 0) return;
    const enter = last.from === 0 && six;
    const steps = walkOf(last.from, last.roll, last.landed, last.bounced, enter).map((q) => centreOf(q));
    const n = steps.length;
    const hopMs = enter ? 420 : Math.min(200, 1400 / n);
    const walkMs = hopMs * n;
    // the slide after landing: along the snake's body, or straight up the ladder
    let slide: Pt[] = [];
    if (last.via?.kind === 'snake') slide = snakePoints(last.via.from, last.via.to, 24).slice(1);
    else if (last.via?.kind === 'ladder') {
      const { rungs } = ladderParts(last.via.from, last.via.to);
      slide = [...rungs.map(([a, b]): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]), centreOf(last.via.to)];
    }
    const slideMs = slide.length ? (last.via!.kind === 'snake' ? 950 : 750) : 0;
    const total = walkMs + slideMs;
    onPlayed?.(DICE_MS + total);
    const D = DICE_MS;
    const end = px(spot.at, cell, spot.dx, spot.dy);
    const frames: Keyframe[] = [{ transform: px(centreOf(last.from, cornerOf(last.playerId)), cell), offset: 0 }];
    steps.forEach((p, i) => frames.push({ transform: !slide.length && i === n - 1 ? end : px(p, cell), offset: (hopMs * (i + 1)) / total }));
    slide.forEach((p, i) => frames.push({ transform: i === slide.length - 1 ? end : px(p, cell), offset: (walkMs + (slideMs * (i + 1)) / slide.length) / total }));
    el.wrap.animate(frames, { duration: total, delay: D, easing: 'linear', fill: 'backwards' });
    const lift = cell * (enter ? 1.1 : 0.55);
    const up: Keyframe[] = [];
    for (let i = 0; i < n; i++) {
      up.push({ translate: '0 0 0', offset: (hopMs * i) / total, easing: 'ease-out' });
      up.push({ translate: `0 0 ${lift}px`, offset: (hopMs * (i + 0.5)) / total, easing: 'ease-in' });
    }
    up.push({ translate: '0 0 0', offset: walkMs / total });
    if (walkMs < total) up.push({ translate: '0 0 0', offset: 1 });
    el.stand.animate(up, { duration: total, delay: D });
    // a snake swallows a little: the goti wobbles on the way down; a ladder: it leans up
    if (last.via?.kind === 'snake') el.pawn?.animate([{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '12deg' }, { rotate: '-8deg' }, { rotate: '0deg' }], { duration: slideMs, delay: D + walkMs });
    el.pawn?.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(1.22, 0.74)', offset: 0.35 }, { transform: 'scale(0.92, 1.1)', offset: 0.7 }, { transform: 'scale(1, 1)' }], {
      duration: 300,
      delay: D + total,
      easing: 'ease-out',
    });
    const timers: number[] = steps.map((_, i) => window.setTimeout(() => ludoSfx.hop(i), D + hopMs * (i + 1) - 20));
    if (last.bounced) timers.push(window.setTimeout(() => snakesSfx.bounce(), D + hopMs * (100 - last.from)));
    if (last.via) timers.push(window.setTimeout(() => (last.via!.kind === 'snake' ? snakesSfx.snake() : snakesSfx.ladder()), D + walkMs));
    if (last.to === 100) timers.push(window.setTimeout(() => el.wrap && onFinish?.(el.wrap), D + total + 60));
    // bitten players: knocked up off the square and back to where they fall
    last.bitten.forEach((b, i) => {
      const be = els.current.get(b.playerId);
      const bs = spots.find((s) => s.playerId === b.playerId);
      if (!be?.wrap || !be.stand || !bs) return;
      const at = D + total + 120 + i * 120;
      be.wrap.animate([{ transform: px(centreOf(b.from), cell) }, { transform: px(bs.at, cell, bs.dx, bs.dy) }], { duration: 760, delay: at, easing: 'cubic-bezier(0.3, 0.1, 0.3, 1)', fill: 'backwards' });
      be.stand.animate([{ translate: '0 0 0' }, { translate: `0 0 ${cell * 2.2}px`, offset: 0.45 }, { translate: '0 0 0' }], { duration: 760, delay: at, fill: 'backwards' });
      be.pawn?.animate([{ rotate: 'y 0deg' }, { rotate: 'y 720deg' }], { duration: 760, delay: at, easing: 'ease-out' });
      timers.push(
        window.setTimeout(() => {
          snakesSfx.bite();
          if (el.wrap) onBite?.(el.wrap);
        }, at),
      );
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [last?.seq, cell]);

  return (
    <div className="lu-gotis sn-tokens" style={{ ['--cell' as string]: `${cell * 0.95}px` } as CSSProperties}>
      {spots.map((s) => {
        const seat = seats.find((x) => x.playerId === s.playerId)!;
        return (
          <div
            key={s.playerId}
            ref={(wrap) => {
              const e = els.current.get(s.playerId) ?? { wrap: null, stand: null, pawn: null };
              e.wrap = wrap;
              e.stand = wrap?.querySelector('.lu-g-stand') ?? null;
              e.pawn = wrap?.querySelector('.lu-pawn') ?? null;
              els.current.set(s.playerId, e);
            }}
            className={cx('lu-g', 'sn-g', s.playerId === turnId && 'sn-turn', s.playerId === meId && 'mine', seat.place && 'home', seat.pos === 0 && 'waiting')}
            style={{ transform: px(s.at, cell, s.dx, s.dy), ['--k' as string]: s.k } as CSSProperties}
          >
            <i className="lu-g-shadow" />
            <span className="lu-g-stand" aria-label={`${seat.color} goti on ${seat.pos || 'start'}`}>
              <Pawn color={seat.color as LudoColor} style={styleOf(s.playerId)} />
              {tagOf && s.k < 0.8 && (
                <b className={cx('sn-tag', `lu-c-${seat.color}`)} aria-hidden>
                  {s.playerId === meId ? 'You' : tagOf(s.playerId)}
                </b>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
