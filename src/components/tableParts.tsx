// Table pieces shared by every card table and the lobby / shop (kept out of the Bluff table so it can load lazily)
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useOfflinePlay } from '../offline/context';
import { api } from '../lib/api';
import { cx, placeLabel, rankPlural } from '../lib/cards';
import { formatCoins } from '../lib/coins';
import { gameInfo, gameOpt, isPlugged, type FriendsResponse, type PublicPlayer, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { ChatBubble } from '../useBluff';
import { AuraCanvas } from './AuraCanvas';
import { Avatar } from './Avatar';
import { LevelBadge } from './LevelBadge';
import { LiveMark } from './LiveVoice';
import { MuteButton, MuteMark } from './MuteButton';
import { Backdrop } from './Overlays';
import { GiftRow, ThrowRow } from './PlayerActions';
import { SeatRank } from './Ranked';
import { VoteRemoveButton } from './RoomVote';
import { SazaTag } from './Saza';
import { StreakMark, TurnCountdown } from './TurnTimer';
import { VoiceSettings } from './VoiceSettings';

interface SeatProps {
  player: PublicPlayer;
  turn: boolean;
  passed: boolean;
  /** a watcher is looking at this player's cards */
  viewing?: boolean;
  /** what this player just did, e.g. "3 × Q" */
  action?: string | null;
  bubble?: ChatBubble | null;
  onClick?: () => void;
  /** what tapping the seat does, for screen readers */
  label?: string;
  /** where played cards fly from */
  seatRef?: (el: HTMLElement | null) => void;
  /** 2v2: which team, and whether they're my partner */
  team?: 'a' | 'b' | null;
  partner?: boolean;
  /** extra line under the card count (Crazy 7: last card, missed call) */
  tag?: ReactNode;
  /** extra class names for the seat */
  extra?: string;
  /** a ranked table: the seat shows the player's division */
  ranked?: boolean;
  /** turn timer: when this player's turn runs out (only on their turn) */
  turnEndsAt?: number | null;
  /** turn timer: the room's seconds a turn */
  turnSec?: number;
}

export function Seat({ player, turn, passed, viewing, action, bubble, onClick, label, seatRef, team, partner, tag, extra, ranked, turnEndsAt, turnSec }: SeatProps) {
  // the shop aura everyone sees round this player's seat, drawn live (AuraCanvas)
  const aura = player.shop?.aura ?? undefined;
  const badge = player.place ? placeLabel(player.place) : !player.connected ? 'offline' : player.away ? '💤' : passed ? 'pass' : null;
  const className = cx(
    'seat',
    turn && 'turn',
    viewing && 'viewing',
    !player.connected && 'offline',
    player.place && 'done',
    team && `team-${team}`,
    aura && 'aura-live',
    extra,
  );
  const body = (
    <>
      <AuraCanvas aura={aura} />
      {viewing && <span className="eye-badge">👁</span>}
      {!viewing && <StreakMark player={player} className="seat-streak" />}
      {turn && turnEndsAt && <TurnCountdown endsAt={turnEndsAt} away={player.away} sec={turnSec} className="seat-clock" />}
      {badge && <span className={cx('badge', player.place && 'gold')}>{badge}</span>}
      <Avatar name={player.name} avatar={player.avatar} bot={player.bot}>
        {player.level && <span className="seat-lv">{player.level}</span>}
        <SazaTag badge={player.saza} className="seat-saza" />
        <LiveMark player={player} />
        <MuteMark player={player} className="mute-mark seat-mute" />
        {ranked && player.rank && <SeatRank rank={player.rank} />}
      </Avatar>
      <span className="seat-name" data-no-translate>
        {partner && '🤝 '}
        {player.name}
      </span>
      <span className="seat-count">
        <i className={cx('mini-back', aura && 'shop-aura')} data-back={player.back} data-aura={aura} />
        {/* re-keyed so the number bumps when it changes */}
        <b key={player.cardCount} className="bump">
          {player.cardCount}
        </b>
      </span>
      {action && <span className="seat-action">{action}</span>}
      {tag}
      {bubble && (
        <span key={bubble.key} className="seat-bubble" data-no-translate>
          {bubble.text}
        </span>
      )}
    </>
  );
  return onClick ? (
    <button
      ref={seatRef}
      type="button"
      className={className}
      data-member={player.id}
      data-table={player.table}
      data-aura={aura}
      aria-pressed={viewing}
      aria-label={label}
      onClick={onClick}
    >
      {body}
    </button>
  ) : (
    // the seat box shows the player's own table style, so everyone sees it
    <div ref={seatRef} className={className} data-member={player.id} data-table={player.table} data-aura={aura}>
      {body}
    </div>
  );
}

/** tapping someone's seat: throw an emoji, or send coins if they're a friend */
export function SeatSheet({ player, auth, onThrow, onClose }: { player: PublicPlayer; auth: Auth; onThrow: (index: number) => void; onClose: () => void }) {
  const [friend, setFriend] = useState(false);
  // offline on one phone: no throws or muting
  const offline = useOfflinePlay();
  useEffect(() => {
    if (!auth.user || !player.username) return;
    api<FriendsResponse>('/friends', { token: auth.token })
      .then((r) => setFriend(r.friends.some((f) => f.username === player.username)))
      .catch(() => setFriend(false));
  }, [player.username]);
  return (
    <Backdrop onClose={onClose}>
      <h3>
        {player.bot && '🤖 '}
        {player.name} <LevelBadge level={player.level} />
      </h3>
      {!offline && (
        <ThrowRow
          onThrow={(i) => {
            onThrow(i);
            // close so the flight is visible
            onClose();
          }}
        />
      )}
      {friend && <GiftRow auth={auth} name={player.name} target={{ memberId: player.id }} />}
      {!player.bot && !offline && <MuteButton player={player} />}
      {!offline && <VoteRemoveButton targetId={player.id} onDone={onClose} />}
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}

/** ⋯ menu: game info, sound, and host or watcher actions, kept out of the crowded top bar */
export function GameMenu({
  view,
  sound,
  onToggleSound,
  onPeople,
  onStop,
  onEnd,
  onLeave,
  onClose,
}: {
  view: RoomView;
  sound: boolean;
  onToggleSound: () => void;
  onPeople?: () => void;
  onStop?: () => void;
  /** host, once someone has won */
  onEnd?: () => void;
  onLeave?: () => void;
  onClose: () => void;
}) {
  const winner = view.players.find((p) => p.place === 1);
  const c = view.config;
  return (
    <Backdrop onClose={onClose}>
      <h3>Room {view.code}</h3>
      <p className="game-rules-line">
        {c.game !== 'rang' && !isPlugged(c.game) && `${c.decks === 2 ? '2 decks' : '1 deck'} · `}
        {isPlugged(c.game)
          ? `${gameInfo(c.game).name}${c.game === 'ludo' ? ` · ${gameInfo(c.game).options[0]?.choices.find((o) => o.value === gameOpt(c, 'mode'))?.label ?? ''}` : ''}${c.teams ? ' · 2 vs 2' : ''}`
          : c.game === 'rang'
          ? ['Rang', `up to ${c.rangPicks} pick${c.rangPicks > 1 ? 's' : ''} a turn`, c.rangStack && '+2/+4 stack', c.rangChallenge && 'Challenge +4', c.rangSwap && '7-0 swap'].filter(Boolean).join(' · ')
          : c.game === 'crazy7'
          ? `Crazy 7 · ${c.handSize} cards each · up to ${c.maxPicks} pick${c.maxPicks > 1 ? 's' : ''}${c.stack7 ? ' · 7s stack' : ''}`
          : `${c.bluffRule === 'one' ? 'Pick one card' : 'Show all cards'}${view.kismat ? ` · 🍀 ${rankPlural(view.kismat)} wild` : c.kismat ? ' · 🍀 Kismat card' : ''}${c.seedhi ? ' · 🪜 Seedhi' : ''}`}{' '}
        ·{' '}
        {c.stake > 0 ? `🪙 ${formatCoins(c.stake)} each` : 'Free game'}
        {view.watchers.length > 0 && ` · 👀 ${view.watchers.length} watching`}
      </p>
      <div className="menu-buttons">
        <button className="btn block" onClick={onToggleSound}>
          {sound ? '🔊 Sound on · tap to mute' : '🔇 Sound off · tap to turn on'}
        </button>
        <VoiceSettings compact />
        {onPeople && (
          <button className="btn block" onClick={onPeople}>
            👥 People in this room
          </button>
        )}
        {onEnd && winner && (
          <button className="btn block" onClick={onEnd}>
            🏁 End game · {view.teams ? `${winner.name}'s team` : winner.name} wins
          </button>
        )}
        {onStop && (
          <button className="btn block danger-text" onClick={onStop}>
            ⏹ Stop game for everyone
          </button>
        )}
        {onLeave && (
          <button className="btn block ghost danger-text" onClick={onLeave}>
            🚪 {view.players.some((p) => p.id === view.meId) && view.phase === 'playing' ? 'Leave game' : 'Leave room'}
          </button>
        )}
      </div>
    </Backdrop>
  );
}

/** calls fn when value changes, never on the first render */
export function useOnChange<T>(value: T, fn: (next: T) => void) {
  const prev = useRef(value);
  useEffect(() => {
    if (Object.is(prev.current, value)) return;
    prev.current = value;
    fn(value);
  });
}
