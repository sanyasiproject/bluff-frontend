// The Five in a Row table: a wooden board filling the height, player cards on the rails, ghost stone then place
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-gomoku.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTurnEndsAt } from '../../components/TurnTimer';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import { loadPref, savePref } from '../../lib/storage';
import { gomokuCentre, PARTY_COLORS, type GomokuView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, usePartyBase, useSeatOrder } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { GomokuBoard } from './GomokuBoard';
import { longestOf, runAt } from './lib';
import { gomokuSfx } from './sounds';
import { useTimeouts } from '../../lib/useTimeouts';

/** tap a point, then tap it again (or ✓) to place: on by default, a per-phone switch */
export const gomokuConfirm = () => loadPref('gomoku.confirm') !== 'off';

export function GomokuTable(props: TableProps) {
  const gv = props.view.plugged?.kind === 'gomoku' ? props.view.plugged.gomoku : null;
  if (!gv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Setting out the stones…</p>
      </main>
    );
  }
  return <GomokuInner {...props} gv={gv} />;
}

function GomokuInner({ view, actions, bubbles, auth, notes = [], gv }: TableProps & { gv: GomokuView }) {
  const order = useSeatOrder(view, gv.seats);
  // cleared on unmount, so no sound or effect fires after leaving
  const tm = useTimeouts();
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const [busy, setBusy] = useState(false);
  const [ghost, setGhost] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(gomokuConfirm);
  const boardRef = useRef<HTMLDivElement>(null);
  const turnEndsAt = useTurnEndsAt(view);
  const overReady = useOverReady(view, 1800);
  const myTurn = playing && gv.turnId === view.meId && !!me;
  const people = [...view.players, ...view.leftPlayers];
  // point → player id, from the seat numbers on the board
  const stones = useMemo(() => {
    const out: Record<number, string> = {};
    gv.cells.forEach((s, i) => {
      if (s >= 0 && gv.seats[s]) out[i] = gv.seats[s];
    });
    return out;
  }, [gv.cells, gv.seats]);
  const empty = gv.moves === 0;
  const only = empty ? gomokuCentre(gv.size) : null;
  const longest = (id: string) => gv.best?.[id] ?? longestOf(gv.size, stones, id);

  // each stone: a clack; a four on the board warns; five celebrates
  const lastSeq = useRef(gv.last?.seq ?? null);
  useEffect(() => {
    const last = gv.last;
    if (!last || last.seq === lastSeq.current) return;
    lastSeq.current = last.seq;
    setGhost(null);
    gomokuSfx.stone();
    if (gv.winner) {
      gomokuSfx.five();
      const el = boardRef.current?.querySelector('.gm-stone.fresh');
      tm.later(() => confettiAt(el, { count: 60, spread: 1 }), 500);
      show({ text: gv.winner === view.meId ? 'Five in a row!' : `${name(gv.winner)}: five in a row!`, tone: gv.winner === view.meId ? 'gold' : 'info' }, 300);
      navigator.vibrate?.([30, 40, 30]);
      return;
    }
    if (gv.draw) return show({ text: 'The board is full: a draw', tone: 'info' }, 300);
    if (runAt(gv.size, stones, last.at).length === 4) {
      gomokuSfx.threat();
      show({ text: last.playerId === view.meId ? 'Four in a row!' : `${name(last.playerId)} has four!`, sub: last.playerId === view.meId ? undefined : 'Block it!', tone: last.playerId === view.meId ? 'good' : 'red' }, 150);
    }
  }, [gv.last?.seq]);

  useEffect(() => {
    if (myTurn) sfx.turn();
    else setGhost(null);
  }, [myTurn]);

  const place = async (at: number) => {
    if (!myTurn || busy) return;
    unlockSpeech();
    setBusy(true);
    setGhost(null);
    await actions.gameMove({ kind: 'gomoku', move: { type: 'place', at } });
    setBusy(false);
  };
  const tap = (at: number) => {
    if (only !== null && at !== only) {
      setGhost(only);
      return actions.toast('The first stone goes on the centre point');
    }
    if (!confirm || ghost === at) return void place(at);
    setGhost(at);
  };
  const flipConfirm = () => {
    savePref('gomoku.confirm', confirm ? 'off' : 'on');
    setConfirm(!confirm);
  };

  let status = '';
  if (playing && gv.turnId) status = myTurn ? (empty ? 'Your turn: start in the centre' : confirm && ghost !== null ? 'Tap again or ✓ to place' : 'Your turn: place a stone') : `${name(gv.turnId)}'s turn`;
  const infoMine = me && (
    <div className="gm-info">
      <p className="tinfo-counts">
        <span>{`📏 Your longest line: ${longest(view.meId)}`}</span>
        <span>{`⚫ ${gv.moves} stones on a ${gv.size} × ${gv.size} board`}</span>
      </p>
      <button className="btn small" onClick={flipConfirm}>
        {confirm ? '✅ Tap twice to place: on' : '⬜ Tap twice to place: off'}
      </button>
    </div>
  );
  const tips = ['Five in a row wins: across, down or diagonal', 'An open three (free at both ends) must be blocked at once', gv.size >= 19 ? 'Double-tap the board to zoom; drag to look around' : 'Tap a point to see your stone, tap again to place'];
  const winner = gv.winner;
  const placeOf = (id: string) => gv.places?.[id] ?? (winner ? (id === winner ? 1 : 2 + order.filter((o) => o !== winner && longest(o) > longest(id)).length) : 1);
  const ghostRow = ghost !== null ? Math.floor(ghost / gv.size) : 0;

  return (
    <main className={cx('table lu-table pt-table pr-wide gm-table', myTurn && 'pt-my-turn')} style={{ ['--turn-col' as string]: gv.turnId ? colorOf(gv.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room gm-room" aria-hidden />
      <div className="lu-stage pt-stage">
        <div className="lu-plane pt-plane">
          <div ref={boardRef} className={cx('gm-wood', gv.size >= 19 && 'big')}>
            <GomokuBoard
              size={gv.size}
              stones={stones}
              colorOf={colorOf}
              palette={PARTY_COLORS}
              last={gv.last ? { seq: gv.last.seq, at: gv.last.at } : null}
              win={gv.line}
              live={myTurn && !busy}
              ghost={ghost}
              myColor={colorOf(view.meId)}
              only={only}
              onTap={tap}
            />
          </div>
          {myTurn && confirm && ghost !== null && (
            <button className={cx('btn primary gm-place', ghostRow > gv.size / 2 ? 'at-top' : 'at-bottom')} onClick={() => void place(ghost)} disabled={busy}>
              ✓ Place
            </button>
          )}
        </div>
      </div>
      <Rails
        items={order.map((id) => {
          const pl = view.players.find((x) => x.id === id);
          return {
            id,
            corner: cornerOf(id),
            node: (
              <RailSeat
                player={pl}
                goneName={people.find((x) => x.id === id)?.name}
                color={colorOf(id)}
                turn={playing && id === gv.turnId}
                mine={id === view.meId}
                bubble={bubbleOf(id)}
                turnEndsAt={turnEndsAt}
                turnSec={view.config.turnSec}
                onTap={pl && pl.id !== view.meId ? () => base.setTarget(pl.id) : undefined}
                big={longest(id)}
                bigKey={longest(id)}
                label="longest line"
                turnText="Thinking"
                chip
                icon={<i className="gm-chip-stone" style={{ ['--c' as string]: colorOf(id) } as CSSProperties} />}
              />
            ),
          };
        })}
      />
      <PartyChrome
        view={view}
        actions={actions}
        auth={auth}
        notes={notes}
        base={base}
        status={status}
        mine={myTurn}
        infoMine={infoMine}
        tips={tips}
        leaveWhat="Your stones stay on the board"
        kickWhat="Their stones stay on the board"
        watchNote="👀 Watching · you'll play next game"
        myIcon={<i className="gm-chip-stone" style={{ ['--c' as string]: colorOf(view.meId) } as CSSProperties} />}
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => (gv.draw ? 'draw' : id === winner ? `${Math.max(5, longest(id))} in a row` : `longest line ${longest(id)}`)} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
