import type { Dict, Pattern } from './types';

// everyday Indian card names
const ONE: Record<string, string> = {
  Ace: 'इक्का', Two: 'दुक्की', Three: 'तिक्की', Four: 'चौका', Five: 'पंजा', Six: 'छक्का', Seven: 'सत्ता',
  Eight: 'अट्ठा', Nine: 'नहला', Ten: 'दहला', Jack: 'गुलाम', Queen: 'बेगम', King: 'बादशाह',
};
const MANY: Record<string, string> = {
  Aces: 'इक्के', Twos: 'दुक्की', Threes: 'तिक्की', Fours: 'चौके', Fives: 'पंजे', Sixes: 'छक्के', Sevens: 'सत्ते',
  Eights: 'अट्ठे', Nines: 'नहले', Tens: 'दहले', Jacks: 'गुलाम', Queens: 'बेगम', Kings: 'बादशाह',
};
const SUITS: Record<string, string> = { Spades: 'हुकुम', Hearts: 'पान', Diamonds: 'ईंट', Clubs: 'चिड़ी' };
const COUNT: Record<string, string> = {
  one: 'एक', two: 'दो', three: 'तीन', four: 'चार', five: 'पाँच', six: 'छह', seven: 'सात', eight: 'आठ',
};
export const ORD: Record<string, string> = { '1st': 'पहले', '2nd': 'दूसरे', '3rd': 'तीसरे', '4th': 'चौथे', '5th': 'पाँचवें' };

/** "four Queens" / "2 Kings" / "Seven of Spades" in Hindi */
export function claimHi(text: string): string {
  const of = /^(\w+) of (Spades|Hearts|Diamonds|Clubs)$/i.exec(text);
  if (of) return `${SUITS[of[2]] ?? of[2]} का ${ONE[of[1]] ?? of[1]}`;
  const m = /^(\w+) (\w+)$/.exec(text);
  if (m && (MANY[m[2]] || ONE[m[2]])) return `${COUNT[m[1].toLowerCase()] ?? m[1]} ${MANY[m[2]] ?? ONE[m[2]]}`;
  return MANY[text] ?? ONE[text] ?? SUITS[text] ?? text;
}

const RANKS = '(?:Aces?|Twos?|Threes?|Fours?|Fives?|Sixe?s?|Sevens?|Eights?|Nines?|Tens?|Jacks?|Queens?|Kings?)';
export const CLAIM = `((?:\\w+ )?${RANKS}|${RANKS} of (?:Spades|Hearts|Diamonds|Clubs))`;

// a place on its own (seat badge)
const PLACE: Dict = { '1st': 'पहला', '2nd': 'दूसरा', '3rd': 'तीसरा', '4th': 'चौथा', '5th': 'पाँचवाँ' };

export const D: Dict = { ...ONE, ...MANY, ...SUITS, ...PLACE, '1 card!': '1 पत्ता!' };

export const P: Pattern[] = [
  [new RegExp(`^${CLAIM}$`), (m) => claimHi(m[1])],
  [new RegExp(`^${CLAIM}, wild Kismat card$`), (m) => `${claimHi(m[1])}, वाइल्ड Kismat पत्ता`],
];
