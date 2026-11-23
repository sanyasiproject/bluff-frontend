import { compactCoins } from '../coins';
import type { Dict } from './types';

// the room sign's short lines with numbers: stakes, cards dealt, picks a turn
const SIGN: Dict = {};
for (const n of [50, 100, 250, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000]) SIGN[`${compactCoins(n)} each`] = `हर किसी के ${compactCoins(n)}`;
for (const n of [5, 7, 10]) SIGN[`${n} cards`] = `${n} पत्ते`;
for (let n = 1; n <= 7; n++) SIGN[`${n} pick${n > 1 ? 's' : ''}`] = `${n} बार उठाना`;

// new lines from the landscape redesign
export const D: Dict = {
  // lobby settings tabs
  Game: 'गेम',
  Stakes: 'दांव',
  Bots: 'बॉट',
  Extras: 'एक्स्ट्रा',
  Help: 'मदद',
  'Lobby sections': 'लॉबी के हिस्से',
  // a free seat in the players list
  'Open seat': 'खाली सीट',
  // the room at the table: drawer, sheets, sign
  'Table settings': 'टेबल की सेटिंग्स',
  'Only the host can change these': 'इन्हें सिर्फ़ होस्ट बदल सकता है',
  'Invite to room': 'कमरे में बुलाएँ',
  'The link drops them straight into this room.': 'लिंक उन्हें सीधे इस कमरे में ले आता है।',
  'Sit here': 'यहाँ बैठें',
  'The room is full.': 'कमरा भर गया है।',
  ...SIGN,
};
