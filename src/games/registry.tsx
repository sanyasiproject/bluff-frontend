// The game registry: each registry game's table and rules, looked up by kind (Bluff, Crazy 7 and Rang are wired by hand)
import { lazy, Suspense, useMemo, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameConfig, PluggedKind, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble, Note } from '../useBluff';
import { BombRules } from './bomb/BombRules';
import { CarromRules } from './carrom/CarromRules';
import { ChessRulesLazy } from './chess/lazy';
import { ColorWarRules } from './colorwar/ColorWarRules';
import { DartsRules } from './darts/DartsRules';
import { DotsRules } from './dots/DotsRules';
import { FruitRules } from './fruit/FruitRules';
import { GomokuRules } from './gomoku/GomokuRules';
import { LudoRules } from './ludo/LudoRules';
import { RmcsRules } from './rmcs/RmcsRules';
import { SeaRules } from './seabattle/SeaRules';
import { SnakesRules } from './snakes/SnakesRules';
import { SpikesRules } from './spikes/SpikesRules';
import { UtttRules } from './uttt/UtttRules';
import { WordHuntRules } from './wordhunt/WordHuntRules';
import { LOADED, loadTable } from './tableLoaders';

export interface TableProps {
  view: RoomView;
  actions: Actions;
  bubbles: ChatBubble[];
  auth: Auth;
  notes?: Note[];
}

export interface PluggedEntry {
  /** the game's table, loaded when first needed */
  Table: LazyExoticComponent<ComponentType<TableProps>>;
  /** the rules, for the lobby's Help and the Rules page */
  Rules?: ComponentType<{ config?: GameConfig }>;
}

const lazyTable = (kind: PluggedKind) => lazy(() => loadTable(kind).then((Table) => ({ default: Table })));

export const PLUGGED: Record<PluggedKind, PluggedEntry> = {
  ludo: { Table: lazyTable('ludo'), Rules: LudoRules },
  snakes: { Table: lazyTable('snakes'), Rules: SnakesRules },
  rmcs: { Table: lazyTable('rmcs'), Rules: RmcsRules },
  fruit: { Table: lazyTable('fruit'), Rules: FruitRules },
  spikes: { Table: lazyTable('spikes'), Rules: SpikesRules },
  darts: { Table: lazyTable('darts'), Rules: DartsRules },
  colorwar: { Table: lazyTable('colorwar'), Rules: ColorWarRules },
  dots: { Table: lazyTable('dots'), Rules: DotsRules },
  chess: { Table: lazyTable('chess'), Rules: ChessRulesLazy },
  carrom: { Table: lazyTable('carrom'), Rules: CarromRules },
  bomb: { Table: lazyTable('bomb'), Rules: BombRules },
  seabattle: { Table: lazyTable('seabattle'), Rules: SeaRules },
  gomoku: { Table: lazyTable('gomoku'), Rules: GomokuRules },
  uttt: { Table: lazyTable('uttt'), Rules: UtttRules },
  wordhunt: { Table: lazyTable('wordhunt'), Rules: WordHuntRules },
};

/** App: the table of whichever registry game the room is playing */
export function PluggedTable(props: TableProps & { kind: PluggedKind }) {
  const { Table } = PLUGGED[props.kind];
  // fetched ahead (lobby / idle prefetch): no fallback frame; picked once per game so the table never swaps mid-game
  const Ready = useMemo(() => LOADED[props.kind], [props.kind]);
  if (Ready) return <Ready {...props} />;
  return (
    <Suspense
      fallback={
        <main className="screen center-screen">
          <p className="muted">Setting up the table…</p>
        </main>
      }
    >
      <Table {...props} />
    </Suspense>
  );
}
