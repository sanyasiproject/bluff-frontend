// The Ultimate Tic-Tac-Toe table: a chalkboard of nine small boards filling the height, X and O on the rails
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-hud.css';
import '../../styles/land-ludo-over.css';
import '../../styles/land-party.css';
import '../../styles/land-party-rails.css';
import '../../styles/land-uttt.css';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTurnEndsAt } from '../../components/TurnTimer';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import { sfx } from '../../lib/sounds';
import { unlockSpeech } from '../../lib/speech';
import type { UtttMark, UtttView } from '../../types';
import type { TableProps } from '../registry';
import { useOverReady, usePartyBase, useSeatOrder } from '../turnkit/base';
import { PartyChrome } from '../turnkit/PartyChrome';
import { PartyOver } from '../turnkit/PartyOver';
import { Rails, RailSeat } from '../turnkit/RailSeat';
import { utttSfx } from './sounds';
import { Mark, UtttBoard } from './UtttBoard';

const BOARD_NAMES = ['top-left', 'top', 'top-right', 'left', 'centre', 'right', 'bottom-left', 'bottom', 'bottom-right'];

export function UtttTable(props: TableProps) {
  const uv = props.view.plugged?.kind === 'uttt' ? props.view.plugged.uttt : null;
  if (!uv) {
    return (
      <main className="screen center-screen">
        <p className="muted">Drawing the grids…</p>
      </main>
    );
  }
  return <UtttInner {...props} uv={uv} />;
}

function UtttInner({ view, actions, bubbles, auth, notes = [], uv }: TableProps & { uv: UtttView }) {
  const order = useSeatOrder(view, [uv.x, uv.o]);
  const base = usePartyBase(view, bubbles, order);
  const { me, playing, name, colorOf, cornerOf, bubbleOf, show } = base;
  const [busy, setBusy] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const turnEndsAt = useTurnEndsAt(view);
  const overReady = useOverReady(view, 1800);
  const myTurn = playing && uv.turnId === view.meId && !!me;
  const people = [...view.players, ...view.leftPlayers];
  const markOf = (id: string): UtttMark => (id === uv.o ? 'O' : 'X');
  const markColor = (m: UtttMark) => colorOf(m === 'X' ? uv.x : uv.o);
  const won = (id: string) => uv.boards.filter((s) => s === markOf(id)).length;
  const freeMove = uv.moves > 0 && uv.active.length > 1;

  // each mark: a squeak; a small board won: a stamp; the big line: fireworks
  const lastSeq = useRef(uv.last?.seq ?? null);
  useEffect(() => {
    const last = uv.last;
    if (!last || last.seq === lastSeq.current) return;
    lastSeq.current = last.seq;
    utttSfx.mark();
    if (uv.winner) {
      window.setTimeout(() => utttSfx.win(), 300);
      window.setTimeout(() => confettiAt(boardRef.current, { count: 70, spread: 1.2 }), 700);
      show({ text: uv.winner === view.meId ? 'Three boards in a row!' : `${name(uv.winner)} wins the big board`, tone: uv.winner === view.meId ? 'gold' : 'info' }, 400);
      return;
    }
    if (uv.draw) return show({ text: 'No big line left: a draw', tone: 'info' }, 300);
    const mine = last.playerId === view.meId;
    if (last.won) {
      window.setTimeout(() => utttSfx.stamp(mine), 200);
      show({ text: mine ? `You won the ${BOARD_NAMES[last.board]} board` : `${name(last.playerId)} won the ${BOARD_NAMES[last.board]} board`, tone: mine ? 'good' : 'info' }, 250);
    } else if (myTurn && freeMove) {
      utttSfx.free();
      show({ text: 'Free move!', sub: 'Play in any glowing board', tone: 'good' }, 250);
    }
  }, [uv.last?.seq]);

  useEffect(() => {
    if (myTurn) sfx.turn();
  }, [myTurn]);

  const placeAt = async (board: number, cell: number) => {
    if (!myTurn || busy) return;
    unlockSpeech();
    setBusy(true);
    await actions.gameMove({ kind: 'uttt', move: { type: 'place', board, cell } });
    setBusy(false);
  };

  let status = '';
  if (playing && uv.turnId) {
    if (!myTurn) status = `${name(uv.turnId)}'s turn`;
    else if (uv.moves === 0) status = 'You start: play anywhere';
    else status = freeMove ? 'Free move: any glowing board' : `Your turn: the ${BOARD_NAMES[uv.active[0]]} board`;
  }
  const infoMine = me && (
    <p className="tinfo-counts">
      <span>{`You are ${markOf(view.meId)}`}</span>
      <span>{`🏁 You have ${won(view.meId)} board${won(view.meId) === 1 ? '' : 's'}`}</span>
    </p>
  );
  const tips = ['Where you play sends your opponent to that board', 'Avoid sending them to a board they can win', 'Press and hold a cell to see where it sends them'];
  const placeOf = (id: string) => (uv.winner ? (id === uv.winner ? 1 : 2) : 1);
  const icon = (id: string) => (
    <span className="ut-chip">
      <Mark mark={markOf(id)} color={colorOf(id)} />
    </span>
  );

  return (
    <main className={cx('table lu-table pt-table pr-wide ut-table', myTurn && 'pt-my-turn')} style={{ ['--turn-col' as string]: uv.turnId ? colorOf(uv.turnId) : '#fff' } as CSSProperties}>
      <div className="lu-room ut-room" aria-hidden />
      <div className="lu-stage pt-stage">
        <div className="lu-plane pt-plane">
          <div ref={boardRef} className="ut-slate">
            <UtttBoard
              cells={uv.cells}
              boards={uv.boards}
              active={uv.active}
              colorOf={markColor}
              last={uv.last}
              win={uv.line}
              live={myTurn && !busy}
              myMark={markOf(view.meId)}
              onPlace={(b, c) => void placeAt(b, c)}
            />
          </div>
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
                turn={playing && id === uv.turnId}
                mine={id === view.meId}
                bubble={bubbleOf(id)}
                turnEndsAt={turnEndsAt}
                turnSec={view.config.turnSec}
                onTap={pl && pl.id !== view.meId ? () => base.setTarget(pl.id) : undefined}
                big={won(id)}
                bigKey={won(id)}
                label={`board${won(id) === 1 ? '' : 's'} won`}
                turnText="Thinking"
                chip
                chipName={markOf(id)}
                icon={icon(id)}
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
        leaveWhat="Your marks stay on the board"
        kickWhat="Their marks stay on the board"
        watchNote="👀 Watching · you'll play next game"
        myIcon={icon(view.meId)}
        youAre={{ color: colorOf(view.meId), name: markOf(view.meId) }}
        over={overReady && <PartyOver view={view} ids={order} placeOf={placeOf} colorOf={colorOf} line={(id) => `${markOf(id)} · ${won(id)} board${won(id) === 1 ? '' : 's'}`} onNext={() => base.setOverSeen(true)} />}
      />
    </main>
  );
}
