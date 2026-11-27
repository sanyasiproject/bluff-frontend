// Home's game grid: a tile per game in the catalog, category chips, NEW and Last played marks; built for 40 games
import '../styles/land-hub.css';
import { useState, type CSSProperties } from 'react';
import { lastGame } from '../games/lastPlayed';
import { cx } from '../lib/cards';
import { loadPref, savePref } from '../lib/storage';
import { GAME_CATALOG, GAME_CATEGORIES, type GameCategory, type GameKind } from '../types';

type Cat = 'all' | GameCategory;
const CAT_KEY = 'hubCategory';
const isCat = (v: string | null): v is Cat => v === 'all' || GAME_CATEGORIES.some((c) => c.id === v);

export function GameHub({ onPick }: { onPick: (kind: GameKind) => void }) {
  const [cat, setCat] = useState<Cat>(() => {
    const v = loadPref(CAT_KEY);
    return isCat(v) ? v : 'all';
  });
  const last = lastGame();
  const pick = (c: Cat) => {
    setCat(c);
    savePref(CAT_KEY, c);
  };
  // the one played last comes first, then the catalog's order
  const games = GAME_CATALOG.filter((g) => cat === 'all' || g.category === cat).sort((a, b) => Number(b.kind === last) - Number(a.kind === last));
  const count = (c: GameCategory) => GAME_CATALOG.filter((g) => g.category === c).length;
  return (
    <section className="hub" aria-label="Games">
      <nav className="hub-chips" role="tablist" aria-label="Game types">
        <button type="button" role="tab" aria-selected={cat === 'all'} className={cx('hub-chip', cat === 'all' && 'on')} onClick={() => pick('all')}>
          ✨ All <small>{GAME_CATALOG.length}</small>
        </button>
        {GAME_CATEGORIES.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} className={cx('hub-chip', cat === c.id && 'on')} onClick={() => pick(c.id)}>
            {c.emoji} {c.name} <small>{count(c.id)}</small>
          </button>
        ))}
      </nav>
      <div className="hub-grid" role="list">
        {games.map((g, i) => (
          <button
            key={g.kind}
            type="button"
            role="listitem"
            className={cx('hub-tile', g.kind === last && 'last')}
            style={{ '--c1': g.colors[0], '--c2': g.colors[1], '--i': i } as CSSProperties}
            aria-label={`${g.name}: ${g.tagline}. ${g.minPlayers} to ${g.maxPlayers} players`}
            onClick={() => onPick(g.kind)}
          >
            <span className="hub-emoji" aria-hidden>
              {g.emoji}
            </span>
            <b className="hub-name">{g.name}</b>
            <span className="hub-tag">{g.tagline}</span>
            <span className="hub-meta">
              👥 {g.minPlayers}–{g.maxPlayers}
              {g.teams && ' · 2v2'}
            </span>
            {g.isNew && <i className="hub-new">NEW</i>}
            {g.kind === last && <i className="hub-last">▶ Last played</i>}
          </button>
        ))}
      </div>
    </section>
  );
}
