// Chess words shared by the table, lobby, game end and profile: perfs, end reasons, time controls
import { CHESS_PERFS } from '../../types';
import type { ChessEndReason, ChessPerf, Color, Move, Role, Square } from './lib';

export const PERF_NAMES = Object.fromEntries(CHESS_PERFS.map((p) => [p.id, p.name])) as Record<ChessPerf, string>;
const icon = (id: ChessPerf) => CHESS_PERFS.find((p) => p.id === id)?.icon ?? '♟️';

const REASONS: Record<ChessEndReason, string> = {
  checkmate: 'Checkmate', stalemate: 'Stalemate', insufficient: 'Not enough pieces to mate', threefold: 'Same position three times',
  fiftyMove: '50 moves without a capture or pawn move', variantWin: 'Variant win', variantLoss: 'Variant loss',
  kingOfTheHill: 'King reached the hill', threeCheck: 'Third check', atomicExplosion: 'King blown up', hordeDestroyed: 'The horde is gone',
  raceFinished: 'King reached the 8th rank', resign: 'Resigned', timeout: 'Time ran out', agreement: 'Draw agreed', abort: 'Game aborted',
};
export const reasonText = (r: ChessEndReason) => REASONS[r] ?? r;
export const sideName = (c: Color) => (c === 'w' ? 'White' : 'Black');

/** "White wins", "Draw", "Aborted" */
export function resultTitle(result: { winner: Color | null; reason: ChessEndReason } | undefined): string {
  if (!result) return '';
  if (result.reason === 'abort') return 'Aborted';
  return result.winner ? `${sideName(result.winner)} wins` : 'Draw';
}

/** a time control id "3+2" as words; "none" is untimed */
export function timeText(id: string): string {
  if (id === 'none') return 'Untimed';
  const [m, i] = id.split('+');
  return `${m}+${i}`;
}

export const TIME_GROUPS: { id: string; name: string; icon: string; times: string[] }[] = [
  { id: 'bullet', name: 'Bullet', icon: icon('bullet'), times: ['1+0', '2+1'] },
  { id: 'blitz', name: 'Blitz', icon: icon('blitz'), times: ['3+0', '3+2', '5+0', '5+3'] },
  { id: 'rapid', name: 'Rapid', icon: icon('rapid'), times: ['10+0', '10+5', '15+10'] },
  { id: 'classical', name: 'Classical', icon: icon('classical'), times: ['30+0', '30+20'] },
  { id: 'none', name: 'Untimed', icon: '♾️', times: ['none'] },
];

const sq = (s: string): Square => s.charCodeAt(0) - 97 + (Number(s[1]) - 1) * 8;

/** a UCI string as squares without checking legality ("e2e4", "e7e8q", "N@f3") */
export function uciMove(u: string | null | undefined): Move | null {
  if (!u) return null;
  if (u[1] === '@') {
    const to = sq(u.slice(2, 4));
    return { from: to, to, drop: u[0].toLowerCase() as Role };
  }
  if (u.length < 4) return null;
  return { from: sq(u.slice(0, 2)), to: sq(u.slice(2, 4)), promotion: (u[4] as Role) || undefined };
}

/** move sound from its SAN */
export const sanKind = (san: string | undefined): 'check' | 'castle' | 'capture' | 'drop' | 'move' =>
  !san ? 'move' : /[+#]/.test(san) ? 'check' : san.startsWith('O-O') ? 'castle' : san.includes('x') ? 'capture' : san.includes('@') ? 'drop' : 'move';
