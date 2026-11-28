// The server's clock as seen from this phone, shared by every countdown that compares against server times
import type { RoomView } from '../types';

/** best lower bound of (server time - phone time); 0 until a server time is seen */
let offset: number | null = null;

/** a server time that was sent at or before now (a view's `now`, a restart notice's `at`) */
export function sampleServerTime(serverAtLeast: number): void {
  if (!Number.isFinite(serverAtLeast) || serverAtLeast <= 0) return;
  const s = serverAtLeast - Date.now();
  if (offset === null || s > offset) offset = s;
}

/** server time now, on this phone */
export const serverNow = (): number => Date.now() + (offset ?? 0);

/** a view carries the server time inside its registry game's view (Word Hunt, Bomb, ...); also read if Ludo or Raja Mantri add one */
export function sampleView(v: RoomView): void {
  const p = v.plugged as (Record<string, unknown> & { kind: string }) | null | undefined;
  const inner = p ? (p[p.kind] as { now?: unknown } | undefined) : undefined;
  if (typeof inner?.now === 'number') sampleServerTime(inner.now);
}

/** a new server (restart) may run a different clock */
export function resetServerClock(): void {
  offset = null;
}
