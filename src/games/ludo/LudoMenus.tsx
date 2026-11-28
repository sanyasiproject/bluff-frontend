// The table's ⋯ menu and its confirm boxes (stop, leave, remove) and watch requests, as at the card tables
import { useState } from 'react';
import { LevelBadge } from '../../components/LevelBadge';
import { Avatar } from '../../components/Avatar';
import { Backdrop, PlayersSheet } from '../../components/Overlays';
import { GameMenu } from '../../components/Table';
import { formatCoins } from '../../lib/coins';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import type { RoomView } from '../../types';
import type { Actions } from '../../useBluff';
import { stopText } from '../../lib/stopRule';

export type LudoPanel = 'menu' | 'people' | 'requests' | null;

export function LudoMenus({ view, actions, panel, setPanel, leaveWhat = 'Your gotis leave the board', kickWhat = 'Their gotis leave the board' }: { view: RoomView; actions: Actions; panel: LudoPanel; setPanel: (p: LudoPanel) => void; leaveWhat?: string; kickWhat?: string }) {
  const [sound, setSound] = useState(isSoundOn);
  const [confirm, setConfirm] = useState<'stop' | 'leave' | null>(null);
  const [kick, setKick] = useState<{ id: string; name: string } | null>(null);
  const me = view.players.find((p) => p.id === view.meId);
  const isHost = view.hostId === view.meId;
  const playing = view.phase === 'playing';
  const hostOffline = ![...view.players, ...view.watchers].find((p) => p.id === view.hostId)?.connected;
  const toggleSound = () => {
    unlockSpeech();
    setSoundOn(!sound);
    setSound(!sound);
  };
  const box = (title: string, body: string, keep: string, go: string, run: () => void, close: () => void) => (
    <Backdrop center onClose={close}>
      <div className="confirm-box">
        <h3>{title}</h3>
        <p className="muted">{body}</p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={close}>
            {keep}
          </button>
          <button
            className="btn danger"
            onClick={() => {
              close();
              run();
            }}
          >
            {go}
          </button>
        </div>
      </div>
    </Backdrop>
  );
  return (
    <>
      {panel === 'menu' && (
        <GameMenu
          view={view}
          sound={sound}
          onToggleSound={toggleSound}
          onPeople={isHost ? () => setPanel('people') : undefined}
          onStop={(isHost || hostOffline) && playing ? () => (setPanel(null), setConfirm('stop')) : undefined}
          onLeave={!me ? () => (setPanel(null), void actions.leave()) : playing ? () => (setPanel(null), setConfirm('leave')) : undefined}
          onClose={() => setPanel(null)}
        />
      )}
      {confirm === 'stop' &&
        playing &&
        box(stopText(view).title, stopText(view).body, 'Keep playing', stopText(view).action, () => void actions.toLobby(), () => setConfirm(null))}
      {confirm === 'leave' &&
        playing &&
        box(
          'Leave this game?',
          `${leaveWhat} and it counts as a loss${view.config.stake > 0 ? `; you still pay your 🪙 ${formatCoins(view.config.stake)} stake` : ''}.`,
          'Stay',
          'Leave game',
          () => void actions.leave(),
          () => setConfirm(null),
        )}
      {kick &&
        box(
          `Remove ${kick.name}?`,
          playing && view.players.some((p) => p.id === kick.id) ? `${kickWhat} and they won't pay or win coins.` : 'They leave the room.',
          'Cancel',
          'Remove',
          () => void actions.kick(kick.id),
          () => setKick(null),
        )}
      {panel === 'people' && (
        <PlayersSheet
          view={view}
          onRemove={(id, name) => {
            setPanel(null);
            setKick({ id, name });
          }}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'requests' && (
        <Backdrop onClose={() => setPanel(null)}>
          <h3>👀 Want to watch</h3>
          <p className="muted small">They joined after the game started. Let them in to watch; they play from the next game.</p>
          {view.watchRequests.length === 0 && <p className="muted small">No one is waiting.</p>}
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
          <button className="btn ghost block" onClick={() => setPanel(null)}>
            Close
          </button>
        </Backdrop>
      )}
    </>
  );
}
