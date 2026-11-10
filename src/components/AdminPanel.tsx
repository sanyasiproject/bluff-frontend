import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../lib/api';
import { avatarColor, cx } from '../lib/cards';
import { compactCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { timeAgo } from '../lib/dates';
import { levelOf, type AdminUser, type AppSettings } from '../types';
import type { Auth } from '../useAuth';
import { AdminUserPage } from './AdminUserPage';
import { BackButton } from './BackButton';
import { LevelBadge } from './LevelBadge';
import { Backdrop } from './Overlays';

/** guest play on or off for the whole app, one tap plus a confirm */
function GuestPlaySwitch({ auth }: { auth: Auth }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  /** the value waiting for the admin to confirm */
  const [asking, setAsking] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ settings: AppSettings }>('/admin/settings', { token: auth.token })
      .then((r) => setSettings(r.settings))
      .catch((err) => setError(errorText(err)));
  }, [auth.token]);

  const apply = async (on: boolean) => {
    setBusy(true);
    setError('');
    try {
      setSettings((await api<{ settings: AppSettings }>('/admin/settings', { body: { guestsAllowed: on }, token: auth.token })).settings);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const on = settings?.guestsAllowed ?? true;
  return (
    <section className="panel guest-switch">
      <div className="setting-head">
        <div className="grow">
          <b>Guest play</b>
          <p className="muted small">{on ? 'Anyone can play free games without an account' : 'Everyone must log in to create or join a room'}</p>
        </div>
        <div className="mini-seg" role="group" aria-label="Guest play">
          <button className={cx(on && 'on')} aria-pressed={on} disabled={!settings || busy} onClick={() => !on && setAsking(true)}>
            On
          </button>
          <button className={cx(!on && 'on')} aria-pressed={!on} disabled={!settings || busy} onClick={() => on && setAsking(false)}>
            Off
          </button>
        </div>
      </div>
      {settings?.updatedAt && (
        <p className="muted small">
          Last changed by {settings.updatedBy ?? 'an admin'} · {timeAgo(settings.updatedAt)}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
      {asking !== null && (
        <Backdrop center onClose={() => setAsking(null)}>
          <div className="confirm-box">
            <h3>{asking ? 'Turn guest play on?' : 'Turn guest play off?'}</h3>
            <p className="muted">
              {asking
                ? 'Anyone can play free games again without logging in.'
                : "Players who aren't logged in won't be able to create or join rooms until you turn it back on. Guests already in a room can finish their game."}
            </p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setAsking(null)}>
                Cancel
              </button>
              <button
                className={cx('btn', asking ? 'primary' : 'danger')}
                onClick={() => {
                  const next = asking;
                  setAsking(null);
                  void apply(next);
                }}
              >
                {asking ? 'Turn on' : 'Turn off'}
              </button>
            </div>
          </div>
        </Backdrop>
      )}
    </section>
  );
}

/** admins: search every account and open one to manage it */
export function AdminPanel({ auth, onBack }: { auth: Auth; onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  useBack(onBack);

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
        <BackButton onClick={onBack} />
        <h2 className="grow">Admin</h2>
        <span className="muted small">{total} users</span>
      </header>

      <GuestPlaySwitch auth={auth} />

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
