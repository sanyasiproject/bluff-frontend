// Small constants and helpers shared by many screens and tables
import { formatCoins } from './coins';

/** how long a chat bubble stays by a seat */
export const BUBBLE_MS = 4000;

export const DAY_MS = 86_400_000;

/** podium places: medals, then "4th" */
export const MEDALS = ['🥇', '🥈', '🥉', '4th'];

/** "1 game", "3 games" */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** plural with Indian digit grouping: "1,20,000 pts" */
export const pluralCoins = (n: number, one: string, many = `${one}s`) => `${formatCoins(n)} ${n === 1 ? one : many}`;
