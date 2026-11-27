import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ApiError, errorText } from '../lib/api';
import { cx } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { MIN_REWARD_GAME_SEC, missionOf, SECRET_XP, type MissionDef, type MissionsResponse, type MissionView } from '../types';
import type { Auth } from '../useAuth';
import { ConfirmBox } from './ConfirmBox';
import { FullPage } from './FullPage';
import { Icon } from '../art/icons';
import { DailyLadder } from './ProfileParts';

/** one of my missions with its catalogue entry */
interface Known {
  view: MissionView;
  def: MissionDef;
}

/** missions this app knows; ids from a newer server are left out */
const known = (list: MissionView[] | undefined): Known[] =>
  (list ?? []).flatMap((view) => {
    const def = missionOf(view.id);
    return def ? [{ view, def }] : [];
  });

/** today's missions done out of today's set, for the Home button */
export function todayCount(m: MissionsResponse): { done: number; total: number } {
  const daily = known(m.daily);
  return { done: daily.filter((k) => k.view.done).length, total: daily.length };
}

const DAY_MS = 86_400_000;

/** time left in hours and minutes */
function timeLeft(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** when a set starts again: a countdown for today's; for this week's the weekday, or a countdown on its last day */
function resetText(iso: string, now: number, weekly: boolean): string | null {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  const left = at - now;
  if (!weekly) return `New missions in ${timeLeft(left)}`;
  if (left < DAY_MS) return `New ones in ${timeLeft(left)}`;
  const day = (t: number) => new Date(t).toLocaleDateString('en-IN', { weekday: 'long' });
  // right after a Monday reset the next one is a week away
  return `New ones ${day(at) === day(now) ? 'next ' : ''}${day(at)}`;
}

interface RowProps {
  item: Known;
  index: number;
  /** just swapped in: highlighted once */
  fresh: boolean;
  /** the 🎲 button, only on unfinished missions while today's swap is left */
  onSwap?: () => void;
  busy: boolean;
}

function MissionRow({ item, index, fresh, onSwap, busy }: RowProps) {
  const { view, def } = item;
  const progress = Math.min(Math.max(0, view.progress), def.goal);
  return (
    <li className={cx('mission', view.done && 'done', fresh && 'fresh')} style={{ '--i': index } as CSSProperties}>
      <span className="mission-emoji" aria-hidden>
        {def.emoji}
      </span>
      <div className="mission-main">
        <b className="mission-title">{def.title}</b>
        <div className="mission-bar" aria-hidden>
          <i style={{ width: `${view.done ? 100 : (progress / def.goal) * 100}%` }} />
        </div>
        <p className="mission-meta">
          <span className="mission-progress">{view.done ? '✓ Done' : `${progress}/${def.goal}`}</span>
          <span className="mission-reward">
            <span>+{formatCoins(def.coins)} 🪙</span> · <span>+{def.xp} XP</span>
          </span>
        </p>
      </div>
      {onSwap && (
        <button type="button" className="mission-swap" disabled={busy} aria-label={`Swap "${def.title}" for a new mission`} onClick={onSwap}>
          🎲
        </button>
      )}
    </li>
  );
}

interface SetProps {
  title: string;
  items: Known[];
  reset: string | null;
  fresh: string | null;
  /** today's free swap is still there */
  canSwap: boolean;
  busy: boolean;
  onSwap: (item: Known) => void;
}

/** today's or this week's missions */
function MissionSet({ title, items, reset, fresh, canSwap, busy, onSwap }: SetProps) {
  const done = items.filter((k) => k.view.done).length;
  const all = items.length > 0 && done === items.length;
  return (
    <section className="panel stack-tight mission-set">
      <div className="mission-set-head">
        <h3 className="section-title">{title}</h3>
        <span className={cx('mission-count', all && 'done')}>{all ? 'All done 🎉' : `${done}/${items.length} done`}</span>
      </div>
      {reset && <p className="muted small">{reset}</p>}
      {items.length === 0 ? (
        <p className="muted small">No missions here right now.</p>
      ) : (
        <ul className="mission-list">
          {items.map((k, i) => (
            <MissionRow
              key={k.view.id}
              item={k}
              index={i}
              fresh={fresh === k.view.id}
              busy={busy}
              onSwap={canSwap && !k.view.done ? () => onSwap(k) : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface Props {
  auth: Auth;
  onClose: () => void;
  /** missions the caller already has, shown until fresh ones arrive */
  initial?: MissionsResponse | null;
  /** every fresh copy, so the caller's count stays right */
  onChange?: (m: MissionsResponse) => void;
}

/** today's and this week's missions, the free swap, the daily games ladder and a word on secret cards */
export function MissionsPage({ auth, onClose, initial = null, onChange }: Props) {
  const [data, setData] = useState<MissionsResponse | null>(initial);
  const [error, setError] = useState('');
  const [gamesToday, setGamesToday] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  /** the mission waiting for a yes before it's swapped */
  const [asking, setAsking] = useState<Known | null>(null);
  const [busy, setBusy] = useState(false);
  /** the mission a swap just brought in */
  const [fresh, setFresh] = useState<string | null>(null);
  const changed = useRef(onChange);
  /** a new error is scrolled into view, wherever on the page it came from */
  const errorRef = useRef<HTMLParagraphElement>(null);
  changed.current = onChange;

  const got = (m: MissionsResponse) => {
    setData(m);
    changed.current?.(m);
  };

  const load = () => {
    auth
      .missions()
      .then((m) => {
        setError('');
        got(m);
      })
      .catch((err) => setError(err instanceof ApiError && err.status === 404 ? 'Missions are coming soon. Try again later.' : errorText(err)));
    auth
      .overview()
      .then((o) => setGamesToday(o.gamesToday))
      .catch(() => undefined);
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

  // a set ran out while the page is open: fetch the new one; the 30 s tick paces retries if the server isn't there yet
  const nextReset = data ? Math.min(Date.parse(data.dailyResetAt), Date.parse(data.weeklyResetAt)) : NaN;
  useEffect(() => {
    if (Number.isNaN(nextReset) || now < nextReset) return;
    load();
  }, [now, nextReset]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [error]);

  const retry = () => {
    setError('');
    load();
  };

  const swap = async (k: Known) => {
    setAsking(null);
    setError('');
    setBusy(true);
    const before = new Set([...(data?.daily ?? []), ...(data?.weekly ?? [])].map((m) => m.id));
    try {
      const m = await auth.swapMission(k.view.id);
      got(m);
      setFresh([...m.daily, ...m.weekly].find((x) => !before.has(x.id))?.id ?? null);
    } catch (err) {
      setError(errorText(err));
      // the swap may have been used on another phone: show what's true now
      auth
        .missions()
        .then(got)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const daily = known(data?.daily);
  const weekly = known(data?.weekly);
  const canSwap = !!data?.rerollLeft;
  const anyOpen = [...daily, ...weekly].some((k) => !k.view.done);

  return (
    <FullPage title="Missions" onBack={onClose} className="lp-missions">
      <div className="nt-page-hero">
        <span className="nt-head-icon" aria-hidden>
          <Icon name="missions" size={28} />
        </span>
        <p className="muted small mission-intro">
          Finish games of {MIN_REWARD_GAME_SEC / 60} min or more to fill these up. Coins and XP are added as soon as a mission is done.
        </p>
      </div>
      {error && (
        <p ref={errorRef} className="form-error">
          {error}
        </p>
      )}
      {!data && !error && <p className="muted small">Loading…</p>}
      {error && (
        <button className="btn ghost block" onClick={retry}>
          Try again
        </button>
      )}
      {data && (
        <>
          <MissionSet
            title="Today"
            items={daily}
            reset={resetText(data.dailyResetAt, now, false)}
            fresh={fresh}
            canSwap={canSwap}
            busy={busy}
            onSwap={setAsking}
          />
          <MissionSet
            title="This week"
            items={weekly}
            reset={resetText(data.weeklyResetAt, now, true)}
            fresh={fresh}
            canSwap={canSwap}
            busy={busy}
            onSwap={setAsking}
          />
          {canSwap ? (
            anyOpen && <p className="mission-note">🎲 Don't like one? Swap it for a new one, once a day.</p>
          ) : (
            <p className="mission-note">🎲 Today's swap is used. You get a new one tomorrow.</p>
          )}
        </>
      )}
      {(data || error) && gamesToday !== null && <DailyLadder gamesToday={gamesToday} />}
      <p className="mission-note secret">
        🤫 <b>Secret missions:</b> every game deals you a secret card. Do it in a game of {MIN_REWARD_GAME_SEC / 60} min or more for{' '}
        <b>+{SECRET_XP} XP</b>. Everyone's cards are shown at the end.
      </p>
      {asking && (
        <ConfirmBox
          title="Swap this mission?"
          body={
            <>
              {asking.def.emoji} <b>{asking.def.title}</b>
              {asking.view.progress > 0 && ` (${Math.min(asking.view.progress, asking.def.goal)}/${asking.def.goal} so far)`} goes and a new
              one starts from 0. One free swap a day.
            </>
          }
          action="🎲 Swap"
          cancel="Keep it"
          danger={false}
          onConfirm={() => void swap(asking)}
          onCancel={() => setAsking(null)}
        />
      )}
    </FullPage>
  );
}

/** the 🎯 Missions button with today's count; hidden for guests and for a server without missions */
export function MissionsButton({ auth, online = true }: { auth: Auth; online?: boolean }) {
  const userId = auth.user?.id ?? null;
  /** null until loaded; 'off' when the server has no missions yet */
  const [missions, setMissions] = useState<MissionsResponse | 'off' | null>(null);
  const [open, setOpen] = useState(false);

  // another account: forget the old count
  useEffect(() => setMissions(null), [userId]);
  // load the count, again once a waking server answers
  useEffect(() => {
    if (!userId || !online) return;
    let live = true;
    auth
      .missions()
      .then((m) => live && setMissions(m))
      .catch((err) => {
        if (live && err instanceof ApiError && err.status === 404) setMissions('off');
      });
    return () => {
      live = false;
    };
  }, [userId, online]);

  if (!userId || (missions === 'off' && !open)) return null;
  const count = missions && missions !== 'off' ? todayCount(missions) : null;
  return (
    <>
      <button className="panel missions-entry" onClick={() => setOpen(true)}>
        <span className="missions-entry-emoji" aria-hidden>
          <Icon name="missions" size={26} />
        </span>
        <span className="grow">Missions</span>
        {count && count.total > 0 && (
          <span className={cx('missions-pill', count.done >= count.total && 'done')}>
            {count.done}/{count.total} today
          </span>
        )}
        <span className="missions-chevron" aria-hidden>
          ›
        </span>
      </button>
      {open && <MissionsPage auth={auth} initial={missions === 'off' ? null : missions} onChange={setMissions} onClose={() => setOpen(false)} />}
    </>
  );
}
