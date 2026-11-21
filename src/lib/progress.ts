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
  /** its ladder (games, wins…); a player card shows only the highest earned in each */
  group?: string;
}

/**
 * every achievement, worked out from lifetime stats (nothing is stored, so a goal must never be raised: that would take badges away).
 * The first 11 are the originals, unchanged; the harder tiers sit next to them in ladders and take weeks to months
 */
export function achievementsOf(s: LifetimeStats, coins: number): Achievement[] {
  const clean = Math.max(0, s.bluffs - s.bluffsCaught);
  const level = levelOf(s);
  const crazy7 = s.crazy7Games ?? 0;
  return [
    // games played
    { emoji: '🎴', title: 'First game', desc: 'Finish a game', value: s.gamesPlayed, goal: 1, group: 'games played' },
    { emoji: '🔥', title: 'Regular', desc: 'Play 25 games', value: s.gamesPlayed, goal: 25, group: 'games played' },
    { emoji: '🪑', title: 'Table regular', desc: 'Play 100 games', value: s.gamesPlayed, goal: 100, group: 'games played' },
    { emoji: '🌙', title: 'Night owl', desc: 'Play 250 games', value: s.gamesPlayed, goal: 250, group: 'games played' },
    { emoji: '🎖️', title: 'Veteran', desc: 'Play 500 games', value: s.gamesPlayed, goal: 500, group: 'games played' },
    { emoji: '🏛️', title: 'Living legend', desc: 'Play 1,000 games', value: s.gamesPlayed, goal: 1_000, group: 'games played' },
    // wins
    { emoji: '🥇', title: 'First win', desc: 'Win a game', value: s.wins, goal: 1, group: 'wins' },
    { emoji: '👑', title: 'Champion', desc: 'Win 10 games', value: s.wins, goal: 10, group: 'wins' },
    { emoji: '🏆', title: "Winner's circle", desc: 'Win 50 games', value: s.wins, goal: 50, group: 'wins' },
    { emoji: '⚡', title: 'Unstoppable', desc: 'Win 150 games', value: s.wins, goal: 150, group: 'wins' },
    { emoji: '🦁', title: 'Bluff royalty', desc: 'Win 400 games', value: s.wins, goal: 400, group: 'wins' },
    { emoji: '🌟', title: 'Hall of fame', desc: 'Win 1,000 games', value: s.wins, goal: 1_000, group: 'wins' },
    // bluffs
    { emoji: '🤥', title: 'Smooth liar', desc: 'Bluff 25 times', value: s.bluffs, goal: 25, group: 'bluffs' },
    { emoji: '👅', title: 'Silver tongue', desc: 'Bluff 150 times', value: s.bluffs, goal: 150, group: 'bluffs' },
    { emoji: '🎭', title: 'Master of lies', desc: 'Bluff 600 times', value: s.bluffs, goal: 600, group: 'bluffs' },
    { emoji: '🦊', title: 'Born liar', desc: 'Bluff 2,000 times', value: s.bluffs, goal: 2_000, group: 'bluffs' },
    // bluffs nobody caught
    { emoji: '😎', title: 'Poker face', desc: '20 bluffs never caught', value: clean, goal: 20, group: 'bluffs nobody caught' },
    { emoji: '🗿', title: 'Stone face', desc: '120 bluffs never caught', value: clean, goal: 120, group: 'bluffs nobody caught' },
    { emoji: '🫥', title: 'Untouchable', desc: '500 bluffs never caught', value: clean, goal: 500, group: 'bluffs nobody caught' },
    { emoji: '👻', title: 'Ghost', desc: '1,500 bluffs never caught', value: clean, goal: 1_500, group: 'bluffs nobody caught' },
    // bluffs caught
    { emoji: '🕵️', title: 'Detective', desc: 'Catch 10 bluffs', value: s.goodCalls, goal: 10, group: 'bluffs caught' },
    { emoji: '🧠', title: 'Mind reader', desc: 'Catch 50 bluffs', value: s.goodCalls, goal: 50, group: 'bluffs caught' },
    { emoji: '🔍', title: 'Lie detector', desc: 'Catch 200 bluffs', value: s.goodCalls, goal: 200, group: 'bluffs caught' },
    { emoji: '🎩', title: 'Sherlock', desc: 'Catch 600 bluffs', value: s.goodCalls, goal: 600, group: 'bluffs caught' },
    { emoji: '👁️', title: 'All-seeing eye', desc: 'Catch 1,500 bluffs', value: s.goodCalls, goal: 1_500, group: 'bluffs caught' },
    // cards picked up
    { emoji: '🧲', title: 'Collector', desc: 'Pick up 200 cards', value: s.cardsPickedUp, goal: 200, group: 'cards picked up' },
    { emoji: '📦', title: 'Hoarder', desc: 'Pick up 1,500 cards', value: s.cardsPickedUp, goal: 1_500, group: 'cards picked up' },
    { emoji: '🏔️', title: 'Pile mountain', desc: 'Pick up 6,000 cards', value: s.cardsPickedUp, goal: 6_000, group: 'cards picked up' },
    // Crazy 7
    { emoji: '7️⃣', title: 'Crazy start', desc: 'Play 10 Crazy 7 games', value: crazy7, goal: 10, group: 'Crazy 7' },
    { emoji: '🌀', title: 'Crazy fan', desc: 'Play 100 Crazy 7 games', value: crazy7, goal: 100, group: 'Crazy 7' },
    { emoji: '🎰', title: 'Crazy 7 master', desc: 'Play 400 Crazy 7 games', value: crazy7, goal: 400, group: 'Crazy 7' },
    // level
    { emoji: '🌱', title: 'Rising star', desc: 'Reach level 10', value: level, goal: 10, group: 'level' },
    { emoji: '🌳', title: 'Seasoned', desc: 'Reach level 25', value: level, goal: 25, group: 'level' },
    { emoji: '🏯', title: 'Grandmaster', desc: 'Reach level 50', value: level, goal: 50, group: 'level' },
    // coins
    { emoji: '💰', title: 'Rich', desc: 'Hold 10,000 coins', value: coins, goal: 10_000, private: true, group: 'coins' },
    { emoji: '💎', title: 'Lakhpati', desc: 'Hold 1 lakh coins', value: coins, goal: 100_000, private: true, group: 'coins' },
    { emoji: '🏦', title: 'Seth ji', desc: 'Hold 10 lakh coins', value: coins, goal: 1_000_000, private: true, group: 'coins' },
  ];
}

/** the highest earned achievement of each ladder, in ladder order: a short list for player cards */
export function topEarned(list: Achievement[]): Achievement[] {
  const best = new Map<string, Achievement>();
  for (const a of list) if (a.value >= a.goal) best.set(a.group ?? a.title, a);
  return [...best.values()];
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
