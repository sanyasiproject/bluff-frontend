import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { compactCoins } from '../lib/coins';
import { useBack } from '../lib/back';
import { timeAgo } from '../lib/dates';
import { levelOf, RANK_SEASON_DROP, SEASON_REMIND_DAY, SEASON_START_DELAY_DAYS, type AdminUser, type AppSettings } from '../types';
import type { Auth } from '../useAuth';
import { AdminUserPage } from './AdminUserPage';
import { BackButton } from './BackButton';
import { ConfirmBox } from './ConfirmBox';
import { LevelBadge } from './LevelBadge';
import { Backdrop } from './Overlays';
import { Avatar } from './Avatar';

type SwitchKey = 'guestsAllowed' | 'pushInvites';

const DAY_MS = 86_400_000;

/** which day of the season it is (day 1 is the day it started); null when the server doesn't know */
const seasonDay = (startedAt: string | null | undefined, now = Date.now()) =>
  startedAt ? Math.floor((now - new Date(startedAt).getTime()) / DAY_MS) + 1 : null;

/** whole days until a date, at least 0 */
const daysUntil = (iso: string, now = Date.now()) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / DAY_MS));

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

/** app-wide switches (guest play, invite notifications) and the ranked season, one tap plus a confirm */
function AppSwitches({ auth }: { auth: Auth }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  /** false: the server has no push keys, so the notifications switch can't do anything */
  const [pushReady, setPushReady] = useState<boolean | null>(null);
  /** the change waiting for the admin to confirm */
  const [asking, setAsking] = useState<{ key: SwitchKey; on: boolean } | null>(null);
  /** booking or calling off the next ranked season, waiting for the admin to confirm */
  const [seasonAsk, setSeasonAsk] = useState<'book' | 'cancel' | null>(null);
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

  /** books the next season (it starts in SEASON_START_DELAY_DAYS) or calls it off; then reads the settings again */
  const changeSeason = async (what: 'book' | 'cancel') => {
    setBusy(true);
    setError('');
    try {
      // the season seen here, so a stale screen can't book an extra one
      await api(what === 'book' ? '/admin/ranked/season' : '/admin/ranked/season/cancel', {
        method: 'POST',
        body: what === 'book' ? { from: settings?.rankedSeason } : undefined,
        token: auth.token,
      });
    } catch (err) {
      setError(errorText(err));
    } finally {
      // either way, show the season as it is now
      await api<{ settings: AppSettings }>('/admin/settings', { token: auth.token })
        .then((r) => setSettings(r.settings))
        .catch(() => undefined);
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
  const day = seasonDay(settings?.rankedSeasonStartedAt);
  // from about a week before the month is up, the button stands out until a season is booked
  const due = !!settings && !settings.nextSeasonAt && day !== null && day >= SEASON_REMIND_DAY;
  return (
    <section className="panel guest-switch">
      {row('guestsAllowed')}
      {row('pushInvites')}
      {/* older servers have no seasons */}
      {settings && typeof settings.rankedSeason === 'number' && (
        <div className={cx('setting-head season-row', due && 'due')}>
          <div className="grow">
            <b>
              🏅 Ranked season {settings.rankedSeason}
              {day !== null && <span className="muted"> · day {day}</span>}
            </b>
            <p className="muted small">
              {settings.nextSeasonAt
                ? `Season ${settings.rankedSeason + 1} starts in ${daysUntil(settings.nextSeasonAt)} day${daysUntil(settings.nextSeasonAt) === 1 ? '' : 's'}`
                : due
                  ? 'About a month in: time to book the next season'
                  : 'A season runs about a month'}
            </p>
          </div>
          {settings.nextSeasonAt ? (
            <button className="btn small ghost" disabled={busy} onClick={() => setSeasonAsk('cancel')}>
              Call off
            </button>
          ) : (
            <button className={cx('btn small', due ? 'primary' : 'ghost')} disabled={busy} onClick={() => setSeasonAsk('book')}>
              New season
            </button>
          )}
        </div>
      )}
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
      {seasonAsk && settings && (
        <ConfirmBox
          title={seasonAsk === 'book' ? `Start season ${settings.rankedSeason + 1} in ${SEASON_START_DELAY_DAYS} days?` : `Call off season ${settings.rankedSeason + 1}?`}
          body={
            seasonAsk === 'book'
              ? `Season ${settings.rankedSeason} ends in ${SEASON_START_DELAY_DAYS} days and players see the countdown. Then everyone drops ${RANK_SEASON_DROP} divisions and this season goes into their history. You can call it off until it starts.`
              : `Season ${settings.rankedSeason} carries on with no end date until you book a new one.`
          }
          action={seasonAsk === 'book' ? 'Book it' : 'Call off'}
          onCancel={() => setSeasonAsk(null)}
          onConfirm={() => {
            const what = seasonAsk;
            setSeasonAsk(null);
            void changeSeason(what);
          }}
        />
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

      {/* landscape: app switches on the left, the user list on the right */}
      <div className="lp2-admin">
        <div className="lp2-admin-side">
          <AppSwitches auth={auth} />
        </div>
        <div className="lp2-admin-main">
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
                  <Avatar name={u.displayName} avatar={u.avatar} size="sm" />
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
        </div>
      </div>

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
