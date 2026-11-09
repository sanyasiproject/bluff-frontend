import { useCallback, useEffect, useState } from 'react';
import { accountsAvailable, api, ApiError } from './lib/api';
import { reconnectSocket, socket } from './lib/socket';
import { loadAuthToken, saveAuthToken } from './lib/storage';
import type { AuthResponse, GameSummary, ProfileOverview, PublicUser } from './types';

/** the logged-in account (null = guest) and account actions */
export function useAuth() {
  const [token, setToken] = useState<string | null>(loadAuthToken);
  const [user, setUser] = useState<PublicUser | null>(null);
  /** true while a saved token is being checked at startup */
  const [checking, setChecking] = useState(() => loadAuthToken() !== null);
  /** null until known; false when the server runs guest-only */
  const [accountsOn, setAccountsOn] = useState<boolean | null>(null);
  /** daily login bonus just received, shown once as a popup */
  const [bonus, setBonus] = useState(0);

  const refresh = useCallback(async () => {
    const saved = loadAuthToken();
    if (!saved) {
      setUser(null);
      setChecking(false);
      return;
    }
    try {
      const res = await api<{ user: PublicUser; bonus: number }>('/me', { token: saved });
      setUser(res.user);
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
      accountsAvailable()
        .then(setAccountsOn)
        .catch(() => setAccountsOn(false));
    void check();
    // a sleeping or restarting server can fail the first check; look again whenever the game reconnects
    const onConnect = () => {
      void check();
      void refresh();
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [refresh]);

  const signIn = (res: AuthResponse) => {
    saveAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    if (res.bonus > 0) setBonus(res.bonus);
    reconnectSocket();
  };

  return {
    user,
    token,
    checking,
    accountsOn,
    bonus,
    clearBonus: () => setBonus(0),
    refresh,
    login: async (username: string, password: string) =>
      signIn(await api<AuthResponse>('/auth/login', { body: { username, password } })),
    register: async (username: string, password: string, displayName: string) =>
      signIn(await api<AuthResponse>('/auth/register', { body: { username, password, displayName } })),
    logout: async () => {
      const old = token;
      saveAuthToken(null);
      setToken(null);
      setUser(null);
      reconnectSocket();
      if (old) await api('/auth/logout', { method: 'POST', token: old }).catch(() => undefined);
    },
    myGames: async () => (await api<{ games: GameSummary[] }>('/me/games?limit=10', { token })).games,
    overview: () => api<ProfileOverview>('/me/overview', { token }),
  };
}

export type Auth = ReturnType<typeof useAuth>;
