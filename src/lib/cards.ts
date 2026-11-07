import type { Rank, Suit } from '../types';

// ︎ keeps iPhones from drawing hearts and diamonds as emoji
export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠︎', H: '♥︎', D: '♦︎', C: '♣︎' };
export const SUIT_NAME: Record<Suit, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const isRed = (suit: Suit) => suit === 'H' || suit === 'D';

const NAMES: Record<Rank, [string, string]> = {
  A: ['Ace', 'Aces'],
  '2': ['Two', 'Twos'],
  '3': ['Three', 'Threes'],
  '4': ['Four', 'Fours'],
  '5': ['Five', 'Fives'],
  '6': ['Six', 'Sixes'],
  '7': ['Seven', 'Sevens'],
  '8': ['Eight', 'Eights'],
  '9': ['Nine', 'Nines'],
  '10': ['Ten', 'Tens'],
  J: ['Jack', 'Jacks'],
  Q: ['Queen', 'Queens'],
  K: ['King', 'Kings'],
};

export const rankName = (rank: Rank) => NAMES[rank][0];
export const rankPlural = (rank: Rank) => NAMES[rank][1];

/** "4 Queens", "1 Ace" */
export const claimText = (count: number, rank: Rank) => `${count} ${count === 1 ? NAMES[rank][0] : NAMES[rank][1]}`;

export const placeLabel = (n: number) => ['', '1st', '2nd', '3rd', '4th', '5th'][n] ?? `${n}th`;

/** stable avatar colour from a name */
export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 55% 40%)`;
}

export const cx = (...parts: unknown[]) => parts.filter((p) => typeof p === 'string' && p).join(' ');
