import { pluggedSummary } from '../games/GameOptions';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBack } from '../lib/back';
import { cx, rankPlural } from '../lib/cards';
import { compactCoins, formatCoins } from '../lib/coins';
import { gameInfo, isPlugged, secretMissionOf, type RoomView } from '../types';
import type { Note } from '../useBluff';

/** the table's rules in short lines, for all three games */
export function tableRules(view: RoomView): string[] {
  const c = view.config;
  const lines: string[] = [];
  if (isPlugged(c.game)) {
    // registry games: the catalog name and the chosen options
    lines.push(`${gameInfo(c.game).emoji} ${gameInfo(c.game).name}`, ...pluggedSummary(view));
  } else if (c.game === 'rang') {
    lines.push('🌈 Rang', `Up to ${c.rangPicks} pick${c.rangPicks > 1 ? 's' : ''} a turn`);
    if (c.rangStack) lines.push('+2 and +4 stack');
    if (c.rangChallenge) lines.push('A single +4 can be challenged');
    if (c.rangSwap) lines.push('7 swaps hands, 0 passes every hand on');
  } else if (c.game === 'crazy7') {
    lines.push('7️⃣ Crazy 7', `${c.decks === 2 ? '2 decks' : '1 deck'} · ${c.handSize} cards each`, `Up to ${c.maxPicks} pick${c.maxPicks > 1 ? 's' : ''} a turn`);
    if (c.stack7) lines.push('7s stack');
    if (c.c7Power) lines.push('Power cards: J wish · 8 skip · A reverse · 2 pick two');
  } else {
    lines.push('🃏 Bluff', `${c.decks === 2 ? '2 decks' : '1 deck'} · ${c.bluffRule === 'one' ? 'a call turns over one card' : 'a call shows every card'}`);
    if (view.kismat) lines.push(`🍀 Kismat: ${rankPlural(view.kismat)} are wild, they back up any claim`);
    else if (c.kismat) lines.push('🍀 Kismat card on');
    if (c.seedhi) lines.push('🪜 Seedhi: each claim one rank down, the same, or one up');
    if (c.peeks > 0) lines.push(`🔍 ${c.peeks} peek${c.peeks > 1 ? 's' : ''} each`);
    if (c.shields > 0) lines.push(`🔒 ${c.shields} Card Shield${c.shields > 1 ? 's' : ''} each`);
  }
  lines.push(c.stake > 0 ? `🪙 ${formatCoins(c.stake)} each · pot ${compactCoins(c.stake * (view.players.length + view.leftPlayers.length))}` : 'Free game');
  return lines;
}

/** my secret mission card, in full, only here */
function SecretBlock({ view }: { view: RoomView }) {
  const secret = view.secret ?? null;
  const def = secretMissionOf(secret?.id);
  if (!secret || !def) return null;
  const progress = Math.min(secret.progress, def.goal);
  return (
    <section className={cx('tinfo-secret', secret.done && 'done')}>
      <span className="tinfo-secret-emoji" aria-hidden>
        {def.emoji}
      </span>
      <div className="grow">
        <small>🤫 Your secret mission · only you see it</small>
        <b>{def.title}</b>
        {def.how && <p>{def.how}</p>}
      </div>
      <span className="tinfo-secret-prog">{secret.done ? '✓' : def.goal > 1 ? `${progress}/${def.goal}` : '…'}</span>
    </section>
  );
}

/** what my info button shows on itself: the secret card's progress, else nothing */
export function secretBadge(view: RoomView): string | null {
  const secret = view.secret ?? null;
  const def = secretMissionOf(secret?.id);
  if (!secret || !def) return null;
  if (secret.done) return '✓';
  return def.goal > 1 ? `${Math.min(secret.progress, def.goal)}/${def.goal}` : '🤫';
}

interface Props {
  view: RoomView;
  notes?: Note[];
  /** my own counts and switches for this game (peeks left, points, partner's cards…) */
  mine?: ReactNode;
  /** short how-to lines for this table */
  tips?: string[];
}

/** one place for everything that isn't needed every second: room, rules, secret mission, my counts, tips and what just happened */
export function TableInfo({ view, notes = [], mine, tips = [] }: Props) {
  const [open, setOpen] = useState(false);
  const badge = secretBadge(view);
  return (
    <>
      <button type="button" className={cx('tinfo-btn', badge && 'has-badge')} aria-label="Table info, secret mission and rules" onClick={() => setOpen(true)}>
        <span className="tinfo-code" data-no-translate>
          {view.config.ranked && '🏅 '}
          {view.code}
        </span>
        <span className="tinfo-icon" aria-hidden>
          ☰
        </span>
        {badge && <span className="tinfo-badge">{badge}</span>}
      </button>
      {/* on the page itself, above the 3D table and the hand */}
      {open && createPortal(<InfoPanel view={view} notes={notes} mine={mine} tips={tips} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function InfoPanel({ view, notes, mine, tips, onClose }: Required<Omit<Props, 'mine'>> & { mine?: ReactNode; onClose: () => void }) {
  useBack(onClose);
  const recent = notes.filter((n) => n.kind !== 'error').slice(-8).reverse();
  return (
    <div className="tinfo-scrim" onClick={onClose}>
      <aside className="tinfo-panel" role="dialog" aria-modal aria-label="Table info" onClick={(e) => e.stopPropagation()}>
        <header className="tinfo-head">
          <span>
            Room <b data-no-translate>{view.code}</b>
          </span>
          <button type="button" className="tinfo-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="tinfo-body">
          <SecretBlock view={view} />
          {mine && <section className="tinfo-mine">{mine}</section>}
          <section>
            <h4>This table</h4>
            <ul>
              {tableRules(view).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </section>
          {recent.length > 0 && (
            <section>
              <h4>Just now</h4>
              <ul className="tinfo-log">
                {recent.map((n) => (
                  <li key={n.key}>{n.text}</li>
                ))}
              </ul>
            </section>
          )}
          {tips.length > 0 && (
            <section>
              <h4>Tips</h4>
              <ul className="tinfo-tips">
                {tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
