import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ApiError, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { LEAGUE_CROWNS, LEAGUE_POINTS, MIN_REWARD_GAME_SEC, type LeagueBoard, type LeagueResponse, type LeagueRow } from '../types';
import type { Auth } from '../useAuth';
import { Avatar } from './Avatar';
import { FullPage } from './FullPage';
import { LevelBadge } from './LevelBadge';

type Crown = (typeof LEAGUE_CROWNS)[number];

/** "1 game", "3 games" */
const plural = (n: number, one: string, many = `${one}s`) => `${formatCoins(n)} ${n === 1 ? one : many}`;

/** time left as "2d 5h", "5h 20m" or "20m" */
function timeLeft(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** a crown's number in words: "32 pts", "4 liars caught", "3 lies got away" */
function crownValue(c: Crown, value: number): string {
  if (c.stat === 'points') return plural(value, 'pt');
  if (c.stat === 'goodCalls') return `${plural(value, 'liar')} caught`;
  return `${plural(value, 'lie')} got away`;
}

/** who holds a crown, by name ("You" for me); more than two are cut short */
function holders(board: LeagueBoard, ids: string[]): string {
  const names = ids.flatMap((id) => {
    const r = board.rows.find((x) => x.id === id);
    return r ? [r.me ? 'You' : r.displayName] : [];
  });
  return names.length <= 2 ? names.join(' & ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

/** the crowns a player holds on a board */
const crownsOf = (board: LeagueBoard, id: string) => LEAGUE_CROWNS.filter((c) => board.crowns.some((h) => h.id === c.id && h.userIds.includes(id)));

/** my row, once I've played that week */
const myRow = (board: LeagueBoard | null | undefined) => {
  const me = board?.rows.find((r) => r.me);
  return me && me.games > 0 ? me : null;
};

function BoardRow({ row, board, index }: { row: LeagueRow; board: LeagueBoard; index: number }) {
  const crowns = crownsOf(board, row.id);
  return (
    <li
      className={cx('league-row', row.me && 'me', row.points > 0 && row.place <= 3 && `podium-${row.place}`)}
      style={{ '--i': index } as CSSProperties}
    >
      <span className="league-place">{row.place}</span>
      <Avatar name={row.displayName} avatar={row.avatar} size="sm" />
      <div className="league-who">
        <p className="league-name">
          <b>{row.displayName}</b>
          {row.me && <span className="tag">You</span>}
          <LevelBadge level={row.level} />
          {crowns.length > 0 && (
            <span className="league-row-crowns" title={crowns.map((c) => c.title).join(', ')}>
              {crowns.map((c) => c.emoji).join('')}
            </span>
          )}
        </p>
        <p className="league-stats">
          <span>
            {plural(row.games, 'game')} · {plural(row.wins, 'win')}
          </span>
          <span>
            <span title="Liars caught">🕵️ {formatCoins(row.goodCalls)}</span>
            <span title="Lies that got away">🤥 {formatCoins(row.cleanBluffs)}</span>
          </span>
        </p>
      </div>
      <span className="league-points">
        <b>{formatCoins(row.points)}</b>
        <small>pts</small>
      </span>
    </li>
  );
}

/** a week's three crowns: who holds each, or still up for grabs; a finished week shows only the ones won */
function CrownList({ board, over }: { board: LeagueBoard; over: boolean }) {
  const shown = over ? LEAGUE_CROWNS.filter((c) => board.crowns.some((h) => h.id === c.id)) : LEAGUE_CROWNS;
  return (
    <ul className={cx('league-crowns', over && 'compact')}>
      {shown.map((c, i) => {
        const held = board.crowns.find((h) => h.id === c.id);
        const mine = !!held && board.rows.some((r) => r.me && held.userIds.includes(r.id));
        return (
          <li key={c.id} className={cx('league-crown', held && 'held', mine && 'mine')} style={{ '--i': i } as CSSProperties}>
            <span className="league-crown-emoji" aria-hidden>
              {c.emoji}
            </span>
            <div className="league-crown-text">
              <b>{c.title}</b>
              {held ? (
                <span>
                  {holders(board, held.userIds)} · {crownValue(c, held.value)}
                </span>
              ) : (
                <span className="muted">Up for grabs</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  auth: Auth;
  onClose: () => void;
  /** the board the caller already has, shown until a fresh one arrives */
  initial?: LeagueResponse | null;
  /** every fresh copy, so the caller's place stays right */
  onChange?: (l: LeagueResponse) => void;
}

/** this week's board of me and my friends, its crowns, last week's winners, the hide switch and how points work */
export function LeaguePage({ auth, onClose, initial = null, onChange }: Props) {
  const [data, setData] = useState<LeagueResponse | null>(initial);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const changed = useRef(onChange);
  /** a new error is scrolled into view, wherever on the page it came from */
  const errorRef = useRef<HTMLParagraphElement>(null);
  changed.current = onChange;

  const got = (l: LeagueResponse) => {
    setData(l);
    changed.current?.(l);
  };

  const load = () => {
    auth
      .league()
      .then((l) => {
        setError('');
        got(l);
      })
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'The friends league is coming soon. Try again later.' : errorText(err)));
  };

  useEffect(() => {
    load();
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 30_000);
    // a phone waking up shows the right countdown at once
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  // the week ran out while the page is open: fetch the new board; the 30 s tick paces retries
  const resetAt = data ? Date.parse(data.resetAt) : NaN;
  useEffect(() => {
    if (Number.isNaN(resetAt) || now < resetAt) return;
    load();
  }, [now, resetAt]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [error]);

  const retry = () => {
    setError('');
    load();
  };

  const setHidden = async (hidden: boolean) => {
    setError('');
    setBusy(true);
    try {
      got(await auth.setLeagueHidden(hidden));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const board = data?.thisWeek ?? null;
  const last = data?.lastWeek ?? null;
  const me = myRow(board);
  const lastMe = myRow(last);
  const anyone = !!board && board.rows.some((r) => r.games > 0);
  const friendsPlayed = !!board && board.rows.some((r) => !r.me && r.games > 0);
  const minutes = MIN_REWARD_GAME_SEC / 60;

  return (
    <FullPage title="Friends league" onBack={onClose}>
      <section className="panel league-head">
        <span className="league-head-emoji" aria-hidden>
          🏆
        </span>
        <div className="grow">
          <b className="league-head-title">{me ? `You're #${me.place} this week` : "This week's board"}</b>
          <span className="league-head-sub">
            {Number.isNaN(resetAt) ? 'A new week starts every Monday' : `⏳ New week in ${timeLeft(resetAt - now)}`}
          </span>
        </div>
        {me && (
          <span className="league-points big">
            <b>{formatCoins(me.points)}</b>
            <small>pts</small>
          </span>
        )}
      </section>
      {error && (
        <p ref={errorRef} className="form-error">
          {error}
        </p>
      )}
      {!data && !error && <p className="muted small">Loading…</p>}
      {error && !busy && (
        <button className="btn ghost block" onClick={retry}>
          Try again
        </button>
      )}
      {data && board && (
        <>
          <section className="panel stack-tight">
            <h3 className="section-title">This week's crowns</h3>
            <CrownList board={board} over={false} />
          </section>

          <section className="panel stack-tight league-board">
            <h3 className="section-title">This week</h3>
            {anyone ? (
              <ol className="league-rows">
                {board.rows.map((r, i) => (
                  <BoardRow key={r.id} row={r} board={board} index={i} />
                ))}
              </ol>
            ) : (
              <div className="league-empty">
                <span aria-hidden>🏁</span>
                <b>No games yet this week</b>
                <p className="muted small">Play a game of {minutes} min or more with logged-in friends to get on the board.</p>
              </div>
            )}
            {anyone && !friendsPlayed && <p className="muted small league-hint">None of your friends has played this week yet. Invite them for a game!</p>}
            {anyone && !me && <p className="muted small league-hint">Play a game of {minutes} min or more to get on the board.</p>}
          </section>

          {last && (
            <section className="panel stack-tight">
              <h3 className="section-title">Last week's winners</h3>
              <CrownList board={last} over />
              {lastMe && (
                <p className="muted small">
                  You finished #{lastMe.place} of {last.rows.length} with {plural(lastMe.points, 'pt')}.
                </p>
              )}
            </section>
          )}

          <section className="panel notify-row">
            <div className="setting-row">
              <div className="grow">
                <b>🙈 Hide me from my friends' boards</b>
                <span>{data.hidden ? "Friends don't see you here. You still see your own board." : 'Friends see your points on their boards.'}</span>
              </div>
              <div className="mini-seg" role="group" aria-label="Hide me from my friends' boards">
                <button className={data.hidden ? 'on' : ''} aria-pressed={data.hidden} disabled={busy} onClick={() => !data.hidden && void setHidden(true)}>
                  On
                </button>
                <button className={!data.hidden ? 'on' : ''} aria-pressed={!data.hidden} disabled={busy} onClick={() => data.hidden && void setHidden(false)}>
                  Off
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="panel stack-tight">
        <h3 className="section-title">How points work</h3>
        <ul className="league-how">
          <li>
            <span aria-hidden>🏆</span> Win a game <b>+{LEAGUE_POINTS.win}</b>
          </li>
          <li>
            <span aria-hidden>🕵️</span> Catch a liar <b>+{LEAGUE_POINTS.goodCall}</b>
          </li>
          <li>
            <span aria-hidden>🤥</span> A lie nobody caught <b>+{LEAGUE_POINTS.cleanBluff}</b>
          </li>
          <li>
            <span aria-hidden>🃏</span> Each game <b>+{LEAGUE_POINTS.game}</b>
          </li>
        </ul>
        <p className="muted small">
          Finished games of {minutes} min or more with 2+ logged-in players count (not players removed by the host). Points are just for bragging rights, never coins. A new week starts
          every Monday.
        </p>
      </section>
    </FullPage>
  );
}

/** the 🏆 Friends league button with my place this week; opens the league page (hidden for guests and older servers) */
export function LeagueButton({ auth, online = true }: { auth: Auth; online?: boolean }) {
  const userId = auth.user?.id ?? null;
  /** null until loaded; 'off' when the server has no league yet */
  const [league, setLeague] = useState<LeagueResponse | 'off' | null>(null);
  const [open, setOpen] = useState(false);

  // another account: forget the old place
  useEffect(() => setLeague(null), [userId]);
  // load the place, again once a waking server answers
  useEffect(() => {
    if (!userId || !online) return;
    let live = true;
    auth
      .league()
      .then((l) => live && setLeague(l))
      .catch((err) => {
        if (live && err instanceof ApiError && err.status === 404) setLeague('off');
      });
    return () => {
      live = false;
    };
  }, [userId, online]);
  // a new week: fetch the new board so last week's place doesn't stay up
  const resetAt = league && league !== 'off' ? Date.parse(league.resetAt) : NaN;
  useEffect(() => {
    if (Number.isNaN(resetAt) || !userId) return;
    let live = true;
    // timers can't wait longer than about 24 days; a few seconds late gives the server time to roll over
    const timer = setTimeout(
      () => {
        auth
          .league()
          .then((l) => live && setLeague(l))
          .catch(() => undefined);
      },
      Math.min(Math.max(0, resetAt - Date.now()) + 5_000, 2 ** 31 - 1),
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [resetAt, userId]);

  if (!userId || (league === 'off' && !open)) return null;
  const me = league && league !== 'off' ? myRow(league.thisWeek) : null;
  return (
    <>
      <button className="panel league-entry" onClick={() => setOpen(true)}>
        <span className="league-entry-emoji" aria-hidden>
          🏆
        </span>
        <span className="grow">Friends league</span>
        {me && (
          <span className={cx('league-pill', me.place === 1 && 'first')}>
            #{me.place}
            <span className="league-pill-more"> this week</span>
          </span>
        )}
        <span className="league-chevron" aria-hidden>
          ›
        </span>
      </button>
      {open && <LeaguePage auth={auth} initial={league === 'off' ? null : league} onChange={setLeague} onClose={() => setOpen(false)} />}
    </>
  );
}
