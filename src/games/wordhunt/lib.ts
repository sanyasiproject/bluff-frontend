// Word Grid Hunt helpers for the app: tile text and the server clock (the server checks every word)
export const tileText = (t: string) => (t.length > 1 ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t.toUpperCase());

/** server time from a view's `now`, kept as an offset from this phone's clock */
export function clockOffset(now: number | undefined): number {
  return now ? now - Date.now() : 0;
}
