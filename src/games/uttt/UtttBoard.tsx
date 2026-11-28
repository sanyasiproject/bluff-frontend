// The Ultimate Tic-Tac-Toe board: a chalk big grid of nine small boards, marker X and O, glowing open boards, stamps and the big line
import { useState, type CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { utttSendAfter, type UtttBoardState, type UtttMark } from '../../types';

interface Props {
  cells: (UtttMark | null)[];
  boards: UtttBoardState[];
  /** boards the player to move may use */
  active: number[];
  colorOf: (mark: UtttMark) => string;
  last: { seq: number; board: number; cell: number } | null;
  /** the big line of three boards */
  win: number[] | null;
  live: boolean;
  myMark: UtttMark;
  onPlace: (board: number, cell: number) => void;
}

/** a hand-drawn X or O filling its box */
export function Mark({ mark, color, fresh, big }: { mark: 'X' | 'O'; color: string; fresh?: boolean; big?: boolean }) {
  return (
    <svg className={cx('ut-mark', fresh && 'fresh', big && 'big')} viewBox="0 0 100 100" style={{ ['--c' as string]: color } as CSSProperties} aria-label={mark}>
      {mark === 'X' ? (
        <>
          <path d="M22 20Q50 52 80 82" pathLength={1} />
          <path d="M79 21Q48 50 20 80" pathLength={1} className="two" />
        </>
      ) : (
        <path d="M50 16C72 15 84 32 84 50C84 70 68 85 49 84C29 83 16 68 16 49C17 30 31 17 52 18" pathLength={1} />
      )}
    </svg>
  );
}

/** board centres on the big grid, in percent */
const centre = (b: number) => ({ x: ((b % 3) + 0.5) * (100 / 3), y: (Math.floor(b / 3) + 0.5) * (100 / 3) });

export function UtttBoard({ cells, boards, active, colorOf, last, win, live, myMark, onPlace }: Props) {
  const [aim, setAim] = useState<{ board: number; cell: number } | null>(null);
  const free = active.length > 1;
  const target = aim ? utttSendAfter(cells, boards, aim.board, aim.cell, myMark) : undefined;
  const a = win ? centre(win[0]) : null;
  const z = win ? centre(win[2]) : null;

  return (
    <div className={cx('ut-big', live && 'live', live && free && 'free')} onPointerLeave={() => setAim(null)}>
      {[...Array(9).keys()].map((b) => {
        const owner = boards[b];
        const playable = live && active.includes(b);
        const sent = aim && target === b;
        const freeNext = aim && target === null && owner === null;
        return (
          <div
            key={b}
            className={cx('ut-small', playable && 'open', owner && owner !== 'draw' && 'won', owner === 'draw' && 'draw', sent && 'sent', freeNext && 'free-next', !live && active.length === 1 && active[0] === b && 'next')}
            style={{ ['--c' as string]: owner && owner !== 'draw' ? colorOf(owner) : undefined } as CSSProperties}
          >
            {cells.slice(b * 9, b * 9 + 9).map((who, c) => {
              const fresh = last?.board === b && last.cell === c;
              return (
                <button
                  key={c}
                  className={cx('ut-cell', fresh && 'last')}
                  disabled={!playable || who !== null}
                  aria-label={who ? `${who} in board ${b + 1} cell ${c + 1}` : `Board ${b + 1} cell ${c + 1}`}
                  onPointerMove={() => playable && !who && (aim?.board !== b || aim.cell !== c) && setAim({ board: b, cell: c })}
                  onPointerDown={() => playable && !who && setAim({ board: b, cell: c })}
                  onClick={() => {
                    setAim(null);
                    if (playable && !who) onPlace(b, c);
                  }}
                >
                  {who && <Mark key={fresh ? `f${last?.seq}` : 'm'} mark={who} color={colorOf(who)} fresh={fresh} />}
                </button>
              );
            })}
            {owner && owner !== 'draw' && (
              <span className="ut-stamp">
                <Mark mark={owner} color={colorOf(owner)} fresh={last?.board === b} big />
              </span>
            )}
          </div>
        );
      })}
      {aim && target === null && <span className="ut-free-tip">Free move for them</span>}
      {a && z && (
        <svg className="ut-line" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d={`M${a.x} ${a.y}L${z.x} ${z.y}`} pathLength={1} />
        </svg>
      )}
    </div>
  );
}
