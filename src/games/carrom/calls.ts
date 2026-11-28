// Carrom words and small helpers: a player's side, team and colour names, the server-clock deadline
import type { CarromSide, CarromView } from './lib';

export const TEAM_COLORS = ['#ffd740', '#40c4ff'] as const;
export const COIN_NAME = { w: 'White', b: 'Black', q: 'Queen' } as const;

/** the board side a player shoots from (0 bottom, clockwise) */
export const sideOf = (dv: CarromView, id: string | null | undefined): CarromSide => (id ? (dv.sides[id] ?? 0) : 0);

/** a player's team index in Classic 2v2, else null */
export const teamOf = (dv: CarromView, id: string): number | null => {
  if (!dv.teams) return null;
  const i = dv.teams.findIndex((t) => t.includes(id));
  return i < 0 ? null : i;
};

/** a server time as this phone's clock (views carry the server's `now`) */
export const localTime = (serverAt: number | null, serverNow: number, gotAt: number): number | null => (serverAt === null ? null : gotAt + (serverAt - serverNow));
