import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, serverStatus } from './lib/api';
import { disablePush } from './lib/push';
import { reconnectSocket, socket } from './lib/socket';
import { loadAuthToken, saveAuthToken } from './lib/storage';
import type { AuthResponse, GameKind, GameSummary, ProfileOverview, PublicUser, ServerInfo } from './types';

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
    const onSettings = (s: { guestsAllowed: boolean; pushInvites?: boolean }) => {
      setGuestsAllowed(s.guestsAllowed);
      if (typeof s.pushInvites === 'boolean') setPushInvites(s.pushInvites);
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
    /** a new avatar ("face.bg"), or null for the first letter; throws with the server's reason (e.g. a level too low) */
    setAvatar: async (avatar: string | null) => {
      const res = await api<{ user: PublicUser }>('/me/avatar', { body: { avatar }, token });
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
  };
}

export type Auth = ReturnType<typeof useAuth>;
