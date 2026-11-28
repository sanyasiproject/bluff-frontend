// Clock times in a saved game move on by the downtime (pure: the apps' offline saves use it too).

/** numbers this close to the save time are clock times (ms since 1970); seeds and scores are far smaller */
const TIME_WINDOW_MS = 30 * 24 * 60 * 60_000;

/** moves every clock time in the running game on by `delta`, as if the server had never stopped */
export function shiftTimes(root: unknown, savedAt: number, delta: number): number {
  const lo = savedAt - TIME_WINDOW_MS;
  const hi = savedAt + TIME_WINDOW_MS;
  const seen = new Set<object>();
  let moved = 0;
  const fix = (x: unknown): unknown => {
    if (typeof x === 'number' && x >= lo && x <= hi) {
      moved++;
      return x + delta;
    }
    walk(x);
    return x;
  };
  const walk = (v: unknown): void => {
    if (v === null || typeof v !== 'object' || seen.has(v) || ArrayBuffer.isView(v) || v instanceof Date) return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) v[i] = fix(v[i]);
    } else if (v instanceof Map) {
      for (const [k, x] of v) v.set(k, fix(x));
    } else if (v instanceof Set) {
      for (const x of v) walk(x);
    } else {
      const o = v as Record<string, unknown>;
      for (const k of Object.keys(o)) {
        const x = o[k];
        const y = fix(x);
        if (y !== x) Object.defineProperty(o, k, { value: y, writable: true, enumerable: true, configurable: true });
      }
    }
  };
  walk(root);
  return moved;
}
