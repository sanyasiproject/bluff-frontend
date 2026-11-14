import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useBack } from '../lib/back';
import { avatarColor, claimText, cx, placeLabel, rankPlural } from '../lib/cards';
import { compactCoins, formatCoins, signedCoins } from '../lib/coins';
import { winnerMoment } from '../lib/celebrate';
import { confettiAt } from '../lib/motion';
import { nextGameReward, titleOf } from '../lib/progress';
import { LevelBadge } from './LevelBadge';
import {
  BET_STEPS,
  MIN_REWARD_GAME_SEC,
  RANKS,
  type Card,
  type CoinResult,
  type PublicPlayer,
  type Rank,
  type RevealView,
  type RoomView,
} from '../types';
import { PlayingCard } from './PlayingCard';
import { Rolling } from './Rolling';

export function Backdrop({ center, onClose, children }: { center?: boolean; onClose?: () => void; children: ReactNode }) {
  // the phone's back button closes it too; screens without onClose (game over) stay put
  useBack(onClose);
  return (
    <div className={cx('backdrop', center && 'center')} onClick={onClose}>
      <div className={center ? 'modal' : 'sheet'} role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

interface RankSheetProps {
  hand: Card[];
  selected: string[];
  busy: boolean;
  onPick: (rank: Rank) => void;
  onClose: () => void;
}

export function RankSheet({ hand, selected, busy, onPick, onClose }: RankSheetProps) {
  const ranks = new Set(hand.filter((c) => selected.includes(c.id)).map((c) => c.rank));
  const honest = ranks.size === 1 ? [...ranks][0] : null;
  return (
    <Backdrop onClose={onClose}>
      <h3>Call a rank for {selected.length} card{selected.length > 1 ? 's' : ''}</h3>
      <p className="muted small">
        {honest ? `Your cards really are ${rankPlural(honest)}, or bluff with any other rank.` : 'Pick any rank: truth or bluff.'}
      </p>
      <div className="rank-grid">
        {RANKS.map((r) => (
          <button key={r} className={cx('rank-btn', r === honest && 'honest')} disabled={busy} onClick={() => onPick(r)}>
            {r}
          </button>
        ))}
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Cancel
      </button>
    </Backdrop>
  );
}

interface PickSheetProps {
  count: number;
  who: string;
  claim: string;
  onPick: (index: number) => void;
  onClose: () => void;
}

export function PickSheet({ count, who, claim, onPick, onClose }: PickSheetProps) {
  return (
    <Backdrop onClose={onClose}>
      <h3>Pick one card to turn over</h3>
      <p className="muted small">
        {who} said {claim}. If your card doesn't match, they pick up the pile. If it matches, you do.
      </p>
      <div className="pick-row">
        {Array.from({ length: count }, (_, i) => (
          <PlayingCard key={i} faceDown size={count > 8 ? 'md' : 'lg'} className="pick-card" onClick={() => onPick(i)} />
        ))}
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Cancel
      </button>
    </Backdrop>
  );
}

interface PeekSheetProps {
  count: number;
  /** cards already peeked at in this play */
  peeked: { index: number; card: Card }[];
  left: number;
  onPeek: (index: number) => Promise<void>;
  onClose: () => void;
}

/** tap a face-down card of the last play to see it; only you see it */
export function PeekSheet({ count, peeked, left, onPeek, onClose }: PeekSheetProps) {
  const [busy, setBusy] = useState(false);
  const seen = new Map(peeked.map((p) => [p.index, p.card]));
  return (
    <Backdrop onClose={onClose}>
      <h3>🔍 Peek at a card</h3>
      <p className="muted small">
        Tap a card to see it secretly. Others only see that you peeked. {left} peek{left === 1 ? '' : 's'} left this game.
      </p>
      <div className="pick-row">
        {Array.from({ length: count }, (_, i) => {
          const card = seen.get(i);
          return card ? (
            <PlayingCard key={i} card={card} size={count > 8 ? 'md' : 'lg'} className="flip" />
          ) : (
            <PlayingCard
              key={i}
              faceDown
              size={count > 8 ? 'md' : 'lg'}
              className={cx('pick-card', (left === 0 || busy) && 'disabled')}
              onClick={
                left > 0 && !busy
                  ? async () => {
                      setBusy(true);
                      await onPeek(i);
                      setBusy(false);
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Done
      </button>
    </Backdrop>
  );
}

/** pick how many coins to bet on the next Bluff call, before tapping Bluff */
export function BetSheet({ limit, value, onPick, onClose }: { limit: number; value: number; onPick: (n: number) => void; onClose: () => void }) {
  const steps = BET_STEPS.filter((n) => n <= limit);
  return (
    <Backdrop onClose={onClose}>
      <h3>🎲 Bet on your Bluff call</h3>
      <p className="bet-note">
        Pick your bet <b>first</b>, then tap <b>Bluff!</b> Right call: you win it from them. Wrong call: you pay it. Coins move when the
        game ends.
      </p>
      <div className="stake-grid">
        <button className={cx('stake-chip', value === 0 && 'on')} onClick={() => onPick(0)}>
          No bet
        </button>
        {steps.map((n) => (
          <button key={n} className={cx('stake-chip', value === n && 'on')} onClick={() => onPick(n)}>
            {compactCoins(n)}
          </button>
        ))}
      </div>
      <p className="muted small">You can bet up to {formatCoins(limit)} right now (never more than the stake).</p>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}

interface RevealProps {
  reveal: RevealView;
  name: (id: string) => string;
  onClose: () => void;
}

export function RevealOverlay({ reveal, name, onClose }: RevealProps) {
  return (
    <Backdrop center onClose={onClose}>
      <div className={cx('reveal', reveal.bluff ? 'caught' : 'truth')} onClick={onClose}>
        <p className="muted small">
          {name(reveal.callerId)} called bluff on {name(reveal.playerId) === 'You' ? 'you' : name(reveal.playerId)}
        </p>
        <h3 className="reveal-title">{reveal.bluff ? 'Caught bluffing!' : 'It was the truth!'}</h3>
        <p className="small">Claimed {claimText(reveal.cards.length, reveal.rank)}</p>
        <div className="reveal-cards">
          {reveal.cards.map((c, i) => (
            <div
              key={i}
              className={cx('reveal-slot', c && (c.rank === reveal.rank ? 'match' : 'miss'), reveal.pickedIndex === i && 'picked')}
            >
              <PlayingCard
                card={c}
                size={reveal.cards.length > 8 ? 'sm' : 'md'}
                className={c ? 'flip' : undefined}
                style={{ animationDelay: `${120 + Math.min(i, 10) * 110}ms` }}
              />
              {c && <span className="mark">{c.rank === reveal.rank ? '✓' : '✗'}</span>}
            </div>
          ))}
        </div>
        <p className="reveal-result">
          <b>{name(reveal.loserId)}</b> {name(reveal.loserId) === 'You' ? 'pick' : 'picks'} up {reveal.pileCount} cards
        </p>
        {reveal.bet > 0 && (
          <p className="reveal-bet">
            🎲 {name(reveal.loserId)} {name(reveal.loserId) === 'You' ? 'lose' : 'loses'} the 🪙 {formatCoins(reveal.bet)} bet to{' '}
            {name(reveal.loserId === reveal.callerId ? reveal.playerId : reveal.callerId)}
          </p>
        )}
      </div>
    </Backdrop>
  );
}

interface GameOverProps {
  view: RoomView;
  onLobby: () => void;
  /** host only: deal again with the same players and settings */
  onRematch?: () => Promise<unknown>;
  /** my level when the game started, to show a level up */
  startLevel?: number | null;
}

export function GameOver({ view, onLobby, onRematch, startLevel }: GameOverProps) {
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // winners (and watchers) get confetti; losers don't need it
  useEffect(() => {
    if (view.stopped || view.winnerIds.length === 0) return;
    if (view.winnerIds.includes(view.meId)) confettiAt(box.current, { count: 80, spread: 1.5 });
    else if (!view.players.some((p) => p.id === view.meId)) confettiAt(box.current, { count: 36, spread: 1 });
    // the trophy and fireworks for everyone, a crown on the winner's seat, 🙈 over the losers
    winnerMoment(view.winnerIds, [...view.loserIds.filter((id) => !view.winnerIds.includes(id))]);
  }, []);
  // Crazy 7: everyone but the winner, fewest cards left first
  const ranked = [...view.players].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || (view.crazy7 ? a.cardCount - b.cardCount : 0));
  const lost = (id: string) => view.loserIds.includes(id);
  const won = (id: string) => view.winnerIds.includes(id);
  // teams, or the host ending early: only the winners win and everyone else lost
  // Crazy 7 too: the first player out wins and everyone else loses
  const winnersOnly = view.endedEarly || !!view.teams || view.config.game === 'crazy7';
  const medal = (p: PublicPlayer) =>
    won(p.id) ? '🥇' : p.place && !winnersOnly ? (['🥇', '🥈', '🥉'][p.place - 1] ?? placeLabel(p.place)) : '🙈';
  const label = (p: PublicPlayer) =>
    won(p.id)
      ? `${p.place ? `${placeLabel(p.place)} · ` : ''}Winner`
      : lost(p.id)
        ? winnersOnly
          ? view.crazy7
            ? `Lost · ${p.cardCount} left`
            : 'Lost'
          : 'Loser'
        : p.place
          ? placeLabel(p.place)
          : '';
  const winningTeam = view.teams && view.winnerIds.length > 0 ? (view.teams[0].includes(view.winnerIds[0]) ? '🔵' : '🟠') : null;
  // players who used Leave game are still part of this game's result
  const nameOf = (id: string) =>
    id === view.meId ? 'You' : ([...view.players, ...view.leftPlayers].find((p) => p.id === id)?.name ?? 'Someone');
  return (
    <Backdrop center>
      <div className="reveal gameover" ref={box}>
        <h3 className="reveal-title">{view.stopped ? 'Game stopped' : view.endedEarly ? 'Game ended' : 'Game over'}</h3>
        {winningTeam && (
          <p className="team-win">
            {winningTeam} Team {view.winnerIds.map(nameOf).join(' & ')} {view.winnerIds.includes(view.meId) ? 'win! 🎉' : 'win'}
          </p>
        )}
        {view.endedEarly && (
          <p className="muted small">
            The host ended it: {view.teams ? "1st place's team wins" : '1st place wins'}, everyone else loses
          </p>
        )}
        <ol className="results">
          {ranked.map((p, i) => (
            <li key={p.id} className={cx(lost(p.id) && 'loser', won(p.id) && 'winner')} style={{ '--i': i } as CSSProperties}>
              <span className="medal">{medal(p)}</span>
              <span className="grow">
                {p.name}
                {p.id === view.meId && <span className="muted"> (you)</span>} <LevelBadge level={p.level} />
              </span>
              <span className="muted">{label(p)}</span>
            </li>
          ))}
          {view.leftPlayers.map((p, i) => (
            <li key={p.id} className="loser" style={{ '--i': ranked.length + i } as CSSProperties}>
              <span className="medal">🚪</span>
              <span className="grow">
                {p.name} <LevelBadge level={p.level} />
              </span>
              <span className="muted">Left · Lost</span>
            </li>
          ))}
        </ol>
        {view.awards.length > 0 && (
          <div className="awards">
            <p className="label">Awards</p>
            {view.awards.map((a) => (
              <div key={a.title} className="award">
                <span className="award-emoji">{a.emoji}</span>
                <div className="grow">
                  <b>{a.title}</b>
                  <p className="muted small">
                    {a.playerIds.map(nameOf).join(' & ')} · {a.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <CoinSummary view={view} nameOf={nameOf} startLevel={startLevel ?? null} />
        {onRematch ? (
          <button
            className="btn primary block shine"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onRematch();
              setBusy(false);
            }}
          >
            🔁 Play again{view.config.stake > 0 ? ` · 🪙 ${formatCoins(view.config.stake)} each` : ''}
          </button>
        ) : (
          <p className="muted small">Waiting for the host to play again…</p>
        )}
        <button className="btn ghost block" onClick={onLobby}>
          Back to lobby
        </button>
      </div>
    </Backdrop>
  );
}

/** XP this game gave me, and a level up if it happened */
function XpLine({ result, startLevel }: { result: CoinResult; startLevel: number | null }) {
  const level = result.level;
  const levelUp = level !== null && startLevel !== null && level > startLevel;
  const title = level !== null ? titleOf(level) : null;
  return (
    <p className={cx('daily-line xp-line', levelUp && 'level-up')}>
      ⭐ +<Rolling value={result.xp} /> XP
      {levelUp && title && (
        <>
          {' '}
          · 🎉 Level up! <b>Lv {level}</b> {title.emoji} {title.title}
        </>
      )}
    </p>
  );
}

/** your games today and the next daily reward, or why this game didn't count */
function DailyProgress({ result }: { result: CoinResult }) {
  const games = result.gamesToday ?? 0;
  if (!result.counted) {
    return <p className="daily-line">⏱ Under {MIN_REWARD_GAME_SEC / 60} minute: this game doesn't count for daily rewards</p>;
  }
  const next = nextGameReward(games);
  return (
    <p className="daily-line">
      🎯 {games} game{games === 1 ? '' : 's'} today ·{' '}
      {next ? (
        <>
          {next.left} more for <b className="gold-text">+{formatCoins(next.coins)}</b>
        </>
      ) : (
        'all daily rewards collected'
      )}
    </p>
  );
}

/** who won or paid how many coins, daily game rewards, and your next daily target */
function CoinSummary({ view, nameOf, startLevel }: { view: RoomView; nameOf: (id: string) => string; startLevel: number | null }) {
  const stake = view.config.stake;
  const everyone = [...view.players, ...view.leftPlayers];
  if (!everyone.some((p) => p.registered)) return null;
  if (view.stopped) {
    return stake > 0 ? <p className="muted small">Stopped early · no coins moved</p> : null;
  }
  if (!view.coinResults) return <p className="muted small">Adding up coins…</p>;

  const rows = view.coinResults.filter((r) => everyone.some((p) => p.id === r.playerId && p.registered));
  const mine = view.coinResults.find((r) => r.playerId === view.meId && r.gamesToday !== null);
  const showRows = stake > 0 || rows.some((r) => r.bonus > 0 || r.bets !== 0);
  if (!showRows && !mine) return null;
  return (
    <div className="coin-results">
      <p className="label">Rewards</p>
      {stake > 0 && (
        <p className="muted small">
          Pot 🪙 {formatCoins(stake * everyone.length)} {view.teams ? 'split by the winning team' : 'goes to the winner'}
          {view.players.some((p) => p.bot) && ' · bots win nothing, coins lost to them are gone'}
        </p>
      )}
      {showRows &&
        rows.map((r) => (
          <div key={r.playerId} className="coin-row">
            <span className="grow">{nameOf(r.playerId)}</span>
            {stake > 0 && (
              <span className={cx('coin-change', r.change >= 0 ? 'up' : 'down')}>
                🪙 <Rolling value={r.change} format={signedCoins} />
              </span>
            )}
            {r.bets !== 0 && (
              <span className={cx('coin-change', r.bets > 0 ? 'up' : 'down')}>
                🎲 <Rolling value={r.bets} format={signedCoins} />
              </span>
            )}
            {r.bonus > 0 && <span className="bonus-chip">🎯 +{formatCoins(r.bonus)}</span>}
          </div>
        ))}
      {rows.some((r) => r.bonus > 0) && <p className="muted small">🎯 Daily games reward</p>}
      {mine && mine.xp > 0 && <XpLine result={mine} startLevel={startLevel} />}
      {mine && <DailyProgress result={mine} />}
    </div>
  );
}

/** host's list of everyone in the room with a Remove button */
export function PlayersSheet({
  view,
  onRemove,
  onClose,
}: {
  view: RoomView;
  onRemove: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const people = [
    ...view.players.map((p) => ({ id: p.id, name: p.name, level: p.level, watching: false, bot: p.bot })),
    ...view.watchers.map((w) => ({ id: w.id, name: w.name, level: w.level, watching: true, bot: false })),
  ].filter((p) => p.id !== view.meId);
  return (
    <Backdrop onClose={onClose}>
      <h3>People in this room</h3>
      {people.length === 0 && <p className="muted small">Nobody else is here.</p>}
      <ul className="player-list">
        {people.map((p) => (
          <li key={p.id} className="player-row">
            <span className={cx('avatar sm', p.bot && 'bot-avatar')} style={p.bot ? undefined : { background: avatarColor(p.name) }}>
              {p.bot ? '🤖' : p.name[0]?.toUpperCase()}
            </span>
            <span className="grow">
              {p.name}
              <LevelBadge level={p.level} />
              {p.bot && <span className="muted"> · bot</span>}
              {p.watching && <span className="muted"> · watching</span>}
            </span>
            <button className="btn small ghost danger-text" onClick={() => onRemove(p.id, p.name)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
