import { useCallback, useEffect, useState } from 'react';
import { accountsAvailable, api, ApiError } from './lib/api';
import { reconnectSocket } from './lib/socket';
import { loadAuthToken, saveAuthToken } from './lib/storage';
import type { AuthResponse, GameSummary, PublicUser } from './types';

/** the logged-in account (null = guest) and account actions */
export function useAuth() {
  const [token, setToken] = useState<string | null>(loadAuthToken);
  const [user, setUser] = useState<PublicUser | null>(null);
  /** true while a saved token is being checked at startup */
  const [checking, setChecking] = useState(() => loadAuthToken() !== null);
  /** null until known; false when the server runs guest-only */
  const [accountsOn, setAccountsOn] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    const saved = loadAuthToken();
    if (!saved) {
      setUser(null);
      setChecking(false);
      return;
    }
    try {
      setUser((await api<{ user: PublicUser }>('/me', { token: saved })).user);
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
    accountsAvailable()
      .then(setAccountsOn)
      .catch(() => setAccountsOn(false));
  }, [refresh]);

  const signIn = (res: AuthResponse) => {
    saveAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    reconnectSocket();
  };

  return {
    user,
    token,
    checking,
    accountsOn,
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
  };
}

export type Auth = ReturnType<typeof useAuth>;
