import type { CSSProperties, ReactNode, RefObject } from 'react';
import { DEFAULT_CARD_BACK, RANKS, type Card, type Rank } from '../types';
import { PlayingCard } from './PlayingCard';

/** paper layers for a stack of n: at most 6 drawn, spread over the same height (each 3D layer costs the phone a lot) */
export function paperSteps(n: number): number[] {
  if (n <= 6) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: 6 }, (_, j) => Math.round(((j + 1) * n) / 6) - 1);
}

/** an opponent's cards lying face down on the felt in front of them: a small fan, more cards a wider fan */
export function OppCards({ count, back, aura, turn }: { count: number; back?: string; aura?: string | null; turn: number }) {
  const shown = Math.min(count, 7);
  if (shown === 0) return null;
  const spread = Math.min(56, 9 * (shown - 1));
  return (
    <div className="opp-cards" style={{ rotate: `${turn.toFixed(1)}deg` } as CSSProperties} aria-hidden>
      {Array.from({ length: shown }, (_, i) => {
        const t = shown > 1 ? i / (shown - 1) - 0.5 : 0;
        return (
          <PlayingCard
            key={i}
            faceDown
            back={back ?? DEFAULT_CARD_BACK}
            aura={aura}
            className="opp-card"
            style={{ rotate: `${(t * spread).toFixed(1)}deg`, ['--k' as string]: i } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** Bluff's pile as a real stack on the felt: paper layers that grow with the count, the last cards played on top at odd angles */
export function Pile3D({
  count,
  boxRef,
  playKey,
  backs,
  auras = [],
}: {
  count: number;
  boxRef: RefObject<HTMLDivElement>;
  playKey: string | null;
  backs: string[];
  auras?: (string | null)[];
}) {
  const top = Math.min(count, 6);
  const under = count - top;
  // one paper layer for every two cards underneath, so a big pile stands tall
  const layers = Math.min(Math.ceil(under / 2), 40);
  const offset = top - backs.length;
  return (
    <div className="pile3d" ref={boxRef} aria-label={`${count} cards in the pile`} style={{ ['--layers' as string]: layers } as CSSProperties}>
      {count === 0 && <div className="pile3d-empty">Pile</div>}
      {paperSteps(layers).map((i) => (
        <i key={`l${i}`} className="pile3d-layer" style={{ ['--i' as string]: i, rotate: `${((i * 37) % 9) - 4}deg` } as CSSProperties} />
      ))}
      {Array.from({ length: top }, (_, i) => {
        const n = under + i;
        return (
          <PlayingCard
            key={n}
            faceDown
            back={backs[i - offset] ?? DEFAULT_CARD_BACK}
            aura={auras[i - offset]}
            className="pile3d-card"
            style={
              {
                ['--i' as string]: i,
                rotate: `${((n * 47) % 40) - 20}deg`,
                translate: `${((n * 13) % 15) - 7}px ${((n * 29) % 11) - 5}px calc(var(--layers) * 0.9px + ${i * 1.2 + 1}px)`,
              } as CSSProperties
            }
          />
        );
      })}
      {playKey && count > 0 && <span key={playKey} className="pile-ripple" />}
      {count > 0 && (
        <span key={count} className="pile3d-count bump">
          {count}
        </span>
      )}
    </div>
  );
}

/** a fan of small face-up cards held up like a real hand, for my 2v2 partner (Bluff and Rang share it) */
export function PartnerFan({ name, total, team, cards, wide }: { name: string; total: number; team: 'a' | 'b' | null; cards: { key: string; node: ReactNode; n?: number; tag?: string; tagColor?: string }[]; wide?: boolean }) {
  const m = cards.length;
  // Rang: a fixed-size box of straight rows, so a big hand never spreads over the seats
  if (wide) return <PartnerRows name={name} total={total} team={team} cards={cards} />;
  // wide (Rang): cards spread far enough apart that each one's colour and number show whole; fewer cards, wider gaps
  const step = wide ? Math.max(14, Math.min(26, 230 / Math.max(m - 1, 1))) : 17;
  // a gentle arc, flatter when spread wide so the cards stay upright and easy to read
  const spread = wide ? Math.min(24, 2.6 * Math.max(m - 1, 0)) : Math.min(46, 4.5 * Math.max(m - 1, 0));
  // packed too tight to read each card's face: its sign shows in a chip above it instead
  const tight = !!wide && step < 22;
  return (
    <div className={`pfan${team ? ` team-${team}` : ''}`} aria-label={`${name}'s cards, ${total}`}>
      <div className={`pfan-hand${wide ? ' wide' : ''}${tight ? ' tight' : ''}`} style={{ ['--m' as string]: m, ['--step' as string]: `${step}px` } as CSSProperties}>
        {m === 0 && <span className="pfan-none">No cards left</span>}
        {cards.map((c, i) => {
          const t = m > 1 ? i / (m - 1) - 0.5 : 0;
          return (
            <span
              key={c.key}
              className="pfan-card"
              style={{ ['--a' as string]: `${(t * spread).toFixed(1)}deg`, ['--x' as string]: `${(t * (m - 1) * step).toFixed(1)}px`, ['--y' as string]: `${(t * t * 8).toFixed(1)}px`, zIndex: i } as CSSProperties}
            >
              {c.node}
              {tight && c.tag ? (
                <b className="pfan-n pfan-sign" style={{ ['--chip' as string]: c.tagColor ?? '#222' } as CSSProperties}>
                  {c.tag}
                  {c.n !== undefined && c.n > 1 && <small>×{c.n}</small>}
                </b>
              ) : (
                c.n !== undefined && c.n > 1 && <b className="pfan-n">×{c.n}</b>
              )}
            </span>
          );
        })}
      </div>
      <span className="pfan-tag" data-no-translate>
        🤝 {name} · {total}
      </span>
    </div>
  );
}

/** 2v2 Bluff: my partner's cards in a held fan, one card per rank, A to K, with how many */
export function PartnerCards({ cards, name, kismat, team }: { cards: Card[]; name: string; kismat: Rank | null; team: 'a' | 'b' | null }) {
  const groups = RANKS.map((r) => cards.filter((c) => c.rank === r)).filter((g) => g.length > 0);
  return (
    <PartnerFan
      name={name}
      total={cards.length}
      team={team}
      cards={groups.map((g) => ({ key: g[0].rank, n: g.length, node: <PlayingCard card={g[0]} wild={kismat === g[0].rank} /> }))}
    />
  );
}

/** the most room my partner's Rang cards take across, whatever their count */
const ROWS_WIDTH = 250;
const ROWS_CARD = 24;
/** the narrowest a card's visible edge gets before the cards wrap onto another row (its sign and count still fit) */
const ROWS_MIN_STEP = 16;
const ROWS_MAX_STEP = 24;

/** how a partner's cards split into rows: as few rows as fit the box, the cards shared evenly between them */
export function partnerRows(m: number) {
  const perRow = Math.floor((ROWS_WIDTH - ROWS_CARD) / ROWS_MIN_STEP) + 1;
  const rows = Math.max(1, Math.ceil(m / perRow));
  const per = Math.ceil(m / rows);
  const step = per > 1 ? Math.min(ROWS_MAX_STEP, (ROWS_WIDTH - ROWS_CARD) / (per - 1)) : ROWS_MAX_STEP;
  return { rows, per, step };
}

/** 2v2 Rang: my partner's cards lying in straight rows, left to right by colour; each card's sign and count sit on its own visible edge */
function PartnerRows({ name, total, team, cards }: { name: string; total: number; team: 'a' | 'b' | null; cards: { key: string; node: ReactNode; n?: number; tag?: string; tagColor?: string }[] }) {
  const { rows, per, step } = partnerRows(cards.length);
  const lines = Array.from({ length: rows }, (_, r) => cards.slice(r * per, r * per + per));
  return (
    <div className={`pfan prows-box${team ? ` team-${team}` : ''}`} aria-label={`${name}'s cards, ${total}`}>
      <span className="pfan-tag" data-no-translate>
        🤝 {name} · {total}
      </span>
      <div className="prows" style={{ ['--pcw' as string]: `${ROWS_CARD}px`, ['--step' as string]: `${step.toFixed(1)}px` } as CSSProperties}>
        {cards.length === 0 && <span className="pfan-none">No cards left</span>}
        {lines.map((line, r) => (
          <div key={r} className="prow" style={{ ['--k' as string]: line.length, zIndex: r } as CSSProperties}>
            {line.map((c, i) => (
              <span key={c.key} className="prow-card" style={{ ['--i' as string]: i, zIndex: i } as CSSProperties}>
                {c.node}
                <b className="prow-sign" style={{ ['--chip' as string]: c.tagColor ?? '#222' } as CSSProperties}>
                  {c.tag}
                </b>
                {c.n !== undefined && c.n > 1 && <b className="prow-n">×{c.n}</b>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
