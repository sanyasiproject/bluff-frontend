// Chess ratings, leaderboards and saved games from the server (logged-in players only)
import { api } from '../../lib/api';
import type { ChessGameRecord, ChessGameSummary, ChessLeaderboard, ChessPerf, ChessRatingsResponse } from './lib';

export const chessApi = {
  ratings: (token: string, userId = 'me') => api<ChessRatingsResponse>(`/chess/ratings/${encodeURIComponent(userId)}`, { token }),
  leaderboard: (token: string, perf: ChessPerf) => api<ChessLeaderboard>(`/chess/leaderboard/${perf}`, { token }),
  games: (token: string, before?: number) => api<{ games: ChessGameSummary[] }>(`/chess/games?user=me&limit=30${before ? `&before=${before}` : ''}`, { token }),
  game: (token: string, id: string) => api<{ game: ChessGameRecord }>(`/chess/games/${encodeURIComponent(id)}`, { token }),
};
