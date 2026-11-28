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

export function ordinal(n: number): string {
  return ['', '1st', '2nd', '3rd', '4th', '5th'][n] ?? `${n}th`;
}
