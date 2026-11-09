import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../lib/api';
import { avatarColor } from '../lib/cards';
import { compactCoins } from '../lib/coins';
import { timeAgo } from '../lib/dates';
import { levelOf, type AdminUser } from '../types';
import type { Auth } from '../useAuth';
import { AdminUserPage } from './AdminUserPage';
import { LevelBadge } from './LevelBadge';

/** admins: search every account and open one to manage it */
export function AdminPanel({ auth, onBack }: { auth: Auth; onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      try {
        const res = await api<{ users: AdminUser[]; total: number }>(`/admin/users?search=${encodeURIComponent(q)}&limit=50`, {
          token: auth.token,
        });
        setUsers(res.users);
        setTotal(res.total);
        setError('');
      } catch (err) {
        setError(errorText(err));
      }
    },
    [auth.token],
  );

  // wait for a pause in typing before searching
  useEffect(() => {
    const t = setTimeout(() => void load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <main className="screen admin">
      <header className="admin-head">
        <button className="icon-btn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <h2 className="grow">Admin</h2>
        <span className="muted small">{total} users</span>
      </header>

      <input
        className="input"
        placeholder="Search name or username"
        value={search}
        autoCapitalize="none"
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && <p className="form-error">{error}</p>}

      <ul className="admin-list">
        {users.map((u) => (
          <li key={u.id}>
            <button className="panel admin-user-row" onClick={() => setOpenId(u.id)}>
              <span className="avatar sm" style={{ background: avatarColor(u.displayName) }}>
                {u.displayName[0]?.toUpperCase()}
              </span>
              <span className="grow">
                <b>{u.displayName}</b> <LevelBadge level={levelOf(u.stats)} /> {u.role === 'admin' && <span className="tag">Admin</span>}
                {u.blocked && <span className="tag danger-tag">Blocked</span>}
                <span className="muted small admin-user-sub">
                  @{u.username} · {u.stats.gamesPlayed} games · {u.lastLoginAt ? `last login ${timeAgo(u.lastLoginAt)}` : 'never logged in'}
                </span>
              </span>
              <span className="coin-chip">🪙 {compactCoins(u.coins)}</span>
              <span className="chevron" aria-hidden>
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
      {users.length === 0 && !error && <p className="muted center-text">No users found</p>}

      {openId && (
        <AdminUserPage
          auth={auth}
          userId={openId}
          onBack={() => {
            setOpenId(null);
            void load(search);
          }}
        />
      )}
    </main>
  );
}
