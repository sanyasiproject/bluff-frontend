// Shapes every table game shares with the room: events, stats, the TableGame contract (pure: only types.ts).
import type { Card, CarromFoul, DartThrow, FruitItemKind, GameConfig, MissionCounter, Rank, RangCard, RangColor, SnakesLastMove, SpikeDir, Suit } from './types.js';

/**
 * How a player really plays Bluff, counted from every play the server saw (the true cards, caught or not).
 * Saved on the account for the bots; never sent to any app. Never includes a game that is still running.
 */
export interface Habits {
  /** plays that opened a round, how many hid a fake, and how many claimed a rank they held none of */
  openPlays: number;
  openLies: number;
  openNone: number;
  /** plays following a round while holding its rank, and how many hid fakes */
  followPlays: number;
  followLies: number;
  /** turns following a round while holding none of its rank: fakes pushed, or passed */
  pushes: number;
  passNone: number;
  /** passes while holding the round's rank */
  passHeld: number;
  /** all lies, and the fake cards in them */
  lies: number;
  lieCards: number;
  /** plays that emptied their hand, and how many of those were lies */
  finishPlays: number;
  finishLies: number;
  /** turns with 3 cards or fewer that couldn't be finished honestly, and how many they faked the rest to finish anyway */
  endTurns: number;
  endFakes: number;
  /** cards of mixed plays (real and fake together) by where they sat in tap order, and how many of them were fake */
  slotFirst: number;
  fakeFirst: number;
  slotMid: number;
  fakeMid: number;
  slotLast: number;
  fakeLast: number;
  /** honest plays while holding 2+ of the rank, and how many of those kept some back */
  heldHonest: number;
  heldKept: number;
  /** lies while holding 1+ of the rank, and how many of those kept real ones back (fake now, the real ones later) */
  heldLies: number;
  liesKept: number;
  /** plays that took the round's claims past the copies in the game (so one claim was a lie), and how many of those were lies */
  overPlays: number;
  overLies: number;
  /** bots' plays they had their chance to call (the play stood, or they called it; not a bot's last cards) and how many they called; the same for the bot plays that hid a fake */
  botSeen: number;
  botCalls: number;
  botLieSeen: number;
  botLieCalls: number;
}

/** a bet on a bluff call: the loser of the call pays the winner when the game is saved */
export interface BetResult {
  from: string;
  to: string;
  amount: number;
}

/** per-player counts behind the end-of-game awards */
export interface PlayerStats {
  bluffs: number;
  caught: number;
  goodCalls: number;
  wrongCalls: number;
  pickedUp: number;
  plays: number;
  /** plays by others this player could have called bluff on */
  chances: number;
  /** Crazy 7: sevens played */
  sevens?: number;
  /** Rang: wilds (and +4s) played */
  wilds?: number;
  /** Crazy 7: times they forgot to say last card */
  missedCalls?: number;
  /** Crazy 7: cards picked (kept apart from Bluff's pickedUp, which feeds the Collector achievement) */
  picks?: number;
  /** Crazy 7: 7s played to answer a waiting 7 */
  stacks?: number;
  /** Crazy 7: "last card" said in time */
  lastCalls?: number;
  /** Bluff: how they really played this game, added to the account's habits when the game is saved */
  habits?: Habits;
  /** registry games: the game's own per-account counters (Ludo: kills, killed, home, sixes), added to stats.perGame when saved */
  tallies?: Record<string, number>;
}

/** what a room reads from whichever game is on (Bluff's Game, Crazy7Game or RangGame); C is that game's card */
export interface TableGame<C extends { id: string } = Card> {
  readonly order: string[];
  readonly config: GameConfig;
  readonly hands: Map<string, C[]>;
  readonly stats: Map<string, PlayerStats>;
  readonly kicked: Set<string>;
  readonly forfeited: Set<string>;
  readonly teams: [string[], string[]] | null;
  readonly bets: BetResult[];
  readonly endedEarly: boolean;
  pile: C[];
  places: string[];
  turnId: string | null;
  over: boolean;
  aborted: boolean;
  closed: boolean;
  hand(id: string): C[];
  /** finishing place; once over, everyone still in is ranked by fewest cards left */
  placeOf(id: string): number | null;
  /** points of the cards a player still holds, for the final ranking (lower is better) */
  handValueOf(id: string): number;
  winners(): string[];
  losers(): string[];
  leave(id: string): GameEvent[];
  removePlayer(id: string): GameEvent[];
  close(): GameEvent[];
}

/** one game's numbers for the mission counters */
export type MissionCounts = Partial<Record<MissionCounter, number>>;

export type GameEvent =
  | { kind: 'play'; playerId: string; count: number; rank: Rank; shielded?: boolean }
  | { kind: 'pass'; playerId: string }
  | { kind: 'bluff'; callerId: string; playerId: string; bluff: boolean; loserId: string; pileCount: number; bet: number }
  | { kind: 'newRound'; starterId: string }
  | { kind: 'roundEnd'; starterId: string; discarded: number }
  | { kind: 'finish'; playerId: string; place: number }
  | { kind: 'gameOver'; loserId: string | null }
  // Crazy 7
  /** power cards: wish (the suit named with a J), skipped (by an 8, or an A with 2 players), reversed (by an A) */
  | { kind: 'c7play'; playerId: string; card: Card; penalty: number; wish?: Suit | null; skipped?: string | null; reversed?: boolean }
  /** forced: picked automatically because nothing matched top */
  | { kind: 'c7pick'; playerId: string; count: number; forced: boolean; top: Card | null }
  /** missed: forgot last card; forced: had no 7 to answer with */
  | { kind: 'c7penalty'; playerId: string; count: number; missed: boolean; forced: boolean }
  | { kind: 'c7pass'; playerId: string; auto: boolean }
  | { kind: 'c7call'; playerId: string }
  | { kind: 'c7missed'; playerId: string }
  | { kind: 'c7shuffle'; count: number }
  // Rang: color is the colour named with a wild; skipped by a Skip (or Reverse with 2 players); targetId swapped hands with a 7; rotated by a 0
  // doubles: cards holds every card put down (card is the last, now on top); forced: played by Force play right after the pick
  | { kind: 'rgplay'; playerId: string; card: RangCard; color: RangColor | null; penalty: number; skipped?: string | null; reversed?: boolean; targetId?: string | null; rotated?: boolean; cards?: RangCard[]; forced?: boolean }
  | { kind: 'rgpick'; playerId: string; count: number; forced: boolean }
  | { kind: 'rgpenalty'; playerId: string; count: number; missed: boolean; forced: boolean }
  | { kind: 'rgpass'; playerId: string; auto: boolean }
  | { kind: 'rgcall'; playerId: string }
  | { kind: 'rgmissed'; playerId: string }
  | { kind: 'rgshuffle'; count: number }
  /** the hit player challenged a +4: guilty (played while holding the colour) means its player picks; else the challenger picks */
  | { kind: 'rgchallenge'; playerId: string; targetId: string; guilty: boolean; count: number }
  // Ludo (registry game)
  | { kind: 'ludo'; ev: LudoEvent }
  | { kind: 'snakes'; ev: SnakesEvent }
  | { kind: 'rmcs'; ev: RmcsEvent }
  | { kind: 'darts'; ev: DartsEvent }
  | { kind: 'dots'; ev: DotsEvent }
  | { kind: 'colorwar'; ev: ColorWarEvent }
  | { kind: 'fruit'; ev: FruitEvent }
  | { kind: 'spikes'; ev: SpikesEvent }
  | { kind: 'chess'; ev: ChessEvent }
  | { kind: 'carrom'; ev: CarromGameEvent }
  | { kind: 'bomb'; ev: BombEvent }
  | { kind: 'seabattle'; ev: SeaEvent }
  | { kind: 'gomoku'; ev: GomokuEvent }
  | { kind: 'uttt'; ev: UtttEvent }
  | { kind: 'wordhunt'; ev: WordHuntEvent };

/** Five in a Row: a stone (blocked: it cut off someone's four or open three) */
export type GomokuEvent = { type: 'stone'; playerId: string; at: number; blocked: boolean };

/** Ultimate Tic-Tac-Toe: a mark (won: it took its small board; free: the opponent may play anywhere) */
export type UtttEvent = { type: 'mark'; playerId: string; board: number; cell: number; won: boolean; free: boolean };

/** Word Grid Hunt: a round starts, a word counted (never the word itself), a round ends */
export type WordHuntEvent =
  | { type: 'round'; round: number }
  | { type: 'word'; playerId: string; len: number }
  | { type: 'reveal'; round: number; best: { playerId: string; word: string } | null };

/** Carrom: a shot (pocketed, foul, queen news) and a finished board */
export type CarromGameEvent =
  | { type: 'shot'; playerId: string; pocketed: string[]; foul: CarromFoul | null; queen: 'pocketed' | 'covered' | 'returned' | null; again: boolean; auto: boolean }
  | { type: 'board'; board: number; winners: string[]; points: number };

/** Bomb Pass: play starts, a pass, a wrong answer, a new task, the fuse getting hot, a BOOM, a new round */
export type BombEvent =
  | { type: 'go' }
  | { type: 'pass'; from: string; to: string; ms: number }
  | { type: 'wrong'; playerId: string }
  | { type: 'task'; playerId: string }
  | { type: 'heat'; heat: number }
  | { type: 'boom'; playerId: string; out: boolean; place: number | null }
  | { type: 'round'; round: number; holder: string };

/** Sea Battle: someone is ready, the battle starts, a shot or power (never a radar's count), a fleet sunk */
export type SeaEvent =
  | { type: 'ready'; playerId: string }
  | { type: 'battle' }
  | { type: 'shot'; by: string; target: string; kind: 'fire' | 'salvo' | 'torpedo' | 'radar'; hits: number; sunk: number[]; earned: string | null; again: boolean; auto: boolean }
  | { type: 'out'; playerId: string; by: string; place: number };

/** chess: a move (with its SAN), an offer made or answered, a takeback done */
export type ChessEvent =
  | { type: 'move'; playerId: string; uci: string; san: string; ply: number }
  | { type: 'offer'; playerId: string; offer: 'draw' | 'takeback'; answer: 'ask' | 'yes' | 'no' }
  | { type: 'takeback'; plies: number };

/** Fruit Slice Duel: play starts, an item pops up, a strike is taken, the item's result (winner: fastest on a fruit; slowed: magnet strikers) */
export type FruitEvent =
  | { type: 'go'; rounds: number }
  | { type: 'item'; round: number; kind: FruitItemKind }
  | { type: 'strike'; playerId: string; round: number }
  | { type: 'result'; round: number; kind: FruitItemKind; winner: string | null; points: number; slowed: string[] };

/** Spike Attack: play starts, a player moves (to: [x, y] in arena units; live, coalesced into views), a side's wall is warned, a wall strikes (hit: players who lost a life), a player is out, time runs out */
export type SpikesEvent =
  | { type: 'go' }
  | { type: 'step'; playerId: string; to: [number, number] }
  | { type: 'warn'; id: number; dir: SpikeDir }
  | { type: 'strike'; id: number; dir: SpikeDir; hit: string[] }
  | { type: 'out'; playerId: string; place: number }
  | { type: 'timeUp' }
  | { type: 'shift'; phase: 'warn' | 'land' | 'cancel' };

/** one Saanp Seedhi roll (moved: the token moved; lost: a third 6 lost the turn), then the move it made */
export type SnakesEvent =
  | { type: 'roll'; playerId: string; roll: number; sixes: number; moved: boolean; lost: boolean }
  | { type: 'move'; move: SnakesLastMove };

/** one dart (turnTotal: the turn's points so far), then the turn's end (bust: went below 0; out: hit exactly 0) */
export type DartsEvent =
  | { type: 'throw'; dart: DartThrow; turnTotal: number }
  | { type: 'turnEnd'; playerId: string; total: number; bust: boolean; out: boolean; t180: boolean };

/** one Dots and Boxes line and the boxes it closed (any closed box gives another turn) */
export type DotsEvent = { type: 'line'; playerId: string; line: number; closed: number[] };

/** one Colour Wars tap with its chain (waves: cells that burst, wave by wave; captured: cells taken from others), or a player knocked out */
export type ColorWarEvent =
  | { type: 'tap'; playerId: string; cell: number; first: boolean; waves: number[][]; captured: number }
  | { type: 'out'; playerId: string; place: number };

/** one Raja Mantri Chor Sipahi step; events carry only what everyone may see */
export type RmcsEvent =
  | { type: 'deal'; round: number; rounds: number }
  /** raja: this chit was the Raja's (shown to all); auto: opened by itself */
  | { type: 'open'; playerId: string; raja: boolean; auto: boolean }
  | { type: 'guessing'; mantriId: string }
  | { type: 'result'; round: number; mantriId: string; chorId: string; guess: string | null; correct: boolean };

/** one Ludo step; owner: whose goti moved (a 2v2 partner's once the mover's own are all home) */
export type LudoEvent =
  | { type: 'roll'; playerId: string; roll: number; sixes: number }
  | { type: 'move'; playerId: string; owner: string; token: number; from: number; to: number; roll: number; captured: { playerId: string; token: number; from: number }[]; home: boolean; bonus: boolean }
  /** no goti could move, or the third 6 in a row lost the turn */
  | { type: 'pass'; playerId: string; roll: number; threeSixes: boolean }
  /** Master mode: nobody could move for a while, so every goti may now go home */
  | { type: 'unlock' };
