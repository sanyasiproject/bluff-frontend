/** Indian grouping: 10,00,000 */
export const formatCoins = (n: number) => n.toLocaleString('en-IN');

const trim = (n: number) => String(Math.round(n * 10) / 10);

/** short form for tight spots: 950, 1.8K, 2.5L */
export function compactCoins(n: number): string {
  if (n >= 100_000) return `${trim(n / 100_000)}L`;
  if (n >= 1_000) return `${trim(n / 1_000)}K`;
  return String(n);
}

/** stake chip labels: Free, 50, 1K, 1L, 10L */
export const stakeLabel = (n: number) => (n === 0 ? 'Free' : compactCoins(n));

/** +3,000 / −1,000 */
export const signedCoins = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatCoins(Math.abs(n))}`;
