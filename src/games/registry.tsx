// The game registry: each registry game's table and rules, looked up by kind (Bluff, Crazy 7 and Rang are wired by hand)
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameConfig, PluggedKind, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble, Note } from '../useBluff';
import { ColorWarRules } from './colorwar/ColorWarRules';
import { DartsRules } from './darts/DartsRules';
import { DotsRules } from './dots/DotsRules';
import { FruitRules } from './fruit/FruitRules';
import { LudoRules } from './ludo/LudoRules';
import { RmcsRules } from './rmcs/RmcsRules';
import { SnakesRules } from './snakes/SnakesRules';
import { SpikesRules } from './spikes/SpikesRules';

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

export const PLUGGED: Record<PluggedKind, PluggedEntry> = {
  ludo: { Table: lazy(() => import('./ludo/LudoTable').then((m) => ({ default: m.LudoTable }))), Rules: LudoRules },
  snakes: { Table: lazy(() => import('./snakes/SnakesTable').then((m) => ({ default: m.SnakesTable }))), Rules: SnakesRules },
  rmcs: { Table: lazy(() => import('./rmcs/RmcsTable').then((m) => ({ default: m.RmcsTable }))), Rules: RmcsRules },
  fruit: { Table: lazy(() => import('./fruit/FruitTable').then((m) => ({ default: m.FruitTable }))), Rules: FruitRules },
  spikes: { Table: lazy(() => import('./spikes/SpikesTable').then((m) => ({ default: m.SpikesTable }))), Rules: SpikesRules },
  darts: { Table: lazy(() => import('./darts/DartsTable').then((m) => ({ default: m.DartsTable }))), Rules: DartsRules },
  colorwar: { Table: lazy(() => import('./colorwar/ColorWarTable').then((m) => ({ default: m.ColorWarTable }))), Rules: ColorWarRules },
  dots: { Table: lazy(() => import('./dots/DotsTable').then((m) => ({ default: m.DotsTable }))), Rules: DotsRules },
};

/** App: the table of whichever registry game the room is playing */
export function PluggedTable(props: TableProps & { kind: PluggedKind }) {
  const { Table } = PLUGGED[props.kind];
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
