import { useEffect, useState } from 'react';
import { api, errorText } from '../lib/api';
import { avatarColor, cx } from '../lib/cards';
import { compactCoins, formatCoins, signedCoins } from '../lib/coins';
import { dateTime, timeAgo } from '../lib/dates';
import { HISTORY_PAGE_SIZE, levelOf, type AdminUserDetail, type AuditEntry, type Role } from '../types';
import type { Auth } from '../useAuth';
import { FullPage } from './FullPage';
import { Backdrop } from './Overlays';
import { LevelBadge } from './LevelBadge';
import { GameList, StatGrid } from './ProfileParts';

const QUICK_AMOUNTS = [100, 500, 1_000, 5_000, 10_000];

function historyText(h: AuditEntry): [string, string] {
  if (h.action === 'coins') return ['🪙', `${signedCoins(h.amount ?? 0)} coins${h.reason ? ` · ${h.reason}` : ''}`];
  if (h.action === 'make_admin') return ['🛡', 'Made admin'];
  if (h.action === 'password') return ['🔑', h.detail ?? 'Password reset'];
  if (h.action === 'settings') return ['⚙️', h.detail ?? 'App setting changed'];
  if (h.action === 'gift') return ['🎁', `${signedCoins(h.amount ?? 0)} coins${h.detail ? ` · ${h.detail}` : ''}`];
  return ['✏️', h.detail ?? 'Account changed'];
}

/** a risky change waiting for the admin to confirm it */
interface Confirm {
  title: string;
  body: string;
  action: string;
  danger: boolean;
  run: () => void;
}

/** one account for admins: details, coins, name, role, block, password, history and games */
export function AdminUserPage({ auth, userId, onBack }: { auth: Auth; userId: string; onBack: () => void }) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('500');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [history, setHistory] = useState<{ page: number; items: AuditEntry[]; total: number }>({ page: 1, items: [], total: 0 });
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const self = auth.user?.id === userId;
  const pages = Math.max(1, Math.ceil(history.total / HISTORY_PAGE_SIZE));

  // reloading shows the first history page, where a new change appears
  const load = async () => {
    const d = await api<AdminUserDetail>(`/admin/users/${userId}`, { token: auth.token });
    setData(d);
    setName(d.user.displayName);
    setHistory({ page: 1, items: d.history, total: d.historyTotal });
  };

  const showHistoryPage = async (page: number) => {
    try {
      const res = await api<{ history: AuditEntry[]; total: number }>(`/admin/users/${userId}/history?page=${page}`, {
        token: auth.token,
      });
      setHistory({ page, items: res.history, total: res.total });
    } catch (err) {
      setError(errorText(err));
    }
  };

  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [userId]);

  /** runs a change, reloads the page data and shows what happened */
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await load();
      setNotice(done);
      if (self) void auth.refresh();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const update = (changes: object, done: string) =>
    run(() => api(`/admin/users/${userId}`, { body: changes, token: auth.token }), done);

  const changeCoins = async (sign: 1 | -1) => {
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) {
      setError('Enter a whole number of coins');
      return;
    }
    const ok = await run(
      () => api(`/admin/users/${userId}/coins`, { body: { amount: sign * n, reason: reason.trim() || undefined }, token: auth.token }),
      `${sign > 0 ? 'Gave' : 'Took'} ${formatCoins(n)} coins`,
    );
    if (ok) setReason('');
  };

  const resetPassword = async () => {
    if (password.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (!window.confirm(`Set a new password for @${data?.user.username}? They will be logged out on every device.`)) return;
    const ok = await run(
      () => api(`/admin/users/${userId}/password`, { body: { password }, token: auth.token }),
      'Password changed. Share it with them privately.',
    );
    if (ok) setPassword('');
  };

  // blocking and role changes ask first, so they don't happen by a mis-tap
  const askBlock = () => {
    const u = data!.user;
    if (u.blocked) {
      void update({ blocked: false }, 'Unblocked');
      return;
    }
    setConfirm({
      title: `Block ${u.displayName}?`,
      body: `@${u.username} will be logged out on every device and can't log in until you unblock them. Their coins and stats are kept.`,
      action: 'Block',
      danger: true,
      run: () => void update({ blocked: true }, 'Blocked and logged out'),
    });
  };

  const askRole = (role: Role) => {
    const u = data!.user;
    setConfirm(
      role === 'admin'
        ? {
            title: `Make ${u.displayName} an admin?`,
            body: 'Admins can see every account, give or take coins, rename and block players, and reset passwords.',
            action: 'Make admin',
            danger: false,
            run: () => void update({ role: 'admin' }, 'Now an admin'),
          }
        : {
            title: `Remove admin from ${u.displayName}?`,
            body: 'They become a normal player and lose the Admin screen.',
            action: 'Remove admin',
            danger: true,
            run: () => void update({ role: 'user' }, 'Now a player'),
          },
    );
  };

  if (!data) {
    return (
      <FullPage title="User" onBack={onBack}>
        {error ? <p className="form-error">{error}</p> : <p className="muted">Loading…</p>}
      </FullPage>
    );
  }

  const u = data.user;
  return (
    <FullPage title={u.displayName} onBack={onBack}>
      <section className="panel admin-hero">
        <span className="avatar lg" style={{ background: avatarColor(u.displayName) }}>
          {u.displayName[0]?.toUpperCase()}
        </span>
        <div className="grow">
          <h3>
            {u.displayName} <LevelBadge level={levelOf(u.stats)} /> {u.role === 'admin' && <span className="tag">Admin</span>}
            {u.blocked && <span className="tag danger-tag">Blocked</span>}
          </h3>
          <p className="muted small">@{u.username}</p>
          <div className="chip-row">
            <span>📅 Joined {dateTime(u.createdAt)}</span>
            <span>🕒 Last login {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'}</span>
            <span>📱 {data.activeSessions} device{data.activeSessions === 1 ? '' : 's'} logged in</span>
            <span>👥 {data.friends} friend{data.friends === 1 ? '' : 's'}</span>
          </div>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
      {notice && <p className="form-ok">{notice}</p>}

      <section className="wallet-card">
        <div className="wallet-top">
          <div>
            <span className="label">Coins</span>
            <b className="wallet-amount">🪙 {formatCoins(u.coins)}</b>
          </div>
        </div>
        <div className="quick-amounts">
          {QUICK_AMOUNTS.map((n) => (
            <button key={n} className={cx('stake-chip', amount === String(n) && 'on')} onClick={() => setAmount(String(n))}>
              {compactCoins(n)}
            </button>
          ))}
        </div>
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
            <button className="btn primary small" disabled={busy} onClick={() => void changeCoins(1)}>
              + Give {amount ? compactCoins(Number(amount)) : 0}
            </button>
            <button className="btn small" disabled={busy} onClick={() => void changeCoins(-1)}>
              − Take {amount ? compactCoins(Number(amount)) : 0}
            </button>
          </div>
        </div>
      </section>

      <section className="panel stack-tight">
        <h3 className="section-title">Profile</h3>
        <label className="label" htmlFor="admin-name">
          Display name
        </label>
        <div className="join-row">
          <input id="admin-name" className="input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn"
            disabled={busy || !name.trim() || name.trim() === u.displayName}
            onClick={() => void update({ displayName: name.trim() }, 'Name saved')}
          >
            Save
          </button>
        </div>
      </section>

      <section className="panel stack-tight">
        <h3 className="section-title">Access</h3>
        <div className="access-row">
          <span className="grow">Role</span>
          <div className="mini-seg" role="group" aria-label="Role">
            {(['user', 'admin'] as const).map((r) => (
              <button
                key={r}
                className={cx(u.role === r && 'on')}
                aria-pressed={u.role === r}
                disabled={busy || self}
                onClick={() => u.role !== r && askRole(r)}
              >
                {r === 'admin' ? 'Admin' : 'Player'}
              </button>
            ))}
          </div>
        </div>
        <div className="access-row">
          <span className="grow">{u.blocked ? 'Blocked: cannot log in' : 'Can log in and play'}</span>
          <button className={cx('btn small', !u.blocked && 'ghost danger-text')} disabled={busy || self} onClick={askBlock}>
            {u.blocked ? 'Unblock' : 'Block'}
          </button>
        </div>
        {self && <p className="muted small">You can't change your own role or block yourself.</p>}
        <label className="label" htmlFor="admin-pass">
          Reset password
        </label>
        <div className="join-row">
          <input
            id="admin-pass"
            className="input"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn" disabled={busy || password.length === 0} onClick={() => void resetPassword()}>
            Set
          </button>
        </div>
      </section>

      <section className="panel stack-tight">
        <h3 className="section-title">Lifetime stats</h3>
        <StatGrid stats={u.stats} />
      </section>

      <section className="panel stack-tight">
        <h3 className="section-title">
          Admin history {history.total > 0 && <span className="muted">{history.total}</span>}
        </h3>
        {history.total === 0 && <p className="muted small">No admin changes yet.</p>}
        <ul className="history-list">
          {history.items.map((h) => {
            const [icon, text] = historyText(h);
            return (
              <li key={h.id}>
                <span className="history-icon">{icon}</span>
                <div className="grow">
                  <b>{text}</b>
                  <p className="muted small">
                    {h.by ?? 'Admin key'} · {timeAgo(h.createdAt)}
                    {h.balanceAfter !== undefined && ` · balance ${formatCoins(h.balanceAfter)}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {pages > 1 && (
          <div className="pager">
            <button className="btn small" disabled={history.page <= 1} onClick={() => void showHistoryPage(history.page - 1)}>
              ‹ Newer
            </button>
            <span className="muted small">
              Page {history.page} of {pages}
            </span>
            <button className="btn small" disabled={history.page >= pages} onClick={() => void showHistoryPage(history.page + 1)}>
              Older ›
            </button>
          </div>
        )}
      </section>

      <section className="stack-tight">
        <h3 className="section-title">Recent games</h3>
        <GameList games={data.games} empty="No games yet." />
      </section>

      {confirm && (
        <Backdrop center onClose={() => setConfirm(null)}>
          <div className="confirm-box">
            <h3>{confirm.title}</h3>
            <p className="muted">{confirm.body}</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className={cx('btn', confirm.danger ? 'danger' : 'primary')}
                onClick={() => {
                  setConfirm(null);
                  confirm.run();
                }}
              >
                {confirm.action}
              </button>
            </div>
          </div>
        </Backdrop>
      )}
    </FullPage>
  );
}
