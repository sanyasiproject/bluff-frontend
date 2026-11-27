// The game registry: each registry game's table and rules, looked up by kind (Bluff, Crazy 7 and Rang are wired by hand)
import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { GameConfig, PluggedKind, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions, ChatBubble, Note } from '../useBluff';
import { LudoRules } from './ludo/LudoRules';

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
