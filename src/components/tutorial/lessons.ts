// Scripted practice games: each step sets part of the table, says what to do, and waits for one exact tap
import type { Card, GameKind, Rank, Suit } from '../../types';

export type ButtonId = 'play' | 'pass' | 'bluff' | 'pick' | 'call' | 'next' | 'done';

/** a bluff call turned over: one card shown face up among face-down ones */
export interface Reveal {
  slots: number;
  card: Card;
  /** where it shows: a fixed slot, or the one the player picked */
  at: number | 'picked';
  caught: boolean;
  text: string;
}

export interface TableState {
  hand: Card[];
  bot: number;
  /** last move on Raju's seat */
  botSays: string | null;
  botTurn: boolean;
  myTurn: boolean;
  /** Raju was hit by a 7 */
  botHit: boolean;
  // Bluff
  pile: number;
  round: Rank | null;
  lastPlay: string | null;
  reveal: Reveal | null;
  /** face-down cards to pick one from after tapping Bluff */
  pickFrom: number;
  rankSheet: boolean;
  // Crazy 7
  top: Card | null;
  under: Card[];
  deck: number;
  banner: string | null;
  called: boolean;
  status: string | null;
  // both
  selected: string[];
  fresh: string[];
  buttons: ButtonId[];
  pickLabel: string;
}

export type Target =
  | { kind: 'select'; ids: string[] }
  | { kind: 'card'; ids: string[] }
  | { kind: 'button'; id: ButtonId }
  | { kind: 'rank'; rank: Rank }
  | { kind: 'pick' }
  | { kind: 'auto'; ms: number };

export interface Step {
  say: string;
  /** shown after a wrong tap */
  hint?: string;
  target: Target;
  set?: Partial<TableState>;
}

export const START: TableState = {
  hand: [],
  bot: 6,
  botSays: null,
  botTurn: false,
  myTurn: true,
  botHit: false,
  pile: 0,
  round: null,
  lastPlay: null,
  reveal: null,
  pickFrom: 0,
  rankSheet: false,
  top: null,
  under: [],
  deck: 30,
  banner: null,
  called: false,
  status: null,
  selected: [],
  fresh: [],
  buttons: [],
  pickLabel: 'Pick a card',
};

const c = (rank: Rank, suit: Suit): Card => ({ id: `${rank}${suit}`, rank, suit });
const turnOfBot = { myTurn: false, botTurn: true, buttons: [] as ButtonId[] };
const turnOfMe = { myTurn: true, botTurn: false };

// ---------- Bluff ----------
const B = { k1: c('K', 'S'), k2: c('K', 'H'), f1: c('5', 'C'), f2: c('5', 'D'), nine: c('9', 'H') };

const BLUFF: Step[] = [
  {
    say: "This is Bluff. First to empty their hand wins. It's your turn: tap your two Kings.",
    hint: 'Tap the two glowing Kings',
    target: { kind: 'select', ids: [B.k1.id, B.k2.id] },
    set: { hand: [B.f1, B.f2, B.nine, B.k2, B.k1], bot: 6 },
  },
  { say: 'Now tap Put down. Your cards go face down, so nobody sees them.', target: { kind: 'button', id: 'play' }, set: { buttons: ['play'] } },
  {
    say: "Call a rank. They really are Kings, so tap K. (You could call any rank: that's a bluff.)",
    hint: 'Tap K',
    target: { kind: 'rank', rank: 'K' },
    set: { buttons: [], rankSheet: true },
  },
  {
    say: "Raju's turn. This round everyone must put down Kings, or pass.",
    target: { kind: 'auto', ms: 1700 },
    set: { rankSheet: false, hand: [B.f1, B.f2, B.nine], selected: [], pile: 2, round: 'K', lastPlay: 'You put down 2 Kings', ...turnOfBot },
  },
  {
    say: "3 Kings? There are only 4, and you had 2. He's lying! Tap Bluff!",
    target: { kind: 'button', id: 'bluff' },
    set: { bot: 3, pile: 5, lastPlay: 'Raju put down 3 Kings', botSays: '3 × K', ...turnOfMe, buttons: ['bluff'] },
  },
  {
    say: "Pick one of his 3 cards to turn over. If it isn't a King, he's caught.",
    hint: 'Tap any of his face-down cards',
    target: { kind: 'pick' },
    set: { buttons: [], pickFrom: 3 },
  },
  {
    say: 'Caught! It was a 4. Raju takes the whole pile, and you start the next round.',
    target: { kind: 'button', id: 'next' },
    set: {
      pickFrom: 0,
      reveal: { slots: 3, card: c('4', 'D'), at: 'picked', caught: true, text: 'Caught bluffing!' },
      bot: 8,
      pile: 0,
      round: null,
      lastPlay: null,
      botSays: '+5',
      buttons: ['next'],
    },
  },
  {
    say: 'Your turn to bluff. Tap your 9 on its own.',
    hint: 'Tap the glowing 9',
    target: { kind: 'select', ids: [B.nine.id] },
    set: { reveal: null, botSays: null, buttons: [] },
  },
  { say: 'Tap Put down.', target: { kind: 'button', id: 'play' }, set: { buttons: ['play'] } },
  {
    say: "Call Fives, even though it's a 9. Keep a straight face 😇",
    hint: 'Tap 5',
    target: { kind: 'rank', rank: '5' },
    set: { buttons: [], rankSheet: true },
  },
  {
    say: 'Raju is thinking…',
    target: { kind: 'auto', ms: 1900 },
    set: { rankSheet: false, hand: [B.f1, B.f2], selected: [], pile: 1, round: '5', lastPlay: 'You put down 1 Five', ...turnOfBot },
  },
  {
    say: 'Raju called Bluff and caught you, so the pile comes back to you. Lying is risky! (You can call Bluff at most 2 times in a row.)',
    target: { kind: 'button', id: 'next' },
    set: {
      reveal: { slots: 1, card: B.nine, at: 0, caught: true, text: 'Raju caught you!' },
      hand: [B.f1, B.f2, B.nine],
      fresh: [B.nine.id],
      pile: 0,
      round: null,
      lastPlay: null,
      botTurn: false,
      buttons: ['next'],
    },
  },
  {
    say: 'Raju won that call, so he starts the next round.',
    target: { kind: 'auto', ms: 1500 },
    set: { reveal: null, fresh: [], ...turnOfBot },
  },
  {
    say: "No Aces, and you'd rather not lie? Tap Pass.",
    target: { kind: 'button', id: 'pass' },
    set: { bot: 7, pile: 1, round: 'A', lastPlay: 'Raju put down 1 Ace', botSays: '1 × A', ...turnOfMe, buttons: ['pass', 'bluff'] },
  },
  {
    say: 'Everyone passed, so the pile is cleared and Raju, who played last, starts again.',
    target: { kind: 'button', id: 'next' },
    set: { pile: 0, round: null, lastPlay: null, botSays: null, myTurn: false, buttons: ['next'] },
  },
  {
    say: 'A few turns later… Two Fives left! Tap both.',
    hint: 'Tap the two glowing Fives',
    target: { kind: 'select', ids: [B.f1.id, B.f2.id] },
    set: { hand: [B.f1, B.f2], bot: 3, ...turnOfMe, buttons: [] },
  },
  { say: 'Tap Put down.', target: { kind: 'button', id: 'play' }, set: { buttons: ['play'] } },
  { say: "Call Fives. It's the truth!", hint: 'Tap 5', target: { kind: 'rank', rank: '5' }, set: { buttons: [], rankSheet: true } },
  {
    say: "Your hand is empty. If Raju doesn't catch a lie, you're out…",
    target: { kind: 'auto', ms: 1700 },
    set: { rankSheet: false, hand: [], selected: [], pile: 2, round: '5', lastPlay: 'You put down 2 Fives', ...turnOfBot },
  },
  {
    say: "Raju passed: you win! 🎉 The last player still holding cards loses. You're ready to play Bluff.",
    target: { kind: 'button', id: 'done' },
    set: { botTurn: false, botSays: 'passed', buttons: ['done'] },
  },
];

// ---------- Crazy 7 ----------
const C = {
  q: c('Q', 'S'),
  nine: c('9', 'H'),
  four: c('4', 'C'),
  king: c('K', 'C'),
  six: c('6', 'C'),
  three: c('3', 'D'),
  seven: c('7', 'D'),
  fiveS: c('5', 'S'),
  eight: c('8', 'H'),
  fiveD: c('5', 'D'),
};

const CRAZY7: Step[] = [
  {
    say: "This is Crazy 7. Play one card that matches the top card's suit or number. Your heart glows: tap the 9♥.",
    hint: 'Tap the glowing 9♥',
    target: { kind: 'card', ids: [C.nine.id] },
    set: { hand: [C.q, C.nine, C.four, C.king, C.three, C.seven], top: c('2', 'H'), under: [], deck: 30, bot: 6 },
  },
  {
    say: "Raju's turn.",
    target: { kind: 'auto', ms: 1400 },
    set: { hand: [C.q, C.four, C.king, C.three, C.seven], top: C.nine, under: [c('2', 'H')], ...turnOfBot },
  },
  {
    say: 'Nothing matches 6♥, so one card was picked for you. It\'s a 6, it fits! Tap it. (Tables with more picks a turn also let you pick again, or Pass to stop early.)',
    hint: 'Tap the glowing 6♣',
    target: { kind: 'card', ids: [C.six.id] },
    set: {
      top: c('6', 'H'),
      under: [c('2', 'H'), C.nine],
      bot: 5,
      botSays: 'played 6♥',
      hand: [C.q, C.four, C.six, C.king, C.three, C.seven],
      fresh: [C.six.id],
      deck: 29,
      status: 'No match, we picked one for you',
      ...turnOfMe,
    },
  },
  {
    say: "Raju's turn.",
    target: { kind: 'auto', ms: 1400 },
    set: { hand: [C.q, C.four, C.king, C.three, C.seven], top: C.six, under: [C.nine, c('6', 'H')], fresh: [], status: null, ...turnOfBot },
  },
  {
    say: 'A 7 is your weapon: the next player picks 2 and misses a turn. Tap your 7♦.',
    hint: 'Tap the glowing 7♦',
    target: { kind: 'card', ids: [C.seven.id] },
    set: { top: c('6', 'D'), under: [c('6', 'H'), C.six], bot: 4, botSays: 'played 6♦', ...turnOfMe },
  },
  {
    say: 'Raju has no 7 to pass it on…',
    target: { kind: 'auto', ms: 1600 },
    set: { hand: [C.q, C.four, C.king, C.three], top: C.seven, under: [C.six, c('6', 'D')], banner: 'Raju must pick 2', botHit: true, myTurn: false },
  },
  {
    say: 'He picked 2 and lost his turn, so it is yours again. Play your 3♦.',
    hint: 'Tap the glowing 3♦',
    target: { kind: 'card', ids: [C.three.id] },
    set: { bot: 6, botSays: '+2 · missed turn', banner: null, botHit: false, deck: 27, ...turnOfMe },
  },
  {
    say: "Raju's turn.",
    target: { kind: 'auto', ms: 1300 },
    set: { hand: [C.q, C.four, C.king], top: C.three, under: [c('6', 'D'), C.seven], ...turnOfBot },
  },
  {
    say: 'Clubs now. Play your 4♣.',
    hint: 'Tap the glowing 4♣',
    target: { kind: 'card', ids: [C.four.id] },
    set: { top: c('3', 'C'), under: [C.seven, C.three], bot: 5, botSays: 'played 3♣', ...turnOfMe },
  },
  {
    say: "Raju's turn…",
    target: { kind: 'auto', ms: 1300 },
    set: { hand: [C.q, C.king], top: C.four, under: [C.three, c('3', 'C')], ...turnOfBot },
  },
  {
    say: 'Raju hit you with a 7! A 7 of your own would pass it on (then he picks 4). You have none, so tap Pick 2.',
    target: { kind: 'button', id: 'pick' },
    set: {
      top: c('7', 'C'),
      under: [c('3', 'C'), C.four],
      bot: 4,
      botSays: 'played 7♣',
      banner: 'Pick 2 or play a 7',
      pickLabel: 'Pick 2',
      ...turnOfMe,
      buttons: ['pick'],
    },
  },
  {
    say: 'You picked 2 and miss this turn. Raju plays again.',
    target: { kind: 'auto', ms: 1600 },
    set: { hand: [C.q, C.fiveS, C.eight, C.king], fresh: [C.fiveS.id, C.eight.id], banner: null, deck: 25, ...turnOfBot },
  },
  {
    say: 'A few turns later you have two cards. Before playing your second-last card, tap 📢 Last card, or you get caught.',
    target: { kind: 'button', id: 'call' },
    set: { hand: [C.fiveS, C.fiveD], fresh: [], top: c('5', 'H'), under: [C.four, c('7', 'C')], bot: 3, botSays: null, ...turnOfMe, buttons: ['call'] },
  },
  {
    say: 'Said it! Now play your 5♠.',
    hint: 'Tap the glowing 5♠',
    target: { kind: 'card', ids: [C.fiveS.id] },
    set: { buttons: [], called: true },
  },
  {
    say: "One card left, and you said it in time. Raju's turn…",
    target: { kind: 'auto', ms: 1600 },
    set: { hand: [C.fiveD], top: C.fiveS, under: [c('7', 'C'), c('5', 'H')], ...turnOfBot },
  },
  {
    say: 'Your last card fits. Play it to win!',
    hint: 'Tap your 5♦',
    target: { kind: 'card', ids: [C.fiveD.id] },
    set: { top: c('5', 'C'), under: [c('5', 'H'), C.fiveS], bot: 2, botSays: 'played 5♣', ...turnOfMe },
  },
  {
    say: "You're out of cards: you win! 🎉 The first one out wins Crazy 7. You're ready!",
    target: { kind: 'button', id: 'done' },
    set: { hand: [], top: C.fiveD, under: [C.fiveS, c('5', 'C')], called: false, myTurn: false, buttons: ['done'] },
  },
];

export const LESSONS: Record<GameKind, Step[]> = { bluff: BLUFF, crazy7: CRAZY7 };
