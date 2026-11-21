import { useEffect, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { MIN_REWARD_GAME_SEC, type RivalRecord } from '../types';
import type { Auth } from '../useAuth';
import { Avatar } from './Avatar';
import { LevelBadge } from './LevelBadge';
import { PlayerSheet } from './PlayerSheet';

/** friends the profile lists before "Show all" */
const TOP = 3;


const gamesText = (n: number) => `${n} game${n === 1 ? '' : 's'}`;

/** the most games I've played with any one friend; the friends on it are my special ones */
const topGames = (records: RivalRecord[]) => Math.max(0, ...records.map((r) => r.games));

/** ❤️ and the games we finished together; it glows for the friend(s) I've played with most */
function Heart({ games, top }: { games: number; top: boolean }) {
  return (
    <p className={cx('heart-line', top && 'top')} aria-label={`${gamesText(games)} together${top ? ', your most played friend' : ''}`}>
      <span className="heart" aria-hidden>
        {top ? '💖' : '❤️'}
      </span>
      <b>{games}</b> {games === 1 ? 'game' : 'games'} together
      {top && <small>most played</small>}
    </p>
  );
}

/** on a friend's card: just the heart with our games together */
export function RivalPanel({ auth, username }: { auth: Auth; username: string }) {
  const userId = auth.user?.id ?? null;
  /** undefined while loading; 'off': an older server, or it failed */
  const [records, setRecords] = useState<RivalRecord[] | 'off' | undefined>(undefined);

  useEffect(() => {
    setRecords(undefined);
    if (!userId) return;
    let live = true;
    // the whole list, so the card knows whether this is my most played friend
    auth
      .rivals()
      .then((r) => live && setRecords(r.records ?? []))
      .catch(() => live && setRecords('off'));
    return () => {
      live = false;
    };
  }, [userId, username]);

  if (!userId || records === undefined || records === 'off') return null;
  const mine = records.find((r) => r.username === username);
  if (!mine) return <p className="heart-line empty">🤍 No games together yet. Finish one of {MIN_REWARD_GAME_SEC / 60} min or more.</p>;
  return <Heart games={mine.games} top={mine.games === topGames(records)} />;
}

/** one friend on my profile: name and our games together; tap for their card */
function RivalRow({ record: r, index, top, onOpen }: { record: RivalRecord; index: number; top: boolean; onOpen: () => void }) {
  return (
    <li className={cx('rival-row', top && 'top')} style={{ '--i': index } as CSSProperties}>
      <button type="button" className="row-open" onClick={onOpen}>
        <Avatar name={r.displayName} avatar={r.avatar} size="sm" />
        <div className="grow">
          <b>{r.displayName}</b> <LevelBadge level={r.level} />
          {top && <p className="rival-meta">💖 Most played</p>}
        </div>
        <span className={cx('heart-count', top && 'top')} aria-label={`${gamesText(r.games)} together`}>
          {top ? '💖' : '❤️'} {r.games}
        </span>
      </button>
    </li>
  );
}

/** friends I've played with, most games first, for my profile */
export function RivalsList({ auth }: { auth: Auth }) {
  const userId = auth.user?.id ?? null;
  /** null until loaded; an older server or a failed load keeps the section hidden */
  const [records, setRecords] = useState<RivalRecord[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  /** the friend whose card is open */
  const [viewing, setViewing] = useState<RivalRecord | null>(null);

  useEffect(() => {
    setRecords(null);
    setShowAll(false);
    setViewing(null);
    if (!userId) return;
    let live = true;
    auth
      .rivals()
      .then((r) => live && setRecords(r.records ?? []))
      .catch(() => live && setRecords(null));
    return () => {
      live = false;
    };
  }, [userId]);

  if (!userId || !records || records.length === 0) return null;
  const shown = showAll ? records : records.slice(0, TOP);
  const most = topGames(records);
  return (
    <>
      <section className="panel stack-tight rivals">
        <h3 className="section-title">❤️ Games together</h3>
        <ul className="rival-list">
          {shown.map((r, i) => (
            <RivalRow key={r.id} record={r} index={i} top={r.games === most} onOpen={() => setViewing(r)} />
          ))}
        </ul>
        {records.length > TOP && (
          <button type="button" className={cx('fold-btn', 'rivals-more', showAll && 'open')} aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Show less' : `Show all ${records.length}`} <i aria-hidden>▾</i>
          </button>
        )}
      </section>
      {viewing && (
        <PlayerSheet
          auth={auth}
          name={viewing.displayName}
          username={viewing.username}
          level={viewing.level}
          avatar={viewing.avatar}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  );
}
