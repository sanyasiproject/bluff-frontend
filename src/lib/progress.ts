import { DAILY_GAME_REWARDS, levelOf, xpForLevel, xpOf, type GameSummary, type LifetimeStats } from '../types';

export interface Title {
  /** first level with this title */
  level: number;
  title: string;
  emoji: string;
}

/** titles spread up to level 50 (122,500 XP), so Legend takes months of regular play */
export const TITLES: Title[] = [
  { level: 1, title: 'Rookie', emoji: '🌱' },
  { level: 3, title: 'Card player', emoji: '🃏' },
  { level: 6, title: 'Sly fox', emoji: '🦊' },
  { level: 10, title: 'Card shark', emoji: '🦈' },
  { level: 15, title: 'Trickster', emoji: '🎭' },
  { level: 20, title: 'Bluff master', emoji: '🤥' },
  { level: 25, title: 'Grandmaster', emoji: '♟️' },
  { level: 30, title: 'Mastermind', emoji: '🧠' },
  { level: 40, title: 'Bluff king', emoji: '👑' },
  { level: 50, title: 'Legend', emoji: '🏆' },
];

export interface Level {
  level: number;
  title: string;
  emoji: string;
  xp: number;
  /** 0..1 of the way to the next level */
  progress: number;
  toNext: number;
}

export const titleOf = (level: number): Title => [...TITLES].reverse().find((t) => level >= t.level) ?? TITLES[0];

export const levelTitle = (level: number) => titleOf(level).title;

/** the next title to reach, or null at Legend */
export const nextTitle = (level: number): Title | null => TITLES.find((t) => t.level > level) ?? null;

/** level, title and progress towards the next level; the level formula is shared with the server */
export function levelInfo(s: LifetimeStats): Level {
  const xp = xpOf(s);
  const level = levelOf(s);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  const { title, emoji } = titleOf(level);
  return { level, title, emoji, xp, progress: (xp - from) / (to - from), toNext: to - xp };
}

/** the next daily games step to reach, or null when every step is done today */
export function nextGameReward(gamesToday: number): { games: number; coins: number; left: number } | null {
  const next = DAILY_GAME_REWARDS.find((r) => r.games > gamesToday);
  return next ? { ...next, left: next.games - gamesToday } : null;
}

/** coins earned today from the daily games steps already reached */
export const earnedFromGames = (gamesToday: number) =>
  DAILY_GAME_REWARDS.filter((r) => r.games <= gamesToday).reduce((sum, r) => sum + r.coins, 0);

export interface Achievement {
  emoji: string;
  title: string;
  desc: string;
  value: number;
  goal: number;
  /** based on coins, so it's left off other people's public profile */
  private?: boolean;
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
    { emoji: '💰', title: 'Rich', desc: 'Hold 10,000 coins', value: coins, goal: 10_000, private: true },
    { emoji: '💎', title: 'Lakhpati', desc: 'Hold 1 lakh coins', value: coins, goal: 100_000, private: true },
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
