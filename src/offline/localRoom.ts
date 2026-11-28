// The local "room": a RoomView and Actions built around the offline runner, so the online tables play unchanged
import type { GameConfig, PluggedMove, PluggedView, PublicPlayer, RoomView } from '../types';
import type { Actions } from '../useBluff';
import { roomBotLevel, type OfflineSetup } from './games';

/** what the adapter needs from a running local game (engineBridge wraps the synced runner in this) */
export interface LocalGame {
  /** the table as one seat sees it */
  view(forSeat: string): PluggedView;
  /** plays a seat's move; throws an Error players can read when it's refused */
  move(seatId: string, m: PluggedMove): void;
  /** runs due automatic steps and bot turns; true when something changed */
  tick(now: number): boolean;
  /** whose turn it is (null: nobody's, or a simultaneous step) */
  turnId(): string | null;
  over(): boolean;
  /** game over: winners, places and losers */
  results(): { winnerIds: string[]; loserIds: string[]; places: Record<string, number | null> };
  /** a JSON snapshot to resume from, or null when the runner can't */
  snapshot(): unknown;
}

export const OFFLINE_CODE = 'OFFLINE';
/** game over: the phone is nobody's seat, so every person shows by name (no "You") */
export const OFFLINE_VIEWER = 'offline-phone';

const player = (s: OfflineSetup['seats'][number], place: number | null, over: boolean): PublicPlayer =>
  ({
    id: s.id, name: over && s.bot !== undefined ? `🤖 ${s.name}` : s.name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place,
    registered: false, coins: null, username: null, level: null, bot: s.bot !== undefined, ready: true, saza: null,
  }) as PublicPlayer;

/** the room config the tables read: the game's options, teams and the bots' level */
export function configOf(setup: OfflineSetup): GameConfig {
  const opts = { ...setup.opts };
  if (setup.kind === 'chess') {
    const lv = setup.seats.find((x) => typeof x.bot === 'number')?.bot;
    Object.assign(opts, { rated: 'no', color: 'white', ...(typeof lv === 'number' && { level: lv }) });
  }
  return {
    game: setup.kind, opts, stake: 0, decks: 1, bluffRule: 'all', peeks: 0, bets: false, teams: setup.teams, handSize: 7, maxPicks: 1, stack7: false,
    botLevel: roomBotLevel(setup), saza: false, secretLies: false, ranked: false, voice: false, kismat: false, seedhi: false, turnTimer: false, turnSec: 30,
    c7Power: false, rangPicks: 1, rangStack: true, rangChallenge: true, rangSwap: false, rangForce: false, rangHand: 7, rangMissed: 2, rangTime: 0, rangDoubles: false, shields: 0,
  } as GameConfig;
}

/** first person seated: the "host" the tables ask for game-over buttons and the board's looks */
export const hostOf = (setup: OfflineSetup) => (setup.seats.find((x) => x.bot === undefined) ?? setup.seats[0]).id;

/** the RoomView a table gets: everyone seated, no coins, the given seat as "me" */
export function roomViewOf(setup: OfflineSetup, game: LocalGame, meId: string): RoomView {
  const over = game.over();
  const res = over ? game.results() : null;
  // over: the runner's places (shared ones equal) and winners; nobody is marked "Loser"
  const hostId = over ? OFFLINE_VIEWER : hostOf(setup);
  const viewer = over ? OFFLINE_VIEWER : meId;
  const teams = setup.teams && setup.seats.length === 4 ? ([[setup.seats[0].id, setup.seats[2].id], [setup.seats[1].id, setup.seats[3].id]] as [string[], string[]]) : null;
  return {
    code: OFFLINE_CODE, meId: viewer, hostId, phase: over ? 'over' : 'playing', config: configOf(setup),
    players: setup.seats.map((s) => player(s, res?.places[s.id] ?? null, over)),
    watchers: [], turnId: over ? null : game.turnId(), turnMsLeft: null, now: Date.now(), strict: false,
    roundRank: null, kismat: null, pileCount: 0, pileTopBy: [], lastPlay: null, passedIds: [], reveal: null, hand: [],
    loserId: null, loserIds: [], endedEarly: false, awards: [], watch: null, coinResults: null, stopped: false,
    bluffCallsLeft: 0, peeksLeft: 0, shieldsLeft: 0, betLimit: 0, teams, winnerIds: res?.winnerIds ?? [], slots: null, swapAsks: [], partnerHand: null,
    watchRequests: [], leftPlayers: [], crazy7: null, rang: null, plugged: game.view(over ? hostOf(setup) : meId), sazaPick: null, lieRecap: null, secret: null, secrets: [],
  } as RoomView;
}

export interface LocalHandlers {
  /** a seat's move; returns an error text or null */
  move: (m: PluggedMove) => string | null;
  toast: (text: string) => void;
  playAgain: () => void;
  changePlayers: () => void;
  exit: () => void;
}

/** the actions a table calls; anything that needs a server (chat, throws, voice, invites) does nothing */
export function localActions(h: LocalHandlers): Actions {
  const run = (m: PluggedMove, loud: boolean) => {
    const err = h.move(m);
    if (err && loud) h.toast(err);
    return err === null;
  };
  const known: Record<string, unknown> = {
    gameMove: async (m: PluggedMove) => run(m, true),
    gameMoveQuiet: async (m: PluggedMove) => run(m, false),
    toast: h.toast,
    rematch: async () => (h.playAgain(), true),
    toLobby: async () => (h.changePlayers(), true),
    endGame: async () => (h.changePlayers(), true),
    leave: async () => (h.exit(), true),
    leaveAnyway: async () => (h.exit(), true),
    ludoLook: async () => undefined,
    nudge: async () => ({ ok: false, error: 'Offline' }),
    playsOf: async () => null,
  };
  return new Proxy({} as Actions, { get: (_t, k: string) => (k in known ? known[k] : async () => null) });
}
