// Dev only (?ludoPreview=1, =auto, =kill, =over): the Ludo table on a fake room with a tiny local rule engine, no server
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ludoIsSafe,
  ludoRingOf,
  LUDO_HOME,
  type GameConfig,
  type LudoLastMove,
  type LudoSeat,
  type LudoView,
  type PluggedMove,
  type PublicPlayer,
  type RoomView,
} from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { LudoTable } from './LudoTable';

const IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];
const COLORS = ['red', 'green', 'yellow', 'blue'] as const;
const START: number[][] = [
  [-1, 5, 20, 52],
  [10, -1, -1, 30],
  [44, 2, -1, -1],
  [-1, 15, 47, -1],
];

/** align sets: a = gotis home (4, 3, 2, 1) and in lanes; b = a yard, 4, 3 and 2 on one square */
const ALIGN_A: number[][] = [
  [56, 56, 56, 56],
  [56, 56, 56, -1],
  [56, 56, 51, -1],
  [56, 55, -1, -1],
];
const ALIGN_B: number[][] = [
  [-1, -1, 3, 20],
  [10, 10, 10, 10],
  [20, 20, 20, -1],
  [5, 5, 53, -1],
];
/** c: two home and one 3 away, for the ghost going home (&dice=3) */
const ALIGN_C: number[][] = [
  [56, 56, 53, 50],
  [56, -1, -1, -1],
  [56, 56, 56, -1],
  [20, -1, -1, -1],
];

/** bots' looks, so every style shows at one table; mine come from my picks */
const BOT_LOOKS = [undefined, { board: 'night', goti: 'metal', dice: 'jade' }, { board: 'royal', goti: 'crown', dice: 'gold' }, { board: 'wood', goti: 'gem', dice: 'ruby' }];

const player = (i: number): PublicPlayer =>
  ({ ludoLook: BOT_LOOKS[i], id: IDS[i], name: NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

function movableOf(seat: LudoSeat, dice: number): number[] {
  return seat.tokens.flatMap((p, t) => ((p < 0 && dice === 6) || (p >= 0 && p + dice <= LUDO_HOME) ? [t] : []));
}

export function LudoPreview() {
  const mode = new URLSearchParams(location.search).get('ludoPreview') ?? '1';
  const kill = mode === 'kill';
  const auto = mode === 'auto' || kill;
  const over = mode === 'over';
  // ?ludoPreview=align&set=a|b&me=0..3&dice=N: frozen gotis for checking where they stand, my colour picked by &me
  const align = mode === 'align';
  const q = new URLSearchParams(location.search);
  const rot = align ? Number(q.get('me') ?? 0) % 4 : 0;
  const ALIGN = { a: ALIGN_A, b: ALIGN_B, c: ALIGN_C }[q.get('set') ?? 'a'] ?? ALIGN_A;
  const preDice = align ? Number(q.get('dice') ?? 0) : 0;
  const [lv, setLv] = useState<LudoView>(() => ({
    mode: 'master',
    seats: COLORS.map((_, i) => ({ playerId: IDS[i], color: COLORS[(i + rot) % 4], tokens: align ? [...ALIGN[i]] : kill && i === 3 ? [-1, 15, 22, -1] : [...START[i]], kills: i === 1 ? 2 : 0, home: 0, place: over ? [2, 1, 3, 4][i] : null, score: 0, unlocked: i !== 0 })),
    turnId: 'me',
    dice: preDice || null,
    rollSeq: preDice ? 1 : 0,
    rolled: !!preDice,
    movable: preDice ? ALIGN[0].flatMap((p, t) => ((p < 0 && preDice === 6) || (p >= 0 && p + preDice <= LUDO_HOME) ? [t] : [])) : [],
    sixes: 0,
    movesFor: null,
    last: null,
    endsAt: null,
    teams: null,
    kills: over ? [{ by: 'b1', victim: 'me', at: 1 }, { by: 'b1', victim: 'b3', at: 2 }, { by: 'me', victim: 'b2', at: 3 }] : [],
  }));
  const ref = useRef(lv);
  ref.current = lv;

  const roll = (forced?: number) => {
    const s = ref.current;
    const dice = forced ?? 1 + Math.floor(Math.random() * 6);
    const seat = s.seats.find((x) => x.playerId === s.turnId)!;
    setLv({ ...s, dice, rollSeq: s.rollSeq + 1, rolled: true, movable: movableOf(seat, dice), sixes: dice === 6 ? s.sixes + 1 : 0 });
  };
  const next = (s: LudoView, bonus: boolean): Partial<LudoView> => {
    const i = IDS.indexOf(s.turnId!);
    return { turnId: bonus ? s.turnId : IDS[(i + 1) % 4], rolled: false, movable: [], sixes: bonus ? s.sixes : 0 };
  };
  const move = (token: number) => {
    const s = ref.current;
    const seat = s.seats.find((x) => x.playerId === s.turnId)!;
    const from = seat.tokens[token];
    const to = from < 0 ? 0 : from + s.dice!;
    const ring = ludoRingOf(seat.color, to);
    const captured: LudoLastMove['captured'] = [];
    const seats = s.seats.map((o) => {
      if (o === seat) return { ...o, tokens: o.tokens.map((p, t) => (t === token ? to : p)), home: o.home + (to === LUDO_HOME ? 1 : 0) };
      if (ring === null || ludoIsSafe(ring)) return o;
      return {
        ...o,
        tokens: o.tokens.map((p, t) => {
          if (ludoRingOf(o.color, p) !== ring) return p;
          captured.push({ playerId: o.playerId, color: o.color, token: t, from: p });
          return -1;
        }),
      };
    });
    const bonus = s.dice === 6 || captured.length > 0 || to === LUDO_HOME;
    const killed = seats.map((o) => (o.playerId === seat.playerId ? { ...o, kills: o.kills + captured.length, unlocked: o.unlocked || captured.length > 0 } : o));
    const last: LudoLastMove = { seq: (s.last?.seq ?? 0) + 1, playerId: seat.playerId, color: seat.color, token, from, to, roll: s.dice!, captured, home: to === LUDO_HOME, bonus };
    const kills = [...s.kills, ...captured.map((c) => ({ by: seat.playerId, victim: c.playerId, at: Date.now() }))];
    setLv({ ...s, seats: killed, last, kills, ...next(s, bonus) });
  };

  // bots (and me in auto) roll and move at a human pace; forced passes and single moves happen by themselves
  useEffect(() => {
    if (over || align) return;
    const s = lv;
    const botTurn = s.turnId !== 'me' || auto;
    let t = 0;
    if (!s.rolled && botTurn) t = window.setTimeout(() => roll(kill && s.rollSeq === 0 ? 4 : undefined), 1100);
    else if (s.rolled && s.movable.length === 0) t = window.setTimeout(() => setLv({ ...ref.current, ...next(ref.current, false) }), 1000);
    else if (s.rolled && (s.movable.length === 1 || botTurn)) {
      const seat = s.seats.find((x) => x.playerId === s.turnId)!;
      const kill = s.movable.find((tk) => {
        const to = seat.tokens[tk] < 0 ? 0 : seat.tokens[tk] + s.dice!;
        const r = ludoRingOf(seat.color, to);
        return r !== null && !ludoIsSafe(r) && s.seats.some((o) => o !== seat && o.tokens.some((p) => ludoRingOf(o.color, p) === r));
      });
      t = window.setTimeout(() => move(kill ?? s.movable[Math.floor(Math.random() * s.movable.length)]), 900);
    }
    return () => window.clearTimeout(t);
  }, [lv.rollSeq, lv.last?.seq, lv.turnId, lv.rolled]);

  const view = useMemo(
    () =>
      ({
        code: 'LUDO', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing',
        config: { game: 'ludo', opts: { mode: 'master' }, stake: 0, teams: false, voice: false, turnTimer: false, ranked: false } as unknown as GameConfig,
        players: IDS.map((_, i) => ({ ...player(i), place: over ? [2, 1, 3, 4][i] : null })), watchers: [], turnId: lv.turnId, turnMsLeft: null,
        winnerIds: over ? ['b1'] : [], loserIds: over ? ['me', 'b2', 'b3'] : [], leftPlayers: [], watchRequests: [], swapAsks: [], teams: null, slots: null,
        awards: [], coinResults: null, stopped: false, secrets: [], secret: null, plugged: { kind: 'ludo', ludo: lv },
      }) as unknown as RoomView,
    [lv],
  );
  const actions = useMemo(
    () =>
      new Proxy({} as Actions, {
        get: (_t, key) => {
          if (key === 'gameMove')
            return async (m: PluggedMove) => {
              if (m.move.type === 'roll') window.setTimeout(() => roll(), 350);
              else if (m.kind === 'ludo' && m.move.type === 'move') move(m.move.token);
              return true;
            };
          if (key === 'toast') return (text: string) => console.info('toast', text);
          return async () => null;
        },
      }),
    [],
  );
  // &xp: a logged-in looking player with that many games, so locked looks can be tried
  const xp = Number(new URLSearchParams(location.search).get('xp') ?? 0);
  const user = xp ? { id: 'me', stats: { gamesPlayed: xp, wins: xp, goodCalls: 0, bluffs: 0, bluffsCaught: 0, bonusXp: 0 } } : null;
  const auth = { user, token: null, checking: false } as unknown as Auth;
  return <LudoTable view={view} actions={actions} bubbles={[]} auth={auth} notes={[]} />;
}
