// Dev only (?homePreview, ?lobbyPreview=ludo): Home and the lobby on fake data, no server
import { useMemo, useState } from 'react';
import { Home } from '../components/Home';
import { Lobby } from '../components/Lobby';
import type { GameConfig, GameKind, PublicPlayer, RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions } from '../useBluff';

const noop = async () => null;
const fakeAuth = (): Auth =>
  new Proxy({ user: null, token: null, checking: false, accountsOn: false, guestsAllowed: true, pushInvites: false, bonus: 0, friendRequests: 0 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : noop),
  }) as unknown as Auth;

const player = (id: string, name: string, bot: boolean): PublicPlayer =>
  ({ id, name, avatar: null, back: 'classic', table: 'classic', cardCount: 0, handValue: null, connected: true, place: null, registered: false, coins: null, username: null, level: 3, bot, ready: true, saza: null }) as PublicPlayer;

export function HomePreview() {
  const actions = useMemo(() => new Proxy({} as Actions, { get: () => noop }), []);
  return <Home status="online" connectionId="dev" actions={actions} auth={fakeAuth()} onOpenAdmin={() => undefined} pendingWatch={null} />;
}

export function LobbyPreview() {
  const kind = (new URLSearchParams(location.search).get('lobbyPreview') || 'ludo') as GameKind;
  const [config, setConfig] = useState<GameConfig>(
    () => ({ game: kind, opts: {}, stake: 0, decks: 1, bluffRule: 'all', peeks: 0, shields: 0, bets: false, teams: false, handSize: 7, maxPicks: 1, stack7: false, voice: true, turnTimer: false, turnSec: 30, botLevel: 'normal', kismat: false, seedhi: false }) as unknown as GameConfig,
  );
  const view = {
    code: 'DEVX', meId: 'me', hostId: 'me', phase: 'lobby', config,
    players: [player('me', 'You', false), player('b1', 'Priya', true), player('b2', 'Raju', true)],
    watchers: [], turnId: null, watchRequests: [], swapAsks: [], slots: null, teams: null, leftPlayers: [], winnerIds: [], loserIds: [],
  } as unknown as RoomView;
  const actions = useMemo(
    () => new Proxy({} as Actions, { get: (_t, k) => (k === 'setConfig' ? async (c: GameConfig) => (setConfig(c), null) : k === 'toast' ? console.info : noop) }),
    [],
  );
  return <Lobby view={view} actions={actions} auth={fakeAuth()} />;
}
