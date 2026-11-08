import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../lib/api';
import { avatarColor } from '../lib/cards';
import type { PublicUser } from '../types';
import type { Auth } from '../useAuth';

/** admins: search every account, give or take coins, promote to admin */
export function AdminPanel({ auth, onBack }: { auth: Auth; onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (q: string) => {
      try {
        const res = await api<{ users: PublicUser[]; total: number }>(`/admin/users?search=${encodeURIComponent(q)}&limit=50`, {
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

  const replace = (u: PublicUser) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));

  const changeCoins = async (u: PublicUser, sign: 1 | -1) => {
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) {
      setError('Enter a whole number of coins');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ user: PublicUser }>(`/admin/users/${u.id}/coins`, {
        body: { amount: sign * n, reason: reason.trim() || undefined },
        token: auth.token,
      });
      replace(res.user);
      setEditing(null);
      setReason('');
      setError('');
      if (u.id === auth.user?.id) void auth.refresh();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const makeAdmin = async (u: PublicUser) => {
    if (!window.confirm(`Make ${u.displayName} (@${u.username}) an admin? They can then manage all users and coins.`)) return;
    try {
      replace((await api<{ user: PublicUser }>('/admin/make-admin', { body: { username: u.username }, token: auth.token })).user);
    } catch (err) {
      setError(errorText(err));
    }
  };

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
          <li key={u.id} className="panel admin-user">
            <div className="admin-user-row">
              <span className="avatar sm" style={{ background: avatarColor(u.displayName) }}>
                {u.displayName[0]?.toUpperCase()}
              </span>
              <div className="grow">
                <b>{u.displayName}</b> {u.role === 'admin' && <span className="tag">Admin</span>}
                <p className="muted small">
                  @{u.username} · {u.stats.gamesPlayed} games · {u.stats.wins} wins
                </p>
              </div>
              <span className="coin-chip">🪙 {u.coins.toLocaleString()}</span>
            </div>
            <div className="admin-actions">
              <button className="btn small" onClick={() => setEditing(editing === u.id ? null : u.id)}>
                Coins
              </button>
              {u.role !== 'admin' && (
                <button className="btn small ghost" onClick={() => void makeAdmin(u)}>
                  Make admin
                </button>
              )}
            </div>
            {editing === u.id && (
              <div className="coin-form">
                <input
                  className="input"
                  inputMode="numeric"
                  aria-label="Number of coins"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))}
                />
                <input
                  className="input"
                  placeholder="Reason (optional)"
                  maxLength={100}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="coin-buttons">
                  <button className="btn primary small" disabled={busy} onClick={() => void changeCoins(u, 1)}>
                    Give {amount || 0}
                  </button>
                  <button className="btn small" disabled={busy} onClick={() => void changeCoins(u, -1)}>
                    Take {amount || 0}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {users.length === 0 && !error && <p className="muted center-text">No users found</p>}
    </main>
  );
}
