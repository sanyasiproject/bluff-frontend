// What every party table shares round the board: the top bar (info, status, voice, quick chat, menu), banners, menus, game over flow
import type { ReactNode } from 'react';
import { LevelUp } from '../../components/LevelUp';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { GameOver } from '../../components/Overlays';
import { QuickChat } from '../../components/QuickChat';
import { SeatSheet } from '../../components/Table';
import { TableInfo } from '../../components/TableInfo';
import { cx } from '../../lib/cards';
import type { RoomView } from '../../types';
import type { Auth } from '../../useAuth';
import type { Actions, Note } from '../../useBluff';
import { LudoMenus } from '../ludo/LudoMenus';
import type { PartyBase } from './base';
import { colorName, YouAreBanner } from './ColorMark';

interface Props {
  view: RoomView;
  actions: Actions;
  auth: Auth;
  notes: Note[];
  base: PartyBase;
  status: string;
  /** status is a prompt for me */
  mine: boolean;
  infoMine: ReactNode;
  tips: string[];
  /** the leave confirm's first words, e.g. "Your boxes stay on the board" */
  leaveWhat: string;
  kickWhat: string;
  watchNote: string;
  /** the game's podium, shown before the coins screen */
  over: ReactNode;
  /** my piece for the "You are Red" banner (a colour dot by default) */
  myIcon?: ReactNode;
  /** the "You are …" banner's colour and name (default: my seat colour) */
  youAre?: { color: string; name: string };
}

export function PartyChrome({ view, actions, auth, notes, base, status, mine, infoMine, tips, leaveWhat, kickWhat, watchNote, over, myIcon, youAre }: Props) {
  const { banner, panel, setPanel, target, setTarget, overSeen, levelUp, setLevelUp, startLevel, isHost, me } = base;
  const targetPlayer = target ? view.players.find((p) => p.id === target) : undefined;
  return (
    <>
      {banner && (
        <div key={banner.key} className={cx('pt-banner', `tone-${banner.tone}`)} role="status">
          <b>{banner.text}</b>
          {banner.sub && <small>{banner.sub}</small>}
        </div>
      )}
      <header className="topbar">
        <TableInfo view={view} notes={notes} mine={infoMine} tips={tips} />
        {status && (
          <span key={status.replace(/\d+/g, '')} className={cx('lu-status', mine && 'mine')} role="status">
            {status}
          </span>
        )}
        <span className="grow" />
        <div className="topbar-actions">
          {isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => setPanel('requests')}>
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Game menu" onClick={() => setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />
      {me && <YouAreBanner on={view.phase === 'playing'} color={youAre?.color ?? base.colorOf(view.meId)} name={youAre?.name ?? colorName(base.colorOf(view.meId))} icon={myIcon} />}
      {!me && <p className="lu-watch-note">{watchNote}</p>}

      {view.phase === 'over' && !overSeen && over}
      {view.phase === 'over' && overSeen && <GameOver view={view} onLobby={actions.toLobby} onRematch={isHost ? actions.rematch : undefined} startLevel={startLevel.current} />}
      {levelUp !== null && overSeen && <LevelUp level={levelUp} from={startLevel.current} onClose={() => setLevelUp(null)} />}
      {targetPlayer && <SeatSheet player={targetPlayer} auth={auth} onThrow={(i) => void actions.throwAt(targetPlayer.id, i)} onClose={() => setTarget(null)} />}
      <LudoMenus view={view} actions={actions} panel={panel} setPanel={setPanel} leaveWhat={leaveWhat} kickWhat={kickWhat} />
    </>
  );
}
