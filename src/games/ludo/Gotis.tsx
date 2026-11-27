// Gotis: glossy 3D pawns standing on the tilted board; they hop square by square and squash on landing
import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { reducedMotion } from '../../lib/motion';
import { LUDO_HOME, LUDO_LAST_RING, type LudoColor, type LudoLastMove } from '../../types';
import { BOARD_PAD, homeSlot, spotOf, type GotiSpot, type Pt } from './geometry';
import { ludoSfx } from './sounds';

/** one pawn: base, body and head, lit from the top left */
export function Pawn({ color, style, className }: { color: LudoColor; style: string; className?: string }) {
  return (
    <span className={cx('lu-pawn', `lu-c-${color}`, `gs-${style}`, className)}>
      <i className="lu-pawn-base" />
      <i className="lu-pawn-body" />
      <i className="lu-pawn-head" />
    </span>
  );
}

interface Els {
  wrap: HTMLDivElement | null;
  stand: HTMLElement | null;
  pawn: HTMLElement | null;
}

interface Props {
  spots: GotiSpot[];
  /** one board square in px */
  cell: number;
  turns: number;
  last: LudoLastMove | null;
  /** gotis that may move now (keys like red-2) */
  legal: Set<string>;
  /** the goti being pointed at: its landing square shows as a ghost */
  ghost: { color: LudoColor; to: number; token: number } | null;
  /** each colour's goti style: the look of the player who owns it */
  styleOf: (color: LudoColor) => string;
  /** colours that are mine (or my partner's when I move for them) */
  mine: LudoColor[];
  onPick: (token: number) => void;
  onPoint: (token: number | null) => void;
  /** a goti was knocked off: where it was hit, for the burst */
  onKill?: (el: Element) => void;
  onHome?: () => void;
  /** my own colour: my gotis get a "you" ring at their foot */
  you?: LudoColor | null;
}

const px = (p: Pt, cell: number, dx = 0, dy = 0) => `translate3d(${(p[0] + dx + BOARD_PAD) * cell}px, ${(p[1] + dy + BOARD_PAD) * cell}px, 0)`;

export function GotiLayer({ spots, cell, turns, last, legal, ghost, styleOf, mine, onPick, onPoint, onKill, onHome, you }: Props) {
  const els = useRef(new Map<string, Els>());
  // the move already on the board when the table opened is not replayed
  const seen = useRef<number>(last?.seq ?? -1);

  // a new move: the goti hops along its path; anyone it hit flies home after it lands
  useLayoutEffect(() => {
    if (!last || seen.current === last.seq) return;
    seen.current = last.seq;
    if (reducedMotion() || cell <= 0) return;
    const key = `${last.color}-${last.token}`;
    const el = els.current.get(key);
    const spot = spots.find((s) => s.key === key);
    if (!el?.wrap || !el.stand || !spot) return;
    const from = spotOf(last.color, last.from, last.token, turns);
    const steps: Pt[] = [];
    if (last.from < 0) steps.push(spotOf(last.color, 0, last.token, turns));
    else for (let p = last.from + 1; p <= last.to; p++) steps.push(spotOf(last.color, p, last.token, turns));
    const n = Math.max(1, steps.length);
    const hopMs = last.from < 0 ? 420 : Math.min(190, 1500 / n);
    const total = hopMs * n;
    const lift = cell * (last.from < 0 ? 1.4 : 0.75);
    const frames: Keyframe[] = [{ transform: px(from, cell), offset: 0 }];
    steps.forEach((p, i) => frames.push({ transform: i === n - 1 ? px(spot.at, cell, spot.dx, spot.dy) : px(p, cell), offset: (i + 1) / n }));
    el.wrap.animate(frames, { duration: total, easing: 'linear' });
    const up: Keyframe[] = [];
    for (let i = 0; i < n; i++) {
      up.push({ translate: '0 0 0', offset: i / n, easing: 'ease-out' });
      up.push({ translate: `0 0 ${lift}px`, offset: (i + 0.5) / n, easing: 'ease-in' });
    }
    up.push({ translate: '0 0 0', offset: 1 });
    el.stand.animate(up, { duration: total });
    el.pawn?.animate(
      [{ transform: 'scale(1, 1)' }, { transform: 'scale(1.22, 0.74)', offset: 0.35 }, { transform: 'scale(0.92, 1.1)', offset: 0.7 }, { transform: 'scale(1, 1)' }],
      { duration: 300, delay: total, easing: 'ease-out' },
    );
    const timers: number[] = steps.map((_, i) => window.setTimeout(() => ludoSfx.hop(i), hopMs * (i + 1) - 20));
    if (last.home) timers.push(window.setTimeout(() => onHome?.(), total + 60));
    // knocked gotis: thrown up from the square and back to their base
    last.captured.forEach((c, i) => {
      const ck = `${c.color}-${c.token}`;
      const ce = els.current.get(ck);
      const cs = spots.find((s) => s.key === ck);
      if (!ce?.wrap || !ce.stand || !cs) return;
      const hit = spotOf(c.color, c.from, c.token, turns);
      const at = total + 120 + i * 90;
      ce.wrap.animate([{ transform: px(hit, cell) }, { transform: px(cs.at, cell, cs.dx, cs.dy) }], { duration: 720, delay: at, easing: 'cubic-bezier(0.3, 0.1, 0.3, 1)', fill: 'backwards' });
      ce.stand.animate([{ translate: '0 0 0' }, { translate: `0 0 ${cell * 3.2}px`, offset: 0.45 }, { translate: '0 0 0' }], { duration: 720, delay: at, fill: 'backwards' });
      ce.pawn?.animate([{ rotate: 'y 0deg' }, { rotate: 'y 720deg' }], { duration: 720, delay: at, easing: 'ease-out' });
      timers.push(
        window.setTimeout(() => {
          ludoSfx.kill();
          if (el.wrap) onKill?.(el.wrap);
        }, at),
      );
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [last?.seq, cell]);

  // the ghost going home takes the next free place in its triangle
  const homeNow = ghost ? spots.filter((s) => s.color === ghost.color && s.progress >= LUDO_HOME).length : 0;
  const ghostHome = ghost && ghost.to >= LUDO_HOME ? homeSlot(ghost.color, homeNow + 1, homeNow, turns) : null;
  const ghostAt = ghost ? (ghostHome?.at ?? spotOf(ghost.color, ghost.to, ghost.token, turns)) : null;
  return (
    <div className="lu-gotis">
      {ghostAt && ghost && (
        <div className={cx('lu-g ghost', ghostHome && 'home')} style={{ transform: px(ghostAt, cell), ['--k' as string]: ghostHome?.k ?? 1 } as CSSProperties} aria-hidden>
          <i className="lu-g-mark" />
          <span className="lu-g-stand">
            <Pawn color={ghost.color} style={styleOf(ghost.color)} />
          </span>
        </div>
      )}
      {spots.map((s) => {
        const can = legal.has(s.key);
        const almost = s.progress > LUDO_LAST_RING && s.progress < LUDO_HOME;
        return (
          <div
            key={s.key}
            ref={(wrap) => {
              const e = els.current.get(s.key) ?? { wrap: null, stand: null, pawn: null };
              e.wrap = wrap;
              e.stand = wrap?.querySelector('.lu-g-stand') ?? null;
              e.pawn = wrap?.querySelector('.lu-pawn') ?? null;
              els.current.set(s.key, e);
            }}
            className={cx('lu-g', can && 'legal', almost && 'almost', s.progress >= LUDO_HOME && 'home', mine.includes(s.color) && 'mine', you === s.color && 'you')}
            style={{ transform: px(s.at, cell, s.dx, s.dy), ['--k' as string]: s.k } as CSSProperties}
          >
            <i className="lu-g-shadow" />
            {can && <i className="lu-g-ring" />}
            <button
              type="button"
              className="lu-g-stand"
              tabIndex={can ? 0 : -1}
              aria-label={can ? `Move ${s.color} goti ${s.token + 1}` : `${s.color} goti`}
              disabled={!can}
              onPointerEnter={() => can && onPoint(s.token)}
              onPointerDown={() => can && onPoint(s.token)}
              onPointerLeave={() => can && onPoint(null)}
              onFocus={() => can && onPoint(s.token)}
              onBlur={() => onPoint(null)}
              onClick={() => can && onPick(s.token)}
            >
              <Pawn color={s.color} style={styleOf(s.color)} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
