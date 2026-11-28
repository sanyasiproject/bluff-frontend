// Pick a chess board and piece set (saved per phone, only you see them), plus coordinates and confirm-move switches
import type { CSSProperties } from 'react';
import { Choice } from '../../components/LobbySettings';
import { cx } from '../../lib/cards';
import { CHESS_BOARDS, CHESS_SETS, saveChessLook, useChessLooks } from './looks';
import { PieceSvg } from './pieceArt';

export function ChessLookRows() {
  const looks = useChessLooks();
  return (
    <div className="lu-looks ch-looks">
      <div className="lu-look-group">
        <p className="label">♟️ Board</p>
        <div className="lu-look-row" role="radiogroup" aria-label="Chess board">
          {CHESS_BOARDS.map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={looks.board === b.id} className={cx('lu-look', looks.board === b.id && 'on')} onClick={() => saveChessLook('board', b.id)}>
              <span className="lu-look-art ch-look-board" style={{ '--ch-light': b.light, '--ch-dark': b.dark } as CSSProperties} />
              <b>{b.name}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="lu-look-group">
        <p className="label">♞ Pieces</p>
        <div className="lu-look-row" role="radiogroup" aria-label="Chess pieces">
          {CHESS_SETS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={looks.set === s.id} className={cx('lu-look', looks.set === s.id && 'on')} onClick={() => saveChessLook('set', s.id)}>
              <span className="lu-look-art ch-look-set">
                <PieceSvg role="n" color="w" set={s.id} />
                <PieceSvg role="k" color="b" set={s.id} />
              </span>
              <b>{s.name}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="setting-row">
        <div className="grow">
          <b>Coordinates</b>
          <span>Letters and numbers on the board edge</span>
        </div>
        <Choice value={looks.coords} options={[[true, 'On'], [false, 'Off']]} onPick={(v) => saveChessLook('coords', v)} />
      </div>
      <div className="setting-row">
        <div className="grow">
          <b>Confirm move</b>
          <span>Tick each move before it is sent</span>
        </div>
        <Choice value={looks.confirm} options={[[false, 'Off'], [true, 'On']]} onPick={(v) => saveChessLook('confirm', v)} />
      </div>
    </div>
  );
}
