// The games playable offline on one phone, their seat limits and seat colours
import { BOT_LEVELS, CHESS_BOT_LEVELS, gameInfo, LUDO_COLOR_HEX, LUDO_SEAT_COLORS, PARTY_COLORS, SNAKES_COLORS, type BotLevel, type GameInfo } from '../types';

export const OFFLINE_GAMES = ['ludo', 'snakes', 'chess', 'gomoku', 'uttt', 'dots', 'colorwar', 'carrom', 'darts'] as const;
export type OfflineKind = (typeof OFFLINE_GAMES)[number];
export const isOfflineKind = (k: unknown): k is OfflineKind => (OFFLINE_GAMES as readonly unknown[]).includes(k);

/** a computer seat's level: Normal / Hard / Expert, or 1–8 in chess */
export type SeatLevel = BotLevel | number;

export interface OfflineSeat {
  id: string;
  name: string;
  /** set for a computer player */
  bot?: SeatLevel;
}

export interface OfflineSetup {
  kind: OfflineKind;
  opts: Record<string, string | number | boolean>;
  /** 2v2 where the game allows it (4 seats) */
  teams: boolean;
  /** chess: the board turns to face whoever moves */
  flip: boolean;
  /** seat order is colour order */
  seats: OfflineSeat[];
}

export const infoOf = (k: OfflineKind): GameInfo => gameInfo(k);
export const seatRange = (k: OfflineKind): [number, number] => [Math.max(2, infoOf(k).minPlayers), Math.min(4, infoOf(k).maxPlayers)];

const SNAKE_HEX: Record<string, string> = { red: '#e53935', blue: '#1e88e5', green: '#43a047', yellow: '#fdd835' };

/** the colour seat i plays in, for n seats */
export function seatColor(k: OfflineKind, n: number, i: number): string {
  if (k === 'ludo') return LUDO_COLOR_HEX[LUDO_SEAT_COLORS[Math.min(4, Math.max(2, n)) as 2 | 3 | 4][i] ?? 'red'];
  if (k === 'snakes') return SNAKE_HEX[SNAKES_COLORS[i]] ?? PARTY_COLORS[i];
  if (k === 'chess') return i === 0 ? '#f4efe3' : '#3a3430';
  return PARTY_COLORS[i % PARTY_COLORS.length];
}

export const levelChoices = (k: OfflineKind): { value: SeatLevel; label: string }[] =>
  k === 'chess' ? CHESS_BOT_LEVELS.map((l) => ({ value: l.level, label: `Level ${l.level}` })) : BOT_LEVELS.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }));

export const defaultLevel = (k: OfflineKind): SeatLevel => (k === 'chess' ? 3 : 'normal');

const PEOPLE = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
const BOTS = ['Robo Chintu', 'Robo Bunty', 'Robo Pinky', 'Robo Golu'];

let uid = 0;
export const seatId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;

export const personSeat = (i: number, name?: string): OfflineSeat => ({ id: seatId(), name: name?.trim() || PEOPLE[i] || `Player ${i + 1}` });
export const botSeat = (k: OfflineKind, i: number, level?: SeatLevel): OfflineSeat => ({ id: seatId(), name: BOTS[i] ?? `Robo ${i + 1}`, bot: level ?? defaultLevel(k) });

/** each option's default from the catalog */
export const defaultOpts = (k: OfflineKind): OfflineSetup['opts'] => Object.fromEntries(infoOf(k).options.filter((o) => o.id !== 'rated').map((o) => [o.id, o.default]));

/** a fresh setup: me plus one computer (two people for chess-like 2-seat games is a tap away) */
export function newSetup(k: OfflineKind, myName?: string): OfflineSetup {
  const opts = defaultOpts(k);
  if (k === 'chess') Object.assign(opts, { rated: 'no', color: 'white', time: 'none' });
  return { kind: k, opts, teams: false, flip: true, seats: [personSeat(0, myName), botSeat(k, 1)] };
}

/** keeps a setup valid for its game: seat count, bot levels and options */
export function fitSetup(s: OfflineSetup): OfflineSetup {
  const [min, max] = seatRange(s.kind);
  let seats = s.seats.slice(0, max);
  while (seats.length < min) seats = [...seats, botSeat(s.kind, seats.length)];
  const levels = levelChoices(s.kind).map((c) => c.value);
  seats = seats.map((x) => (x.bot !== undefined && !levels.includes(x.bot) ? { ...x, bot: defaultLevel(s.kind) } : x));
  const teams = s.teams && infoOf(s.kind).teams && seats.length === 4;
  return { ...s, seats, teams, opts: { ...defaultOpts(s.kind), ...s.opts } };
}

/** bots' room level: the strongest non-chess level seated (the room has one level), chess uses opts.level */
export function roomBotLevel(s: OfflineSetup): BotLevel {
  const lv = s.seats.map((x) => x.bot).filter((b): b is BotLevel => typeof b === 'string');
  return lv.includes('expert') ? 'expert' : lv.includes('hard') ? 'hard' : 'normal';
}
