// Chess rule lines (no chess library needed): the basics and each variant, for the rules sheet and the Rules page
import type { ChessVariant } from '../../types';

export const BASIC_RULES = [
  '2 players, White moves first. Tap a piece, then a square (or drag it). Dots show where it can go, rings show captures.',
  'Checkmate wins: the king is attacked and has no way out. Stalemate, not enough pieces to mate, the same position three times and 50 moves without a capture or pawn move are draws.',
  'Clocks: each side has its own time and gets the increment after every move (5+3 = 5 minutes, +3 seconds a move). Run out of time and you lose.',
  "Before both sides have moved, a player can abort: nobody wins. You can offer a draw; in casual games you can ask for a takeback.",
  'Rated games need two logged-in players on a clock. Everyone starts at 800; a "?" means the rating is still settling.',
];

export const VARIANT_RULES: Record<ChessVariant, string[]> = {
  standard: ['Normal chess with every rule: castling, en passant and promotion.'],
  chess960: ['The back rank is shuffled (one of 960 starts), the same for both sides. Bishops stay on opposite colours and the king starts between the rooks.', 'Castling ends with the king and rook on their usual squares (g and f, or c and d). Tap the king, then its rook or its landing square.'],
  crazyhouse: ['Every piece you capture joins your pocket, in your colour. On your turn you may drop it on any empty square instead of moving.', 'Pawns cannot be dropped on the first or last rank. A promoted piece goes back to the pocket as a pawn. Drops can block a check.'],
  kingOfTheHill: ['Normal chess, but bring your king to one of the four centre squares (d4, e4, d5, e5) and you win at once.'],
  threeCheck: ['Normal chess, but giving check for the third time wins. The marks by each player count the checks given.'],
  antichess: ['Lose all your pieces (or get stalemated) to win. If you can capture, you must.', 'The king is an ordinary piece: no check, no castling, and a pawn can promote to a king.'],
  atomic: ['A capture explodes: the capturing and captured pieces and every piece except pawns on the 8 squares around are removed. Blow up the enemy king to win.', 'Kings cannot capture. Kings may stand next to each other, and then neither can be checked.'],
  horde: ['White has 36 pawns and no king; Black has a normal army. Black wins by capturing every white piece, White wins by checkmate.', "White's pawns on the first rank may also move two squares."],
  racingKings: ['Both sides start on the first two ranks. Race your king to the 8th rank to win. Giving check is not allowed at all.', 'If White gets there first and Black can reach the 8th rank on the very next move, the game is a draw.'],
};
