// Home's featured-game banner: big drawn art, name, tagline, players and one gold Play button
import type { CSSProperties, ReactNode } from 'react';
import { GameArt } from '../art/GameArt';
import { Icon } from '../art/icons';
import { lastGame } from '../games/lastPlayed';
import { GAME_CATALOG, gameInfo, type GameKind } from '../types';

/** the game to feature: the first new one, else the one played last, else the first in the catalog */
export function featuredGame(): GameKind {
  return GAME_CATALOG.find((g) => g.isNew)?.kind ?? lastGame() ?? GAME_CATALOG[0].kind;
}

interface Props {
  kind: GameKind;
  /** opens the Play panel with this game picked */
  onPlay: () => void;
  /** opens the Play panel to join with a code */
  onCode: () => void;
  /** rejoin / waiting chip, shown over the art */
  chip?: ReactNode;
}

export function HomeFeatured({ kind, onPlay, onCode, chip }: Props) {
  const g = gameInfo(kind);
  return (
    <section className="nt-feature" style={{ '--c1': g.colors[0], '--c2': g.colors[1] } as CSSProperties} aria-label={`Featured: ${g.name}`}>
      <button type="button" className="nt-feature-art" tabIndex={-1} aria-hidden onClick={onPlay}>
        <GameArt kind={kind} className="nt-float-slow" />
      </button>
      <div className="nt-feature-top">
        {g.isNew ? <span className="nt-badge new">New</span> : <span className="nt-badge">Featured</span>}
        {chip}
      </div>
      <div className="nt-feature-body">
        <div className="nt-feature-text">
          <h2 className="nt-title nt-feature-name">{g.name}</h2>
          <p className="nt-feature-tag">{g.tagline}</p>
          <span className="nt-feature-meta">
            <Icon name="friends" size={16} /> {g.minPlayers === g.maxPlayers ? g.maxPlayers : `${g.minPlayers}–${g.maxPlayers}`} players
            {g.teams && ' · 2v2'}
          </span>
        </div>
        <div className="nt-feature-actions">
          <button type="button" className="nt-btn big nt-feature-play" onClick={onPlay}>
            <Icon name="play" size={22} accent="#3a2400" /> Play {g.name}
          </button>
          <button type="button" className="nt-btn ghost nt-feature-code" onClick={onCode}>
            Have a code?
          </button>
        </div>
      </div>
    </section>
  );
}
