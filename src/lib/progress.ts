import type { GameSummary, LifetimeStats } from '../types';

/** XP from lifetime numbers; wins and caught bluffs count most */
export function xpOf(s: LifetimeStats): number {
  return s.gamesPlayed * 20 + s.wins * 50 + s.goodCalls * 5 + Math.max(0, s.bluffs - s.bluffsCaught) * 3;
}

const TITLES: [number, string][] = [
  [16, 'Legend'],
  [12, 'Bluff master'],
  [8, 'Card shark'],
  [5, 'Sly fox'],
  [3, 'Card player'],
  [1, 'Rookie'],
];

export interface Level {
  level: number;
  title: string;
  xp: number;
  /** 0..1 of the way to the next level */
  progress: number;
  toNext: number;
}

/** each level needs 100 XP more than the last: 0, 100, 300, 600, 1000… */
export function levelOf(s: LifetimeStats): Level {
  const xp = xpOf(s);
  let level = 1;
  while (xp >= 50 * level * (level + 1)) level++;
  const from = 50 * (level - 1) * level;
  const to = 50 * level * (level + 1);
  const title = TITLES.find(([min]) => level >= min)?.[1] ?? 'Rookie';
  return { level, title, xp, progress: (xp - from) / (to - from), toNext: to - xp };
}

export interface Achievement {
  emoji: string;
  title: string;
  desc: string;
  value: number;
  goal: number;
}

export function achievementsOf(s: LifetimeStats, coins: number): Achievement[] {
  return [
    { emoji: '🎴', title: 'First game', desc: 'Finish a game', value: s.gamesPlayed, goal: 1 },
    { emoji: '🥇', title: 'First win', desc: 'Win a game', value: s.wins, goal: 1 },
    { emoji: '🔥', title: 'Regular', desc: 'Play 25 games', value: s.gamesPlayed, goal: 25 },
    { emoji: '👑', title: 'Champion', desc: 'Win 10 games', value: s.wins, goal: 10 },
    { emoji: '🤥', title: 'Smooth liar', desc: 'Bluff 25 times', value: s.bluffs, goal: 25 },
    { emoji: '😎', title: 'Poker face', desc: '20 bluffs never caught', value: Math.max(0, s.bluffs - s.bluffsCaught), goal: 20 },
    { emoji: '🕵️', title: 'Detective', desc: 'Catch 10 bluffs', value: s.goodCalls, goal: 10 },
    { emoji: '🧠', title: 'Mind reader', desc: 'Catch 50 bluffs', value: s.goodCalls, goal: 50 },
    { emoji: '🧲', title: 'Collector', desc: 'Pick up 200 cards', value: s.cardsPickedUp, goal: 200 },
    { emoji: '💰', title: 'Rich', desc: 'Hold 10,000 coins', value: coins, goal: 10_000 },
    { emoji: '💎', title: 'Lakhpati', desc: 'Hold 1 lakh coins', value: coins, goal: 100_000 },
  ];
}

/** whole percent, or null when there is nothing to divide by */
export const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** wins in a row, newest first; stopped games don't break the streak */
export function winStreak(games: GameSummary[]): number {
  let n = 0;
  for (const g of games) {
    if (g.status === 'ended_early') continue;
    if (!g.won) break;
    n++;
  }
  return n;
}
