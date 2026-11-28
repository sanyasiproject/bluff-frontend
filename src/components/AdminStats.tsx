import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { api, errorText } from '../lib/api';
import { compactCoins } from '../lib/coins';
import { gameInfo, type AdminStats as Stats } from '../types';
import type { Auth } from '../useAuth';
import { AdminChart } from './AdminChart';
import '../styles/land-admin-stats.css';

/** how often the open tab reads the stats again */
const REFRESH_MS = 30_000;

/** 3d 4h, 5h 12m or 7m */
function uptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

/** one big number with its label and an optional small line under it */
function Big({ label, value, sub }: { label: string; value: number; sub?: ReactNode }) {
  return (
    <div className="panel as-big">
      <span className="as-big-n" data-no-translate>
        {value.toLocaleString('en-IN')}
      </span>
      <span className="as-big-l">{label}</span>
      {sub && <span className="as-big-s muted small">{sub}</span>}
    </div>
  );
}

/** the game's emoji and name */
const GameName = ({ kind }: { kind: Parameters<typeof gameInfo>[0] }) => {
  const g = gameInfo(kind);
  return (
    <span className="as-game">
      <span aria-hidden>{g.emoji}</span> <span>{g.name}</span>
    </span>
  );
};

/** admins: how the app is doing now, today and over 14 days; counts only */
export function AdminStats({ auth, slot = null }: { auth: Auth; slot?: HTMLElement | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const token = useRef(auth.token);
  token.current = auth.token;

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setStats(await api<Stats>('/admin/stats', { token: token.current }));
      setError('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, []);

  // every 30 s while the screen is showing; at once when it shows again
  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(() => void load(), REFRESH_MS);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        void load();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const s = stats;
  const bar = (
    <div className="as-bar">
      <span className="muted small">
        {s ? (
          <>
            <span>Updated</span> <span data-no-translate>{clock(s.at)}</span>
          </>
        ) : (
          <span>Loading…</span>
        )}
      </span>
      <button className="btn small ghost" disabled={busy} onClick={() => void load()}>
        ↻ Refresh
      </button>
    </div>
  );
  return (
    <div className="as-page">
      {slot ? createPortal(bar, slot) : bar}
      {error && <p className="form-error">{error}</p>}
      {s && (
        <>
          <div className="as-bigs">
            <Big
              label="Online now"
              value={s.now.users + s.now.guests}
              sub={
                <>
                  <span data-no-translate>{s.now.users}</span> <span>accounts</span> · <span data-no-translate>{s.now.guests}</span> <span>guests</span>
                </>
              }
            />
            <Big
              label="Rooms playing"
              value={s.now.rooms.playing}
              sub={
                <>
                  <span data-no-translate>{s.now.rooms.lobby}</span> <span>in lobby</span>
                </>
              }
            />
            <Big
              label="Games today"
              value={s.today.finished}
              sub={
                <>
                  <span data-no-translate>{s.today.stopped}</span> <span>stopped</span>
                </>
              }
            />
            <Big label="New accounts today" value={s.today.newAccounts} />
            <Big label="Active today" value={s.today.active} />
          </div>

          <div className="as-grid">
            <section className="panel as-box as-chart-box">
              <h3>Last 14 days</h3>
              <AdminChart days={s.days} />
            </section>

            <section className="panel as-box">
              <h3>Rooms now</h3>
              {s.now.rooms.byGame.length === 0 ? (
                <p className="muted small">No rooms open</p>
              ) : (
                <table className="as-table">
                  <thead>
                    <tr>
                      <th scope="col">Game</th>
                      <th scope="col">Playing</th>
                      <th scope="col">Lobby</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.now.rooms.byGame.map((r) => (
                      <tr key={r.kind}>
                        <th scope="row">
                          <GameName kind={r.kind} />
                        </th>
                        <td>{r.playing}</td>
                        <td>{r.lobby}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="muted small as-line">
                <span>At tables</span> <b data-no-translate>{s.now.players}</b> · <span>Bots</span> <b data-no-translate>{s.now.bots}</b> ·{' '}
                <span>Watching</span> <b data-no-translate>{s.now.watchers}</b> · <span>Saved, waiting</span> <b data-no-translate>{s.now.savedRoomsWaiting}</b>
              </p>
            </section>

            <section className="panel as-box">
              <h3>Top games, 7 days</h3>
              {s.totals.topGames7d.length === 0 ? (
                <p className="muted small">No games yet</p>
              ) : (
                <ol className="as-top">
                  {s.totals.topGames7d.map((g) => (
                    <li key={g.kind}>
                      <GameName kind={g.kind} />
                      <b data-no-translate>{g.games}</b>
                    </li>
                  ))}
                </ol>
              )}
              <p className="muted small as-line">
                <span>Rated chess</span> <b data-no-translate>{s.totals.chessRated7d}</b> · <span>Accounts</span> <b data-no-translate>{s.totals.accounts}</b> ·{' '}
                <span>Saved games</span> <b data-no-translate>{s.totals.games}</b>
              </p>
              <p className="muted small as-line">
                <span>Coins today</span> <b data-no-translate>+{compactCoins(s.today.coinsWon)}</b> /{' '}
                <b data-no-translate>−{compactCoins(s.today.coinsLost)}</b>
              </p>
            </section>

            <section className="panel as-box">
              <h3>Server</h3>
              <dl className="as-server">
                <dt>Uptime</dt>
                <dd data-no-translate>{uptime(s.server.uptimeSec)}</dd>
                <dt>Memory</dt>
                <dd data-no-translate>
                  {Math.round(s.server.rssMb)} MB · heap {Math.round(s.server.heapUsedMb)}/{Math.round(s.server.heapTotalMb)}
                </dd>
                <dt>Commit</dt>
                <dd data-no-translate>{s.server.commit ?? '–'}</dd>
                <dt>Caught errors</dt>
                <dd data-no-translate className={s.server.caughtErrors > 0 ? 'as-warn' : undefined}>
                  {s.server.caughtErrors}
                </dd>
              </dl>
              <p className="muted small as-line">
                <span>Rooms restored</span> <b data-no-translate>{s.server.roomsRestored}</b> · <span>Most sockets on one network</span>{' '}
                <b data-no-translate>{s.server.maxSocketsPerIp}</b> · <span data-no-translate>{s.server.node}</span>
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
