import { LockChip } from './RoomVote';
import { PresetsButton } from './RoomPresets';
import { useState, type ReactNode, useEffect } from 'react';
import { GameArt } from '../art/GameArt';
import { Icon } from '../art/icons';
import { cx } from '../lib/cards';
import { compactCoins } from '../lib/coins';
import { inviteLink, inviteMessage, inviteText } from '../lib/invite';
import { APP_NAME, gameInfo, type PublicPlayer, type RoomView } from '../types';
import type { Auth } from '../useAuth';
import type { Actions } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { Avatar } from './Avatar';
import { LevelBadge } from './LevelBadge';
import { LiveVoiceButtons, LiveVoiceNotice } from './LiveVoice';
import { SettingsDrawer, summaryBits, type LobbyTab } from './LobbySettings';
import { Backdrop } from './Overlays';
import { QuickChat } from './QuickChat';
import { Seat } from './Table';
import { OnTable, seatSpots, TableScene } from './TableScene';

interface Props {
  view: RoomView;
  actions: Actions;
  auth: Auth;
  isHost: boolean;
  tabs: [LobbyTab, string][];
  tab: LobbyTab;
  onTab: (t: LobbyTab) => void;
  /** casual or ranked strip, on top of the drawer's Game tab */
  banner: ReactNode;
  /** the open tab's settings blocks */
  settings: ReactNode;
  seatCap: number;
  teamGame: boolean;
  ranked: boolean;
  mustLogIn: boolean;
  coinsOn: boolean;
  watching: boolean;
  /** why a watcher has no seat yet, if it isn't their choice */
  watchNote: string | null;
  seatsFull: boolean;
  canAddBot: boolean;
  startBlock: string | null;
  leaveButton: ReactNode;
  modeRow: ReactNode;
  mainButton: ReactNode;
  /** the share buttons, or null when the room is full */
  invite: ReactNode;
  /** the Friends sheet is open (from Invite): the invite sheet closes so the two never stack */
  friendsOpen?: boolean;
  onPlayer: (id: string) => void;
  onRemove: (id: string, name: string) => void;
  onJoinFriend: (userId: string, watch: boolean) => Promise<boolean>;
  /** sheets and popups shared with the portrait lobby */
  children: ReactNode;
}

type Sheet = { kind: 'invite' } | { kind: 'seat'; slot: number | null } | { kind: 'watchers' };

/** the game chip in the top bar, from the catalog: a small drawing and the name */
const gameChip = (v: RoomView) => (
  <>
    <span className="room-chip-art" aria-hidden>
      <GameArt kind={v.config.game} />
    </span>
    {gameInfo(v.config.game).name}
  </>
);

/** landscape lobby: the room is the game's 3D table, players seated round it, settings in a side drawer */
export function LobbyRoom(props: Props) {
  const { view, actions, auth, isHost, teamGame, ranked, coinsOn, mustLogIn, onPlayer, onRemove } = props;
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  useEffect(() => {
    if (props.friendsOpen) setSheet(null);
  }, [props.friendsOpen]);
  const close = () => setSheet(null);
  const stake = view.config.stake;
  const slots = view.slots ?? [null, null, null, null];
  const me = view.players.find((p) => p.id === view.meId);
  const meAny = me ?? view.watchers.find((w) => w.id === view.meId);
  const byId = (id: string | null) => (id ? view.players.find((p) => p.id === id) : undefined);
  const teamOf = (id: string): 'a' | 'b' | null => {
    if (!teamGame) return null;
    const s = slots.indexOf(id);
    return s < 0 ? null : s % 2 === 0 ? 'a' : 'b';
  };
  const asked = (id: string) => view.swapAsks.some((a) => a.fromId === view.meId && a.toId === id);

  // the code chip shares the invite (or copies it where there's no share sheet)
  const shareCode = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: APP_NAME, text: inviteText(view.code, view.pin), url: inviteLink(view.code, view.pin) });
      } catch {
        // share sheet closed
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteMessage(view.code, view.pin));
      actions.toast('Invite copied, paste it anywhere');
    } catch {
      window.prompt('Copy this invite', inviteMessage(view.code, view.pin));
    }
  };

  // ready, coins and the like, on one small line under the name
  const seatTag = (p: PublicPlayer) => {
    const lowCoins = stake > 0 && p.registered && (p.coins ?? 0) < stake;
    const needLogin = mustLogIn && !p.registered && !p.bot;
    return (
      <span className="room-seat-tags">
        {p.id !== view.hostId && !p.bot && (
          <span className={cx('room-ready', p.ready ? 'yes' : 'no')} aria-label={p.ready ? 'Ready' : 'Not ready'}>
            {p.ready ? '✅' : '⏳'}
          </span>
        )}
        {coinsOn && !p.bot && (stake > 0 || needLogin) && (
          <span className={cx('room-coins', (needLogin || lowCoins) && 'warn')}>
            {p.registered ? `🪙 ${compactCoins(p.coins ?? 0)}` : 'guest'}
          </span>
        )}
      </span>
    );
  };

  // one seated player: the game's seat (avatar and name plate), crown for the host, ✕ for bots, Swap in 2v2
  const seatOf = (p: PublicPlayer) => {
    const mine = p.id === view.meId;
    const iPlay = !!me && teamGame;
    return (
      <div className={cx('room-seat-wrap', mine && 'mine')}>
        {p.id === view.hostId && (
          <span className="room-crown" aria-label="Host">
            👑
          </span>
        )}
        <Seat
          player={p}
          turn={false}
          passed={false}
          onClick={p.bot ? undefined : () => onPlayer(p.id)}
          label={`${p.name}'s profile`}
          team={teamOf(p.id)}
          partner={teamGame && !!me && !mine && teamOf(p.id) === teamOf(view.meId)}
          ranked={ranked}
          extra="room-seat"
          tag={seatTag(p)}
        />
        {p.bot && isHost && (
          <button type="button" className="room-x" aria-label={`Remove ${p.name}`} onClick={() => onRemove(p.id, p.name)}>
            ✕
          </button>
        )}
        {iPlay && !mine && (
          <button
            type="button"
            className="room-swap"
            disabled={asked(p.id)}
            aria-label={asked(p.id) ? `Asked ${p.name} to swap` : `Swap places with ${p.name}`}
            title={asked(p.id) ? 'Asked…' : '🔄 Swap'}
            onClick={() => void actions.askSwap(p.id)}
          >
            {asked(p.id) ? '⏳' : '🔄'}
          </button>
        )}
      </div>
    );
  };

  // a free seat glowing on the rail; tapping it offers a bot or an invite (2v2: also sit here)
  const openSeat = (slot: number | null) => {
    const team = slot === null ? null : slot % 2 === 0 ? 'a' : 'b';
    const go = () => {
      if (!isHost && slot === null && props.invite) setSheet({ kind: 'invite' });
      else setSheet({ kind: 'seat', slot });
    };
    return (
      <button type="button" className={cx('room-open', team && `team-${team}`)} onClick={go}>
        <span className="open-ring">+</span>
        <span className="room-open-label">Open seat</span>
      </button>
    );
  };

  // far rail and near spot: 2v2 puts partners opposite (keeps the server's slots); otherwise everyone else, then the free seats
  type Spot = { player?: PublicPlayer; slot: number | null };
  let far: Spot[];
  let near: Spot | null = null;
  if (teamGame) {
    const mySlot = slots.indexOf(view.meId);
    const base = mySlot >= 0 ? mySlot : 0;
    far = [1, 2, 3].map((k) => {
      const s = (base + k) % 4;
      return { player: byId(slots[s]), slot: s };
    });
    near = { player: byId(slots[base]), slot: base };
    // anyone seated outside the four team slots (a 5th player) still shows, so the host can see why Start waits and remove them
    const extra = view.players.filter((p) => !slots.includes(p.id) && p.id !== view.meId);
    far = [...far, ...extra.map((p) => ({ player: p, slot: null }))];
  } else {
    const others = view.players.filter((p) => p.id !== view.meId);
    const free = Math.max(0, props.seatCap - view.players.length);
    far = [...others.map((p) => ({ player: p, slot: null })), ...Array.from({ length: free }, () => ({ slot: null }))];
    if (me) near = { player: me, slot: null };
  }
  const spots = seatSpots(far.length);
  const bits = summaryBits(view);
  const watchCount = view.watchers.length;
  const requests = isHost ? view.watchRequests.length : 0;
  const seatSheet = sheet?.kind === 'seat' ? sheet : null;
  const canSit = !!seatSheet && seatSheet.slot !== null && !!me && !slots[seatSheet.slot];

  return (
    <main className={cx('screen lobby lobby-room nt-scope', ranked && 'ranked-room', teamGame && 'teams-room')}>
      <TableScene ranked={ranked}>
        {far.map((s, i) => (
          <OnTable key={s.player?.id ?? `open-${s.slot ?? i}`} x={spots[i].seat.x} y={spots[i].seat.y} stand className="seat-stand room-spot">
            {s.player ? seatOf(s.player) : openSeat(s.slot)}
          </OnTable>
        ))}
        {/* the table's settings as a sign on the felt; the host also gets the Settings button */}
        <OnTable x={50} y={54} stand className="room-sign-spot">
          <div className="room-sign-stack">
            <div className="room-sign-row">
              <button type="button" className="room-sign" aria-label="Table settings" onClick={() => setDrawer(true)}>
                {bits.map((b, i) => (
                  <span key={b}>
                    {i > 0 && <i aria-hidden>·</i>}
                    {b}
                  </span>
                ))}
                {!isHost && (
                  <i className="room-sign-more" aria-hidden>
                    ›
                  </i>
                )}
              </button>
              {isHost && (
                <button type="button" className="room-gear" onClick={() => setDrawer(true)}>
                  <Icon name="settings" size={16} /> Settings
                </button>
              )}
            </div>
            {isHost && <PresetsButton view={view} actions={actions} auth={auth} />}
            {isHost && teamGame && slots.every(Boolean) && (
              <button type="button" className="room-gear ghost" onClick={() => void actions.shuffleTeams()}>
                🔀 Shuffle teams
              </button>
            )}
          </div>
        </OnTable>
      </TableScene>

      <header className="room-top">
        <button type="button" className="room-code-chip" aria-label={`Room code ${view.code}. Tap to share the invite`} onClick={() => void shareCode()}>
          <small>Room</small>
          <b data-no-translate>{view.code}</b>
        </button>
        <span className="room-chip game">{gameChip(view)}</span>
        <LockChip view={view} actions={actions} isHost={isHost} />
        {props.banner && (
          <button type="button" className={cx('room-chip mode', ranked && 'ranked')} onClick={() => setDrawer(true)}>
            {ranked ? '🏅 Ranked' : 'Casual'}
          </button>
        )}
        <span className="grow" />
        <div className="room-top-right">
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          {(watchCount > 0 || requests > 0) && (
            <button type="button" className="icon-btn room-watch-btn" aria-label={`${watchCount} watching${requests ? `, ${requests} want to watch` : ''}`} onClick={() => setSheet({ kind: 'watchers' })}>
              {requests > 0 && <span key={requests} className="req-ring" aria-hidden />}
              👀<b>{watchCount}</b>
              {requests > 0 && <span className="req-dot">{requests}</span>}
            </button>
          )}
          <QuickChat onSend={actions.chat} view={view} />
          <AccountCorner auth={auth} roomCode={view.code} onInvite={actions.invite} onJoin={props.onJoinFriend} showOnline={false} />
        </div>
      </header>
      <LiveVoiceNotice />

      <footer className="room-dock">
        {/* me, at the near side of the table */}
        <div className="room-near seat-stand">
          {near ? (
            near.player ? seatOf(near.player) : openSeat(near.slot)
          ) : (
            meAny && (
              <button type="button" className="room-watcher" onClick={() => onPlayer(meAny.id)}>
                <Avatar name={meAny.name} avatar={meAny.avatar} member={meAny.id} />
                <span className="seat-name" data-no-translate>
                  {meAny.name}
                </span>
                <span className="room-watch-tag">👀 Watching</span>
              </button>
            )
          )}
        </div>
        <div className="room-dock-left">
          {props.leaveButton}
          {props.invite && (
            <button type="button" className="btn ghost room-invite" onClick={() => setSheet({ kind: 'invite' })}>
              📨 Invite
            </button>
          )}
        </div>
        <div className="room-dock-mid">{props.modeRow}</div>
        {/* why Start is locked (or why I watch), a pill floating above the Start button */}
        {isHost && props.startBlock ? (
          <p className="room-reason">{props.startBlock}</p>
        ) : (
          props.watchNote && <p className="room-reason">{props.watchNote}</p>
        )}
        <div className="room-dock-right">{props.mainButton}</div>
      </footer>

      {drawer && (
        <SettingsDrawer isHost={isHost} tabs={props.tabs} tab={props.tab} onTab={props.onTab} banner={props.banner} onClose={() => setDrawer(false)}>
          {props.settings}
        </SettingsDrawer>
      )}

      {sheet?.kind === 'invite' && props.invite && (
        <Backdrop onClose={close} panel="room-sheet">
          <h3>📨 Invite to room <span className="room-sheet-code" data-no-translate>{view.code}</span></h3>
          <p className="muted small">The link drops them straight into this room.</p>
          {props.invite}
        </Backdrop>
      )}

      {seatSheet && (
        <Backdrop onClose={close} panel="room-sheet">
          <h3>🪑 Open seat</h3>
          <div className="room-sheet-actions">
            {canSit && (
              <button className="btn block primary" onClick={() => { close(); void actions.moveToSlot(seatSheet.slot!); }}>
                🪑 Sit here
              </button>
            )}
            {props.canAddBot && (
              <button className="btn block" disabled={ranked} onClick={() => { close(); void actions.addBot(); }}>
                🤖 Add a bot
              </button>
            )}
            {props.canAddBot && ranked && <p className="muted small">🏅 Ranked tables are for people only</p>}
            {props.invite && (
              <button className="btn block" onClick={() => setSheet({ kind: 'invite' })}>
                📨 Invite
              </button>
            )}
            {!canSit && !props.canAddBot && !props.invite && <p className="muted small">The room is full.</p>}
          </div>
        </Backdrop>
      )}

      {sheet?.kind === 'watchers' && (
        <Backdrop onClose={close} panel="room-sheet">
          {requests > 0 && (
            <>
              <h3>👀 Want to watch</h3>
              <ul className="player-list">
                {view.watchRequests.map((r) => (
                  <li key={r.id} className="player-row">
                    <Avatar name={r.name} size="sm" />
                    <span className="grow">
                      {r.name} {r.registered ? <LevelBadge level={r.level} /> : <span className="muted small">guest</span>}
                    </span>
                    <button className="btn small ghost" onClick={() => void actions.admit(r.id, false)}>
                      No
                    </button>
                    <button className="btn small primary" onClick={() => void actions.admit(r.id, true)}>
                      Let in
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3>
            Watching <span className="muted">{watchCount}</span>
          </h3>
          {props.watching && props.watchNote && <p className="muted small">{props.watchNote}</p>}
          <ul className="player-list">
            {view.watchers.map((w) => (
              <li key={w.id} className={cx('player-row', !w.connected && 'offline')}>
                <button type="button" className="row-open" aria-label={`${w.name}'s profile`} onClick={() => { close(); onPlayer(w.id); }}>
                  <Avatar name={w.name} avatar={w.avatar} size="sm" member={w.id} />
                  <span className="grow">
                    {w.name}
                    {w.id === view.meId && <span className="muted"> (you)</span>} <LevelBadge level={w.level} />
                  </span>
                </button>
                {isHost && w.id !== view.meId && (
                  <button className="remove-btn" aria-label={`Remove ${w.name}`} onClick={() => { close(); onRemove(w.id, w.name); }}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Backdrop>
      )}

      {props.children}
    </main>
  );
}
