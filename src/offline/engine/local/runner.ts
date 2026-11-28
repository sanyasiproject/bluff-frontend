// Hosts one registry game on one phone with no server: the same rules, views, validation, timed steps and bots as a room.
import { GameError } from '../errors.js';
import { secureRandom, type RandomInt } from '../rand.js';
import type { GameEvent } from '../tableTypes.js';
import { gameInfo, TURN_TIMER, type AnnounceKind, type BotLevel, type GameConfig, type PluggedMove, type PluggedView } from '../types.js';
import type { ThinkJob } from '../games/chess/budget.js';
import { CHESS_TIMING, type ChessTable } from '../games/chess/game.js';
import { jobOf } from '../games/chess/rules.js';
import type { GameModule, PluggedGame } from '../games/module.js';
import { shiftTimes } from '../persist/shift.js';
import { isLocalKind, localModuleOf, type LocalKind } from './games.js';
import { localCodec } from './save.js';

export type { ThinkJob } from '../games/chess/budget.js';
export { LOCAL_GAMES, isLocalKind, type LocalKind } from './games.js';

/** a seat at the phone: a person (no bot) or a computer player at a level (chess also takes 1-8) */
export interface LocalSeat {
  id: string;
  name: string;
  bot?: BotLevel | number;
}

export interface LocalSettings {
  /** 2v2 (Ludo, Carrom): exactly 4 seats in slot order, partners opposite */
  teams?: boolean;
  /** the app's chess engine (its Web Worker): the bot's move in UCI for a think job */
  chessBot?: (job: ThinkJob) => Promise<string>;
  /** called when a bot's async think lands, so the app can tick at once */
  onUpdate?: () => void;
  /** every change, in order (moves with their payloads): enough to replay the game on another copy */
  onAction?: (a: LocalAction) => void;
  /** delays multiply by this (1 = human pace; tests use 0) */
  speed?: number;
  /** the deal, dice and colours (default: crypto random) */
  rand?: RandomInt;
  /** bots' choices (default Math.random) */
  random?: () => number;
}

/** one change to the game: a move, a timed step, the game clock, a walk-out, or the end once no person is left playing */
export type LocalAction =
  | { type: 'move'; seat: string; move: unknown; bot: boolean }
  | { type: 'auto' }
  | { type: 'clock' }
  | { type: 'leave'; seat: string }
  | { type: 'close' };

/** one seat's result once the game is over */
export interface LocalResult {
  id: string;
  name: string;
  bot: boolean;
  /** 1 = first; equal places are shared (a draw, 2v2 partners); null until over, or for an aborted game */
  place: number | null;
  /** another seat has the same place */
  shared: boolean;
  won: boolean;
  lost: boolean;
}

/** what the table hears for an event */
export interface LocalLine {
  kind: AnnounceKind;
  text: string;
}

/** a bot's pause before rolling, and before its move once it has rolled (ms at speed 1), as on the server */
const THINK = { roll: [800, 1600], move: [700, 1300] } as const;
/** chess seats given a named level think at this engine level */
const CHESS_LEVELS: Record<BotLevel, number> = { normal: 2, hard: 4, expert: 6 };
/** the most steps one tick plays (a long pause in the app catches up, but never forever) */
const MAX_STEPS = 50;

interface Plan {
  key: string;
  at: number;
  /** the bot this step is for (its level is in config while it runs), or null */
  bot: string | null;
  run?: () => GameEvent[];
  quiet?: boolean;
  /** a bot's move, ready to play */
  move?: unknown;
  /** an async think still running */
  thinking?: boolean;
}

/** builds a full room config for an offline game (stake, voice, ratings and Bluff's extras all off) */
export function localConfig(kind: LocalKind, opts: Record<string, string | number | boolean> = {}, teams = false, botLevel: BotLevel = 'expert'): GameConfig {
  const info = gameInfo(kind);
  const clean: Record<string, string | number | boolean> = {};
  for (const [id, v] of Object.entries(opts)) if (info.options.some((o) => o.id === id && o.choices.some((c) => c.value === v))) clean[id] = v;
  // offline chess is never rated
  if (kind === 'chess') clean.rated = 'no';
  return {
    opts: clean,
    game: kind,
    decks: 1,
    bluffRule: 'all',
    stake: 0,
    peeks: 0,
    bets: false,
    teams,
    handSize: 7,
    maxPicks: 1,
    stack7: true,
    botLevel,
    saza: false,
    secretLies: false,
    ranked: false,
    voice: false,
    kismat: false,
    seedhi: false,
    turnTimer: false,
    turnSec: TURN_TIMER.turnSec,
    shields: 0,
    c7Power: false,
    rangPicks: 1,
    rangStack: true,
    rangChallenge: true,
    rangSwap: false,
    rangForce: false,
    rangHand: 7,
    rangMissed: 2,
    rangDoubles: false,
    rangTime: 0,
  };
}

/** a new offline game; throws GameError when the seats or options can't play */
export function createLocalGame(kind: LocalKind, opts: Record<string, string | number | boolean>, seats: LocalSeat[], settings: LocalSettings = {}): LocalRunner {
  if (!isLocalKind(kind)) throw new GameError('This game is not available offline');
  const info = gameInfo(kind);
  if (seats.length < info.minPlayers || seats.length > info.maxPlayers) throw new GameError(`${info.name} needs ${info.minPlayers} to ${info.maxPlayers} players`);
  const ids = new Set(seats.map((s) => s.id));
  if (ids.size !== seats.length || seats.some((s) => !s.id)) throw new GameError('Every seat needs its own id');
  if (seats.every((s) => s.bot !== undefined)) throw new GameError('At least one person must play');
  const teams = !!settings.teams;
  if (teams && (!info.teams || seats.length !== 4)) throw new GameError('Teams need exactly 4 players');
  const firstBot = seats.find((s) => typeof s.bot === 'string')?.bot as BotLevel | undefined;
  const config = localConfig(kind, opts, teams, firstBot ?? 'expert');
  const mod = localModuleOf(kind);
  mod.checkStart?.(config, seats.length);
  return new LocalRunner(kind, mod, config, seats, settings);
}

/** a saved offline game (plain JSON) */
export interface LocalSave {
  v: 1;
  kind: LocalKind;
  seats: LocalSeat[];
  lastPerson: string | null;
  savedAt: number;
  data: unknown;
}

/** a saved game back in play: the same table, seats and bot levels, clocks paused while it was put away; bots plan their turn afresh (a chess bot asks chessBot again) */
export function restoreLocalGame(saved: string | LocalSave, settings: LocalSettings = {}, now = Date.now()): LocalRunner {
  let save: LocalSave;
  try {
    save = typeof saved === 'string' ? (JSON.parse(saved) as LocalSave) : saved;
  } catch {
    throw new GameError('This saved game can no longer be opened');
  }
  if (!save || save.v !== 1 || !isLocalKind(save.kind)) throw new GameError('This saved game can no longer be opened');
  const { config, game } = localCodec.decode(save.data) as { config: GameConfig; game: PluggedGame };
  shiftTimes(game, save.savedAt, now - save.savedAt);
  return new LocalRunner(save.kind, localModuleOf(save.kind), config, save.seats, settings, { game, lastPerson: save.lastPerson });
}

/** one offline game: the app calls view, move and tick (every frame or on a short timer) */
export class LocalRunner {
  readonly game: PluggedGame;
  readonly seats: readonly LocalSeat[];
  /** the step planned for the current turn key; undefined: plan again */
  private plan: Plan | undefined;
  private armed: { endsAt: number; key?: string; run(): GameEvent[] } | null = null;
  private lastPerson: string | null = null;
  private readonly speed: number;
  private readonly random: () => number;

  constructor(
    readonly kind: LocalKind,
    private readonly mod: GameModule<PluggedGame>,
    readonly config: GameConfig,
    seats: LocalSeat[],
    private readonly settings: LocalSettings = {},
    restored?: { game: PluggedGame; lastPerson: string | null },
  ) {
    this.seats = seats.map((s) => ({ ...s }));
    this.speed = settings.speed ?? 1;
    this.random = settings.random ?? Math.random;
    if (restored) {
      this.game = restored.game;
      this.lastPerson = restored.lastPerson;
      return;
    }
    const order = this.seats.map((s) => s.id);
    this.game = mod.create(order, config, settings.rand ?? secureRandom, order.filter((id) => this.isBot(id)));
    if (kind === 'chess') {
      const g = this.game as unknown as ChessTable;
      for (const s of this.seats) if (s.bot !== undefined) g.botLevels.set(s.id, typeof s.bot === 'number' ? Math.min(8, Math.max(1, Math.round(s.bot))) : CHESS_LEVELS[s.bot]);
    }
    const host = this.seats.find((s) => s.bot === undefined)!.id;
    mod.onStart?.(this.game, this.seats.map((s) => ({ id: s.id, userId: null, name: s.name, bot: s.bot !== undefined, host: s.id === host })));
    this.lastPerson = host;
  }

  get over(): boolean {
    return this.game.over;
  }

  /** whose turn it is; null in games where everyone moves at once or once it's over */
  get turnId(): string | null {
    return this.game.turnId;
  }

  isBot(id: string): boolean {
    return this.seats.some((s) => s.id === id && s.bot !== undefined);
  }

  nameOf(id: string | null): string {
    return this.seats.find((s) => s.id === id)?.name ?? 'Someone';
  }

  /** the person the phone faces: the person whose turn it is, else the last person who had one */
  viewer(): string {
    const t = this.game.turnId;
    if (t && !this.isBot(t)) this.lastPerson = t;
    return this.lastPerson ?? this.seats[0].id;
  }

  /** the table as one seat sees it (the same PluggedView the server sends); default: the viewer */
  view(forSeat?: string): PluggedView {
    const me = forSeat ?? this.viewer();
    return this.mod.view(this.game, me, this.seats.some((s) => s.id === me));
  }

  /** a person's move, checked like game:move; throws GameError with a message players can read */
  move(seatId: string, m: PluggedMove): GameEvent[] {
    if (this.game.over) throw new GameError('No game in progress');
    const p = (m ?? {}) as { kind?: unknown; move?: unknown };
    if (p.kind !== this.kind) throw new GameError('That move is for another game');
    if (p.move === undefined || p.move === null || typeof p.move !== 'object') throw new GameError('Invalid move');
    if (!this.seats.some((s) => s.id === seatId)) throw new GameError('You are not in this game');
    if (this.isBot(seatId)) throw new GameError('The computer plays that seat');
    const events = this.mod.move(this.game, seatId, p.move);
    this.settings.onAction?.({ type: 'move', seat: seatId, move: p.move, bot: false });
    return this.after(events);
  }

  /** a person leaves mid-game: a forfeit, as in a room */
  leave(seatId: string): GameEvent[] {
    if (this.game.over || !this.seats.some((s) => s.id === seatId)) return [];
    const events = this.game.leave(seatId);
    this.settings.onAction?.({ type: 'leave', seat: seatId });
    return this.after(events);
  }

  /** plays every timed step, game clock and bot move that is due by `now`; returns what happened */
  tick(now = Date.now()): GameEvent[] {
    const out: GameEvent[] = [];
    for (let i = 0; i < MAX_STEPS; i++) {
      const events = this.step(now);
      if (events === null) break;
      out.push(...events);
    }
    return out;
  }

  /** when the next tick has something to do (ms clock), or null while waiting on a person or a think */
  nextAt(): number | null {
    if (this.game.over) return null;
    const at = [this.armed?.endsAt ?? Infinity, this.plan && !this.plan.thinking ? this.plan.at : Infinity];
    const min = Math.min(...at);
    return Number.isFinite(min) ? min : null;
  }

  /** what the table hears for these events */
  describe(events: GameEvent[]): LocalLine[] {
    const out: LocalLine[] = [];
    for (const e of events) {
      const said = this.mod.describe(this.game, e, (id) => this.nameOf(id));
      if (said) out.push({ kind: said[0], text: said[1] });
    }
    return out;
  }

  /** the whole game as a JSON string for the phone's storage; restoreLocalGame (or LocalRunner.restore) brings it back */
  save(now = Date.now()): string {
    const data = localCodec.encode({ config: this.config, game: this.game });
    const out: LocalSave = { v: 1, kind: this.kind, seats: this.seats.map((s) => ({ ...s })), lastPerson: this.lastPerson, savedAt: now, data };
    return JSON.stringify(out);
  }

  /** a saved game back in play (see restoreLocalGame) */
  static restore(saved: string | LocalSave, settings: LocalSettings = {}, now = Date.now()): LocalRunner {
    return restoreLocalGame(saved, settings, now);
  }

  /** each seat's place and result (places are final once over) */
  results(): LocalResult[] {
    const g = this.game;
    const won = new Set(g.over ? g.winners() : []);
    const lost = new Set(g.over ? g.losers() : []);
    const given = new Map(this.seats.map((s) => [s.id, g.placeOf(s.id)]));
    // once over, seats the game leaves unplaced (out, walked out, the losing pair) share the place after the last one given
    if (g.over && !g.aborted) {
      const placed = [...given.values()].filter((p): p is number => p !== null);
      const next = placed.length > 0 ? Math.max(...placed) + 1 : 1;
      for (const s of this.seats) if (given.get(s.id) === null) given.set(s.id, won.has(s.id) ? 1 : next);
    }
    const count = (p: number | null) => [...given.values()].filter((x) => x === p).length;
    return this.seats.map((s) => {
      const place = given.get(s.id) ?? null;
      return { id: s.id, name: s.name, bot: s.bot !== undefined, place, shared: place !== null && count(place) > 1, won: won.has(s.id), lost: lost.has(s.id) };
    });
  }

  /** one due step, or null when nothing is due */
  private step(now: number): GameEvent[] | null {
    const g = this.game;
    if (g.over) return null;
    // the game clock: keyed clocks (chess) re-arm when the key moves on, the rest once per game (as the server's driver)
    const clock = this.mod.clock(g);
    if (!(this.armed && this.armed.key === clock?.key)) this.armed = clock ? { endsAt: clock.endsAt, key: clock.key, run: () => clock.run() } : null;
    if (this.armed && now >= this.armed.endsAt) {
      const run = this.armed.run;
      this.armed = null;
      const events = run();
      this.settings.onAction?.({ type: 'clock' });
      return this.after(events);
    }
    const key = this.mod.turnKey(g);
    if (this.plan === undefined || this.plan.key !== key) this.plan = this.makePlan(key, now);
    const p = this.plan;
    if (p.thinking || now < p.at) return null;
    this.plan = undefined;
    if (p.run) {
      const events = this.asBot(p.bot, () => p.run!());
      this.settings.onAction?.({ type: 'auto' });
      // a real-time step that changed nothing: plan the next one
      if (p.quiet && events.length === 0) return [];
      return this.after(events);
    }
    if (p.bot === null || g.turnId !== p.bot) return [];
    try {
      const events = this.asBot(p.bot, () => this.mod.move(g, p.bot!, p.move));
      this.settings.onAction?.({ type: 'move', seat: p.bot, move: p.move, bot: true });
      return this.after(events);
    } catch (err) {
      // planned for a moment that passed; the next tick plans again
      if (err instanceof GameError) return [];
      throw err;
    }
  }

  /** the next automatic step or bot move for this turn (at Infinity: waiting on a person) */
  private makePlan(key: string, now: number): Plan {
    const g = this.game;
    const id = g.turnId;
    const bot = id && this.isBot(id) ? id : null;
    const auto = this.asBot(bot, () => this.mod.auto(g));
    if (auto) return { key, at: now + auto.delayMs * this.speed, bot, run: auto.run, quiet: auto.quiet };
    if (!bot) return { key, at: Infinity, bot: null };
    if (this.kind === 'chess') return this.think(key, now, bot);
    if (this.mod.botThink) return this.think(key, now, bot);
    const move = this.asBot(bot, () => this.mod.botMove(g, bot, this.levelOf(bot), this.random));
    const [lo, hi] = (move as { type?: string }).type === 'roll' ? THINK.roll : THINK.move;
    return { key, at: now + (lo + this.random() * (hi - lo)) * this.speed, bot, move };
  }

  /** a bot that thinks asynchronously (chess in the app's worker, carrom in slices); its move lands only on the same turn */
  private think(key: string, now: number, bot: string): Plan {
    const plan: Plan = { key, at: now, bot, thinking: true };
    let job: Promise<unknown>;
    if (this.kind === 'chess') {
      const g = this.game as unknown as ChessTable;
      const ask = this.settings.chessBot;
      if (!ask) throw new Error('Offline chess needs settings.chessBot');
      const left = g.timeLeft(g.colorOf(bot)!);
      const ply = g.uci.length;
      // never instant: a short pause, shorter as the bot's clock runs down
      plan.at = now + Math.min(CHESS_TIMING.botMinMs, left === null ? Infinity : left / 40) * this.speed;
      job = ask(jobOf(g, bot, Math.floor(this.random() * 2 ** 31))).then((uci) => ({ type: 'move', uci, ply }));
    } else {
      job = this.asBot(bot, () => this.mod.botThink!(this.game, bot, this.random));
    }
    job.then(
      (move) => {
        if (this.plan !== plan) return;
        plan.move = move;
        plan.thinking = false;
        this.settings.onUpdate?.();
      },
      (err: unknown) => {
        if (this.plan !== plan) return;
        console.error('[offline] bot think failed:', err);
        // try again a little later
        this.plan = { key, at: Date.now() + 1000, bot: null };
        this.settings.onUpdate?.();
      },
    );
    return plan;
  }

  /** a bot seat's level for the bot brains (colour wars, darts and carrom read it from the config) */
  private levelOf(id: string): BotLevel {
    const b = this.seats.find((s) => s.id === id)?.bot;
    return typeof b === 'string' ? b : this.config.botLevel;
  }

  /** runs fn with config.botLevel set to this bot's own level */
  private asBot<T>(bot: string | null, fn: () => T): T {
    if (!bot) return fn();
    const cfg = this.config as { botLevel: BotLevel };
    const was = cfg.botLevel;
    cfg.botLevel = this.levelOf(bot);
    try {
      return fn();
    } finally {
      cfg.botLevel = was;
    }
  }

  /** after any change: the game ends once no person is still playing (bots never finish it alone), and the next step is planned afresh */
  private after(events: GameEvent[]): GameEvent[] {
    const g = this.game;
    this.plan = undefined;
    if (!g.over && !g.teams) {
      const people = this.seats.filter((s) => s.bot === undefined).map((s) => s.id);
      if (people.every((id) => !this.mod.inPlay(g, id))) {
        events = [...events, ...g.close()];
        this.settings.onAction?.({ type: 'close' });
      }
    }
    return events;
  }
}
