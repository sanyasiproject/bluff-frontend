// Chess looks chosen per phone: board theme, piece set, coordinates, confirm move
import { useEffect, useState } from 'react';
import { loadPref, savePref } from '../../lib/storage';
import type { PieceSet } from './pieceArt';

export interface ChessBoardTheme { id: string; name: string; light: string; dark: string }
export const CHESS_BOARDS: readonly ChessBoardTheme[] = [
  { id: 'wood', name: 'Wood', light: '#ecd3a8', dark: '#b07a4b' },
  { id: 'meadow', name: 'Meadow', light: '#e8ecce', dark: '#6f9a55' },
  { id: 'ocean', name: 'Ocean', light: '#dde6ef', dark: '#6f8fb3' },
];
export const CHESS_SETS: readonly { id: PieceSet; name: string }[] = [
  { id: 'classic', name: 'Staunton' },
  { id: 'modern', name: 'Modern' },
];

export interface ChessLooks { board: string; set: PieceSet; coords: boolean; confirm: boolean }
const EVENT = 'chess-looks';

export function loadChessLooks(): ChessLooks {
  const board = loadPref('chess.board');
  const set = loadPref('chess.set');
  return {
    board: CHESS_BOARDS.some((b) => b.id === board) ? board! : 'wood',
    set: CHESS_SETS.some((s) => s.id === set) ? (set as PieceSet) : 'classic',
    coords: loadPref('chess.coords') !== 'off',
    confirm: loadPref('chess.confirm') === 'on',
  };
}

export function saveChessLook<K extends keyof ChessLooks>(key: K, value: ChessLooks[K]): void {
  savePref(`chess.${key}`, typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value));
  window.dispatchEvent(new Event(EVENT));
}

/** this phone's chess looks, kept in step when they change anywhere */
export function useChessLooks(): ChessLooks {
  const [looks, setLooks] = useState(loadChessLooks);
  useEffect(() => {
    const update = () => setLooks(loadChessLooks());
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);
  return looks;
}

export const boardThemeOf = (id: string) => CHESS_BOARDS.find((b) => b.id === id) ?? CHESS_BOARDS[0];
