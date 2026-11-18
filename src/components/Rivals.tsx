import { useEffect, useState, type CSSProperties } from 'react';
import { cx } from '../lib/cards';
import { DOSTI_LEVELS, dostiOf, MIN_REWARD_GAME_SEC, type RivalRecord } from '../types';
import type { Auth } from '../useAuth';
import { Avatar } from './Avatar';
import { LevelBadge } from './LevelBadge';
import { PlayerSheet } from './PlayerSheet';

/** friends the profile lists before "Show all" */
const TOP = 3;

/** the two tags; there's none for being far ahead, so nobody is mocked */
const TAGS = {
  rival: { emoji: '⚔️', name: 'Rival', note: 'neck and neck' },
  nemesis: { emoji: '😈', name: 'Nemesis', note: 'usually ahead of you' },
} as const;

const gamesText = (n: number) => `${n} game${n === 1 ? '' : 's'}`;

/** the Dosti level for games together, the next one, and how far the bar is towards it */
function dostiInfo(games: number) {
  const level = dostiOf(games);
  const next = DOSTI_LEVELS.find((d) => d.games > games) ?? null;
  const from = level?.games ?? 0;
  return { name: level?.name ?? 'Dosti', next, progress: next ? (games - from) / (next.games - from) : 1 };
}

/** the Dosti meter: level, games together, and the bar to the next level */
function DostiMeter({ games }: { games: number }) {
  const { name, next, progress } = dostiInfo(games);
  return (
    <div className="dosti">
      <div className="dosti-head">
        <b>🤝 {name}</b>
        <span className="muted">{gamesText(games)} together</span>
      </div>
      <div className="dosti-bar" aria-hidden>
        <i style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} />
      </div>
      <p className="muted small">{next ? `${next.games - games} more to ${next.name}` : 'Top Dosti level 💖'}</p>
    </div>
  );
}

/** my record against one friend: score, tag, who caught whom and the Dosti meter */
function RivalCard({ record: r }: { record: RivalRecord }) {
  const tag = r.tag ? TAGS[r.tag] : null;
  return (
    <section className="rival-panel" aria-label={`You against ${r.displayName}`}>
      <div className="rival-head">
        <span className="rival-vs">You vs {r.displayName}</span>
        <b className="rival-score" title="Games you finished ahead – behind">
          {r.ahead}–{r.behind}
        </b>
      </div>
      {tag && (
        <p className={cx('rival-tag', `is-${r.tag}`)}>
          {tag.emoji} <b>{tag.name}</b> · {tag.note}
        </p>
      )}
      {r.iCaught + r.theyCaught > 0 ? (
        <div className="rival-catches">
          <div>
            <b>{r.iCaught}×</b>
            <span>you caught {r.displayName}</span>
          </div>
          <div>
            <b>{r.theyCaught}×</b>
            <span>{r.displayName} caught you</span>
          </div>
        </div>
      ) : (
        <p className="muted small">🕵️ No lies caught between you yet</p>
      )}
      <DostiMeter games={r.games} />
    </section>
  );
}

/** me against one friend, on their player card */
export function RivalPanel({ auth, username }: { auth: Auth; username: string }) {
  const userId = auth.user?.id ?? null;
  /** undefined while loading; null: no games together; 'off': an older server, or it failed */
  const [record, setRecord] = useState<RivalRecord | null | 'off' | undefined>(undefined);

  useEffect(() => {
    setRecord(undefined);
    if (!userId) return;
    let live = true;
    auth
      .rivalOf(username)
      .then((r) => live && setRecord(r ?? null))
      .catch(() => live && setRecord('off'));
    return () => {
      live = false;
    };
  }, [userId, username]);

  if (!userId || record === undefined || record === 'off') return null;
  if (record === null) return <p className="rival-empty">🤝 No games together yet. Finish one of {MIN_REWARD_GAME_SEC / 60} min or more to start your Dosti meter!</p>;
  return <RivalCard record={record} />;
}

/** one friend on my profile: record, Dosti level and tag; tap for their card */
function RivalRow({ record: r, index, onOpen }: { record: RivalRecord; index: number; onOpen: () => void }) {
  const tag = r.tag ? TAGS[r.tag] : null;
  return (
    <li className="rival-row" style={{ '--i': index } as CSSProperties}>
      <button type="button" className="row-open" onClick={onOpen}>
        <Avatar name={r.displayName} avatar={r.avatar} size="sm" />
        <div className="grow">
          <b>{r.displayName}</b> <LevelBadge level={r.level} />
          <p className="rival-meta">
            <span>🤝 {dostiInfo(r.games).name}</span>
            {tag && (
              <span className={cx('rival-chip', `is-${r.tag}`)}>
                {tag.emoji} {tag.name}
              </span>
            )}
          </p>
        </div>
        <span className="rival-side">
          <b className="rival-score" aria-label={`you ${r.ahead}, ${r.displayName} ${r.behind}`}>
            {r.ahead}–{r.behind}
          </b>
          <small>{gamesText(r.games)}</small>
        </span>
      </button>
    </li>
  );
}

/** my records against friends (Rival and Nemesis tags, Dosti meter), for my profile */
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
  return (
    <>
      <section className="panel stack-tight rivals">
        <h3 className="section-title">⚔️ Rivals & Dosti</h3>
        <p className="muted small">Who finished ahead in your games together (you–them)</p>
        <ul className="rival-list">
          {shown.map((r, i) => (
            <RivalRow key={r.id} record={r} index={i} onOpen={() => setViewing(r)} />
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
