// Chess rules for the lobby's Help, the rules sheet and the Rules page: the basics, then each variant with a small diagram
import '../../styles/land-chess-lobby.css';
import { useMemo, useState } from 'react';
import { cx } from '../../lib/cards';
import { gameOpt, type GameConfig } from '../../types';
import { ChessBoard } from './ChessBoard';
import { CHESS_VARIANTS, ChessGame, parseSquare, Position, type ChessVariant } from './lib';
import { useChessLooks } from './looks';
import { BASIC_RULES, VARIANT_RULES } from './rulesText';

// each variant's diagram: moves from its start and an arrow (from, to)
const DIAGRAMS: Record<ChessVariant, { moves: string[]; arrow?: [string, string]; seed?: number; note: string }> = {
  standard: { moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], arrow: ['c4', 'f7'], note: 'The Italian Game: the bishop eyes f7' },
  chess960: { moves: [], seed: 312, note: 'One of the 960 shuffled starts' },
  crazyhouse: { moves: ['e4', 'd5', 'exd5', 'Qxd5'], note: 'Each side now holds a pawn to drop' },
  kingOfTheHill: { moves: ['e4', 'e5', 'Ke2', 'Ke7', 'Ke3'], arrow: ['e3', 'd4'], note: 'The marked centre squares are the hill' },
  threeCheck: { moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Bxf7+'], note: 'Check number one: two more to win' },
  antichess: { moves: ['e3', 'b5'], arrow: ['f1', 'b5'], note: 'White can capture, so White must' },
  atomic: { moves: ['Nf3', 'd5', 'Ne5'], arrow: ['e5', 'f7'], note: 'Nxf7 blows up the king next door' },
  horde: { moves: [], note: '36 pawns against a full army' },
  racingKings: { moves: [], arrow: ['h2', 'h8'], note: 'The striped rank is the finish line' },
};

function diagramOf(v: ChessVariant): { pos: Position; last: ChessGame } | null {
  try {
    const d = DIAGRAMS[v];
    const g = new ChessGame(v, d.seed !== undefined ? Position.start(v, d.seed).fen() : undefined);
    for (const san of d.moves) {
      const m = g.position().parseSan(san);
      if (!m) break;
      g.play(m);
    }
    return { pos: g.position(), last: g };
  } catch {
    return null;
  }
}

/** a small board for a variant's rule */
export function VariantDiagram({ variant, bare }: { variant: ChessVariant; bare?: boolean }) {
  const looks = useChessLooks();
  const d = useMemo(() => diagramOf(variant), [variant]);
  if (!d) return null;
  const a = DIAGRAMS[variant].arrow;
  const from = a ? parseSquare(a[0]) : undefined;
  const to = a ? parseSquare(a[1]) : undefined;
  const last = d.last.moves.length ? d.last.moves[d.last.moves.length - 1] : null;
  return (
    <figure className="ch-diagram">
      <ChessBoard
        pos={d.pos}
        bottom="w"
        lastMove={last}
        looks={{ ...looks, coords: false, confirm: false }}
        arrows={from !== undefined && to !== undefined ? [{ from, to, color: '#2ecc71', width: 0.2 }] : []}
      />
      {!bare && <figcaption className="muted small">{DIAGRAMS[variant].note}</figcaption>}
    </figure>
  );
}

/** the rules: the basics, then the picked variant (tabs for all nine) */
export function ChessRules({ config }: { config?: GameConfig }) {
  const chosen = config ? (gameOpt<string>(config, 'variant') as ChessVariant) : 'standard';
  const [v, setV] = useState<ChessVariant>(chosen);
  const info = CHESS_VARIANTS.find((x) => x.id === v);
  return (
    <div className="ch-rules">
      <ul>
        {BASIC_RULES.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div className="ch-rules-tabs" role="tablist" aria-label="Variants">
        {CHESS_VARIANTS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === v} className={cx('chip', x.id === v && 'on')} onClick={() => setV(x.id)}>
            {x.name}
          </button>
        ))}
      </div>
      <div className="ch-rules-variant">
        <VariantDiagram variant={v} />
        <div>
          <b>{info?.name}</b>
          <ul>
            {VARIANT_RULES[v].map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
