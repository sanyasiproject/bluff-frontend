// Dev only (?snakesPreview=1, =auto, =over, &dice=N forces my rolls, &me=N starts me on square N): Saanp Seedhi on a fake room with a tiny rule engine
import { useEffect, useMemo, useRef, useState } from 'react';
import { LADDERS, SNAKES, SNAKES_BITE_BACK, SNAKES_COLORS, type GameConfig, type PluggedMove, type PublicPlayer, type RoomView, type SnakesLastMove, type SnakesView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';
import { SnakesTable } from './SnakesTable';

const IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];
const BOT_LOOKS = [undefined, { board: 'night', goti: 'metal', dice: 'jade' }, { board: 'royal', goti: 'crown', dice: 'gold' }, { board: 'wood', goti: 'gem', dice: 'ruby' }];

const player = (i: number): PublicPlayer =>
  ({ ludoLook: BOT_LOOKS[i], id: IDS[i], name: NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

/** one roll on the fake board, as the server would apply it */
function applyRoll(s: SnakesView, dice: number): SnakesView {
  const seat = s.seats.find((x) => x.playerId === s.turnId)!;
  const sixes = dice === 6 ? s.sixes + 1 : 0;
  const base = { ...s, dice, rollSeq: s.rollSeq + 1, sixes };
  const pass = (v: SnakesView): SnakesView => ({ ...v, turnId: nextTurn(v.seats, v.turnId!), sixes: 0 });
  if (s.rules.bonus && sixes >= 3) return pass(base);
  if (seat.pos === 0 && s.rules.six && dice !== 6) return pass(base);
  const t = seat.pos === 0 && s.rules.six ? 1 : seat.pos + dice;
  const bounced = s.rules.exact && t > 100;
  const landed = bounced ? 200 - t : Math.min(100, t);
  const via = SNAKES[landed] ? { kind: 'snake' as const, from: landed, to: SNAKES[landed] } : LADDERS[landed] ? { kind: 'ladder' as const, from: landed, to: LADDERS[landed] } : null;
  const to = via?.to ?? landed;
  const bitten: SnakesLastMove['bitten'] = [];
  const placed = s.seats.filter((x) => x.place).length;
  const seats = s.seats.map((o) => {
    if (o === seat) return { ...o, pos: to, place: to === 100 ? placed + 1 : null, ladders: o.ladders + (via?.kind === 'ladder' ? 1 : 0), snakes: o.snakes + (via?.kind === 'snake' ? 1 : 0), bites: o.bites };
    if (s.rules.bite && o.pos === to && to !== 100 && !o.place) {
      bitten.push({ playerId: o.playerId, from: to, to: Math.max(1, to - SNAKES_BITE_BACK) });
      return { ...o, pos: Math.max(1, to - SNAKES_BITE_BACK) };
    }
    return o;
  });
  const me = seats.find((x) => x.playerId === seat.playerId)!;
  me.bites += bitten.length;
  const bonus = s.rules.bonus && dice === 6 && to !== 100;
  const last: SnakesLastMove = { seq: (s.last?.seq ?? 0) + 1, playerId: seat.playerId, roll: dice, from: seat.pos, landed, to, bounced, via, bitten, bonus };
  const after = { ...base, seats, last };
  if (seats.filter((x) => !x.place).length <= 1) return { ...after, seats: seats.map((x) => (x.place ? x : { ...x, place: seats.length })), turnId: null };
  return bonus ? after : pass(after);
}

function nextTurn(seats: SnakesView['seats'], from: string): string {
  const i = seats.findIndex((x) => x.playerId === from);
  for (let k = 1; k <= seats.length; k++) {
    const s = seats[(i + k) % seats.length];
    if (!s.place) return s.playerId;
  }
  return from;
}

export function SnakesPreview() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('snakesPreview') ?? '1';
  const auto = mode === 'auto';
  const over = mode === 'over';
  const forced = Number(q.get('dice') ?? 0);
  const n = Math.min(4, Math.max(2, Number(q.get('n') ?? 4)));
  const start = [Number(q.get('me') ?? 0), 23, 59, 96];
  const [sv, setSv] = useState<SnakesView>(() => ({
    seats: IDS.slice(0, n).map((id, i) => ({ playerId: id, color: SNAKES_COLORS[i], pos: over ? [100, 100, 47, 88][i] : start[i], place: over ? [2, 1, 4, 3][i] : null, ladders: i + 1, snakes: 2 - (i % 2), bites: i % 3 })),
    turnId: over ? null : 'me',
    dice: null,
    rollSeq: 0,
    sixes: 0,
    last: null,
    rules: { exact: q.get('exact') !== '0', six: q.get('six') !== '0', bonus: true, bite: true },
  }));
  const ref = useRef(sv);
  ref.current = sv;
  const roll = (d?: number) => setSv(applyRoll(ref.current, d ?? 1 + Math.floor(Math.random() * 6)));

  // bots (and me in auto) roll at a human pace
  useEffect(() => {
    if (over || !sv.turnId) return;
    if (sv.turnId === 'me' && !auto) return;
    const t = window.setTimeout(() => roll(), sv.last ? 2600 : 1200);
    return () => window.clearTimeout(t);
  }, [sv.rollSeq, sv.turnId]);

  const view = useMemo(
    () =>
      ({
        code: 'SNKE', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing',
        config: { game: 'snakes', opts: {}, stake: 0, teams: false, voice: false, turnTimer: false, ranked: false } as unknown as GameConfig,
        players: IDS.slice(0, n).map((_, i) => ({ ...player(i), place: over ? [2, 1, 4, 3][i] : null })), watchers: [], turnId: sv.turnId, turnMsLeft: null,
        winnerIds: over ? ['b1'] : [], loserIds: over ? ['b2'] : [], leftPlayers: [], watchRequests: [], swapAsks: [], teams: null, slots: null,
        awards: [], coinResults: null, stopped: false, secrets: [], secret: null, plugged: { kind: 'snakes', snakes: sv },
      }) as unknown as RoomView,
    [sv],
  );
  const actions = useMemo(
    () =>
      new Proxy({} as Actions, {
        get: (_t, key) => {
          if (key === 'gameMove')
            return async (m: PluggedMove) => {
              if (m.kind === 'snakes') window.setTimeout(() => roll(forced || undefined), 350);
              return true;
            };
          if (key === 'toast') return (text: string) => console.info('toast', text);
          return async () => null;
        },
      }),
    [],
  );
  const auth = { user: null, token: null, checking: false } as unknown as Auth;
  return <SnakesTable view={view} actions={actions} bubbles={[]} auth={auth} notes={[]} />;
}
