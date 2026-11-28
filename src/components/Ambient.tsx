import type { CSSProperties } from 'react';
import { cx } from '../lib/cards';
import type { GameKind } from '../types';

// fixed positions so the background looks the same on every render
const SUITS = [
  { s: '♠', left: 6, size: 34, dur: 26, delay: -4 },
  { s: '♥', left: 22, size: 22, dur: 21, delay: -15 },
  { s: '♣', left: 38, size: 28, dur: 29, delay: -9 },
  { s: '♦', left: 55, size: 20, dur: 23, delay: -19 },
  { s: '♠', left: 70, size: 26, dur: 27, delay: -1 },
  { s: '♥', left: 84, size: 32, dur: 24, delay: -12 },
  { s: '♦', left: 93, size: 18, dur: 31, delay: -22 },
  { s: '♣', left: 13, size: 18, dur: 33, delay: -27 },
];

/** each game's own pieces for the drift (card games keep the suits) */
const PIECES: Partial<Record<GameKind, string[]>> = {
  ludo: ['🎲', '🔴', '🟡', '🎲', '🟢', '🔵'],
  snakes: ['🎲', '🐍', '🪜', '🎲', '🐍', '🪜'],
  rmcs: ['👑', '📜', '🕵️', '📜', '👮', '👑'],
  darts: ['🎯', '🎯', '🎯', '🎯'],
  dots: ['⬛', '✏️', '⬛', '✏️'],
  colorwar: ['🔴', '🔵', '🟢', '🟡'],
  fruit: ['🍉', '🍊', '🍎', '🍍', '🍋', '🍇'],
  spikes: ['🔺', '📦', '🔺', '📦'],
  carrom: ['⚪', '⚫', '🔴', '⚪', '⚫'],
  bomb: ['💣', '❤️', '💥', '💣'],
  seabattle: ['🚢', '🌊', '🎯', '⚓'],
  gomoku: ['⚫', '⚪', '🔴', '🔵'],
  uttt: ['❌', '⭕', '❌', '⭕'],
  wordhunt: ['🔤', '📝', '🔠', '⏱️'],
};

/** faint pieces floating up behind the lobby: card suits for the card games, the game's own pieces for the others */
export function SuitDrift({ game }: { game?: GameKind }) {
  const pieces = game ? PIECES[game] : undefined;
  return (
    <div className={cx('suit-drift', pieces && 'pieces')} aria-hidden>
      {SUITS.map((x, i) => {
        const glyph = pieces ? pieces[i % pieces.length] : x.s;
        return (
          <span
            key={i}
            className={pieces ? 'emo' : cx(x.s === '♥' || x.s === '♦' ? 'red' : 'black')}
            style={{ left: `${x.left}%`, fontSize: pieces ? Math.round(x.size * 0.8) : x.size, animationDuration: `${x.dur}s`, animationDelay: `${x.delay}s` } as CSSProperties}
          >
            {glyph}
          </span>
        );
      })}
    </div>
  );
}
