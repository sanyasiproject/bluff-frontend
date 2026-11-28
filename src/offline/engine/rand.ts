// Pure helpers shared by the rules: random whole numbers and place names (no Node APIs, so the apps can run them too).

export type RandomInt = (max: number) => number;

/** a uniform whole number in [0, max) from Web Crypto (Node and browsers), without modulo bias */
export const secureRandom: RandomInt = (max) => {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError(`secureRandom: bad max ${max}`);
  const limit = 2 ** 32 - (2 ** 32 % max);
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
};

/** small seeded random numbers (mulberry32) in [0, 1), so a seed always repeats the same run */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a normal random number (Box-Muller) */
export function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** picks one option, better ones far more often; tau says how loose */
export function choose<T>(options: T[], values: number[], tau: number, rand: () => number): T {
  const top = Math.max(...values);
  const weights = values.map((x) => Math.exp((x - top) / tau));
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r <= 0) return options[i];
  }
  return options[options.length - 1];
}

export function ordinal(n: number): string {
  return ['', '1st', '2nd', '3rd', '4th', '5th'][n] ?? `${n}th`;
}
