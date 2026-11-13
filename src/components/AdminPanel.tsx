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

type SwitchKey = 'guestsAllowed' | 'pushInvites';

/** what each app-wide switch says, and what its confirm popup asks */
const SWITCHES: Record<SwitchKey, { title: string; on: string; off: string; askOn: string; askOff: string; sayOn: string; sayOff: string }> = {
  guestsAllowed: {
    title: 'Guest play',
    on: 'Anyone can play free games without an account',
    off: 'Everyone must log in to create or join a room',
    askOn: 'Turn guest play on?',
    askOff: 'Turn guest play off?',
    sayOn: 'Anyone can play free games again without logging in.',
    sayOff: "Players who aren't logged in won't be able to create or join rooms until you turn it back on. Guests already in a room can finish their game.",
  },
  pushInvites: {
    title: 'Invite notifications',
    on: 'Offline friends get invites as phone notifications',
    off: 'Invites only reach friends who have Bluff open',
    askOn: 'Turn invite notifications on?',
    askOff: 'Turn invite notifications off?',
    sayOn: 'Friends who are offline get invites on their phones again (if they turned notifications on).',
    sayOff: "Friends who are offline won't get invites on their phones until you turn it back on.",
  },
};

/** app-wide switches (guest play, invite notifications), one tap plus a confirm */
function AppSwitches({ auth }: { auth: Auth }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  /** false: the server has no push keys, so the notifications switch can't do anything */
  const [pushReady, setPushReady] = useState<boolean | null>(null);
  /** the change waiting for the admin to confirm */
  const [asking, setAsking] = useState<{ key: SwitchKey; on: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ settings: AppSettings }>('/admin/settings', { token: auth.token })
      .then((r) => setSettings(r.settings))
      .catch((err) => setError(errorText(err)));
    api<{ publicKey: string | null }>('/push/key')
      .then((r) => setPushReady(r.publicKey !== null))
      .catch(() => setPushReady(false));
  }, [auth.token]);

  const apply = async (key: SwitchKey, on: boolean) => {
    setBusy(true);
    setError('');
    try {
      setSettings((await api<{ settings: AppSettings }>('/admin/settings', { body: { [key]: on }, token: auth.token })).settings);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const row = (key: SwitchKey) => {
    const text = SWITCHES[key];
    const on = settings?.[key] ?? true;
    const notSetUp = key === 'pushInvites' && pushReady === false;
    return (
      <div className="setting-head" key={key}>
        <div className="grow">
          <b>{text.title}</b>
          <p className="muted small">{notSetUp ? 'Not set up on the server (push keys missing)' : on ? text.on : text.off}</p>
        </div>
        {!notSetUp && (
          <div className="mini-seg" role="group" aria-label={text.title}>
            <button className={cx(on && 'on')} aria-pressed={on} disabled={!settings || busy} onClick={() => !on && setAsking({ key, on: true })}>
              On
            </button>
            <button className={cx(!on && 'on')} aria-pressed={!on} disabled={!settings || busy} onClick={() => on && setAsking({ key, on: false })}>
              Off
            </button>
          </div>
        )}
      </div>
    );
  };

  const ask = asking ? SWITCHES[asking.key] : null;
  return (
    <section className="panel guest-switch">
      {row('guestsAllowed')}
      {row('pushInvites')}
      {settings?.updatedAt && (
        <p className="muted small">
          Last changed by {settings.updatedBy ?? 'an admin'} · {timeAgo(settings.updatedAt)}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
      {asking && ask && (
        <Backdrop center onClose={() => setAsking(null)}>
          <div className="confirm-box">
            <h3>{asking.on ? ask.askOn : ask.askOff}</h3>
            <p className="muted">{asking.on ? ask.sayOn : ask.sayOff}</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setAsking(null)}>
                Cancel
              </button>
              <button
                className={cx('btn', asking.on ? 'primary' : 'danger')}
                onClick={() => {
                  const next = asking;
                  setAsking(null);
                  void apply(next.key, next.on);
                }}
              >
                {asking.on ? 'Turn on' : 'Turn off'}
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

      <AppSwitches auth={auth} />

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
