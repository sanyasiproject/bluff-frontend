import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, serverStatus } from './lib/api';
import { disablePush } from './lib/push';
import { reconnectSocket, socket } from './lib/socket';
import { loadAuthToken, saveAuthToken } from './lib/storage';
import type {
  AuthResponse,
  GameKind,
  GameSummary,
  LeagueResponse,
  MissionsResponse,
  ProfileOverview,
  PublicUser,
  RivalRecord,
  RivalsResponse,
  ServerInfo,
  ShopLookKind,
  ShopResponse,
} from './types';

/** the logged-in account (null = guest) and account actions */
export function useAuth() {
  const [token, setToken] = useState<string | null>(loadAuthToken);
  const [user, setUser] = useState<PublicUser | null>(null);
  /** true while a saved token is being checked at startup */
  const [checking, setChecking] = useState(() => loadAuthToken() !== null);
  /** null until known; false when the server runs guest-only */
  const [accountsOn, setAccountsOn] = useState<boolean | null>(null);
  /** an admin can turn guest play off: then everyone must log in to play */
  const [guestsAllowed, setGuestsAllowed] = useState(true);
  /** friend invites reach offline phones (keys on the server and the admin switch on); null until the server says */
  const [pushInvites, setPushInvites] = useState<boolean | null>(null);
  /** daily login bonus just received, shown once as a popup */
  const [bonus, setBonus] = useState(0);
  /** friend requests waiting for me, shown as a red count */
  const [friendRequests, setFriendRequests] = useState(0);

  const refresh = useCallback(async () => {
    const saved = loadAuthToken();
    if (!saved) {
      setUser(null);
      setFriendRequests(0);
      setChecking(false);
      return;
    }
    try {
      const res = await api<{ user: PublicUser; bonus: number; friendRequests?: number }>('/me', { token: saved });
      setUser(res.user);
      setFriendRequests(res.friendRequests ?? 0);
      if (res.bonus > 0) setBonus(res.bonus);
    } catch (err) {
      // expired or revoked: fall back to guest
      if (err instanceof ApiError && err.status === 401) {
        saveAuthToken(null);
        setToken(null);
        setUser(null);
        reconnectSocket();
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const check = () =>
      serverStatus()
        .then((s) => {
          setAccountsOn(s.accountsOn);
          setGuestsAllowed(s.guestsAllowed);
        })
        // a failed check (asleep, or blocked by a browser shield) never hides what the game connection already said
        .catch(() => setAccountsOn((known) => known ?? false));
    void check();
    // a sleeping or restarting server can fail the first check; look again whenever the game reconnects
    const onConnect = () => {
      void check();
      void refresh();
    };
    // someone sent, accepted or removed a friend request: update the red count right away
    const onFriends = () => void refresh();
    socket.on('connect', onConnect);
    socket.on('friends:changed', onFriends);
    // a friend sent me coins
    socket.on('gift:received', onFriends);
    // an admin turned guest play or invite notifications on or off
    // a new ranked season (the rank moves into it), or one booked or called off (the countdown): the account is read afresh
    let season: number | null = null;
    let nextSeason: string | null | undefined = undefined;
    const onSettings = (s: { guestsAllowed: boolean; pushInvites?: boolean; rankedSeason?: number; nextSeasonAt?: string | null }) => {
      setGuestsAllowed(s.guestsAllowed);
      if (typeof s.pushInvites === 'boolean') setPushInvites(s.pushInvites);
      const seasonMoved = typeof s.rankedSeason === 'number' && s.rankedSeason !== season;
      const bookingMoved = s.nextSeasonAt !== undefined && s.nextSeasonAt !== nextSeason;
      if (typeof s.rankedSeason === 'number') season = s.rankedSeason;
      if (s.nextSeasonAt !== undefined) nextSeason = s.nextSeasonAt;
      if (seasonMoved || bookingMoved) void refresh();
    };
    socket.on('settings:changed', onSettings);
    // sent on every connection and when a guest is turned away, so Log in and the guest lock show even if /health is blocked
    const onInfo = (s: ServerInfo) => {
      setAccountsOn(s.accounts);
      setGuestsAllowed(s.guestsAllowed);
      setPushInvites(s.pushInvites ?? false);
    };
    socket.on('server:info', onInfo);
    return () => {
      socket.off('server:info', onInfo);
      socket.off('connect', onConnect);
      socket.off('friends:changed', onFriends);
      socket.off('gift:received', onFriends);
      socket.off('settings:changed', onSettings);
    };
  }, [refresh]);

  const signIn = (res: AuthResponse): AuthResponse => {
    saveAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    if (res.bonus > 0) setBonus(res.bonus);
    reconnectSocket();
    return res;
  };

  return {
    user,
    token,
    checking,
    accountsOn,
    guestsAllowed,
    pushInvites,
    bonus,
    clearBonus: () => setBonus(0),
    friendRequests,
    setFriendRequests,
    refresh,
    login: async (username: string, password: string) =>
      signIn(await api<AuthResponse>('/auth/login', { body: { username, password } })),
    register: async (username: string, password: string, displayName: string) =>
      signIn(await api<AuthResponse>('/auth/register', { body: { username, password, displayName } })),
    /** the player's own display name; throws with the server's reason (e.g. when the next change is allowed) */
    changeName: async (displayName: string) => {
      const res = await api<{ user: PublicUser }>('/me/name', { body: { displayName }, token });
      setUser(res.user);
    },
    /** a new avatar ("face.bg"), or null for the first letter; throws with the server's reason (e.g. a level too low) */
    setAvatar: async (avatar: string | null) => {
      const res = await api<{ user: PublicUser }>('/me/avatar', { body: { avatar }, token });
      setUser(res.user);
    },
    /** the table theme: this player's felt, and the seat box everyone else sees round their name */
    setTableTheme: async (table: string | null) => {
      const res = await api<{ user: PublicUser }>('/me/table', { body: { table }, token });
      setUser(res.user);
    },
    /** the card back everyone at the table sees on this player's cards */
    setCardBack: async (back: string | null) => {
      const res = await api<{ user: PublicUser }>('/me/back', { body: { back }, token });
      setUser(res.user);
    },
    /** this account finished or skipped a practice lesson; a local copy covers a failed request */
    markTutorial: async (game: GameKind) => {
      if (!token) return;
      try {
        const res = await api<{ user: PublicUser }>('/me/tutorial', { body: { game }, token });
        if (res?.user) setUser(res.user);
      } catch {
        // lib/tutorial keeps it on this phone
      }
    },
    logout: async () => {
      const old = token;
      saveAuthToken(null);
      setToken(null);
      setUser(null);
      setFriendRequests(0);
      reconnectSocket();
      if (!old) return;
      // this phone stops getting the old account's invites before the login is dropped
      await disablePush(old).catch(() => undefined);
      await api('/auth/logout', { method: 'POST', token: old }).catch(() => undefined);
    },
    myGames: async () => (await api<{ games: GameSummary[] }>('/me/games?limit=10', { token })).games,
    overview: () => api<ProfileOverview>('/me/overview', { token }),
    /** today's and this week's missions; a new day or week brings a fresh set */
    missions: () => api<MissionsResponse>('/me/missions', { token }),
    /** today's free swap of one unfinished mission; throws with the server's reason */
    swapMission: (id: string) => api<MissionsResponse>('/me/missions/swap', { body: { id }, token }),
    /** this week's friends league board and last week's */
    league: () => api<LeagueResponse>('/me/league', { token }),
    /** leave me off my friends' league boards, or put me back */
    setLeagueHidden: (hidden: boolean) => api<LeagueResponse>('/me/league/hide', { body: { hidden }, token }),
    /** my coins, running rentals and the looks I show */
    shop: () => api<ShopResponse>('/me/shop', { token }),
    /** rent a shop item (again adds its time); the account's coins update everywhere; throws with the server's reason */
    buyShop: async (id: string) => {
      const res = await api<{ shop: ShopResponse; user: PublicUser }>('/me/shop/buy', { body: { id }, token });
      setUser(res.user);
      return res.shop;
    },
    /** show a running look to others, or null to take it off */
    wearShop: async (kind: ShopLookKind, id: string | null) => {
      const res = await api<{ shop: ShopResponse; user: PublicUser }>('/me/shop/wear', { body: { kind, id }, token });
      setUser(res.user);
      return res.shop;
    },
    /** my records against every friend I've played */
    rivals: () => api<RivalsResponse>('/me/rivals', { token }),
    /** my record against one friend; null when not a friend or no games together */
    rivalOf: async (username: string) => (await api<{ record: RivalRecord | null }>(`/players/${encodeURIComponent(username)}/rival`, { token })).record,
  };
}

export type Auth = ReturnType<typeof useAuth>;
