// Dev only: a fake room for the party games' previews (no server)
import type { GameConfig, PluggedMove, PluggedView, PublicPlayer, RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions } from '../../useBluff';

export const FAKE_IDS = ['me', 'b1', 'b2', 'b3'];
const NAMES = ['You', 'Priya', 'Raju', 'Aman'];

export const fakePlayer = (i: number): PublicPlayer =>
  ({ id: FAKE_IDS[i], name: i === 0 ? 'Meera' : NAMES[i], avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 4 + i, bot: i > 0, ready: true, saza: null }) as PublicPlayer;

/** players from the URL: &n=2..4 */
export const fakeCount = () => Math.min(4, Math.max(2, Number(new URLSearchParams(location.search).get('n')) || 3));

export function fakeView(game: string, opts: Record<string, unknown>, n: number, plugged: PluggedView, over: boolean, winners: string[], turnMsLeft: number | null = null): RoomView {
  return {
    code: 'DEV3', meId: 'me', hostId: 'me', phase: over ? 'over' : 'playing',
    config: { game, opts, stake: 0, teams: false, voice: false, turnTimer: true, turnSec: 30, ranked: false } as unknown as GameConfig,
    players: FAKE_IDS.slice(0, n).map((_, i) => fakePlayer(i)), watchers: [], turnId: null, turnMsLeft,
    winnerIds: over ? winners : [], loserIds: [], leftPlayers: [], watchRequests: [], swapAsks: [], teams: null, slots: null,
    awards: [], coinResults: null, stopped: false, secrets: [], secret: null, plugged,
  } as unknown as RoomView;
}

export function fakeActions(onMove: (m: PluggedMove) => boolean): Actions {
  return new Proxy({} as Actions, {
    get: (_t, key) => {
      if (key === 'gameMove') return async (m: PluggedMove) => onMove(m);
      if (key === 'toast') return (text: string) => console.info('toast', text);
      return async () => null;
    },
  });
}

export const fakeAuth = () => ({ user: null, token: null, checking: false }) as unknown as Auth;
