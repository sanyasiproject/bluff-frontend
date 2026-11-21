import type { Dict, Pattern } from './types';
import { claimHi } from './hi.cards';

// Crazy 7 table
export const D: Dict = {
  'Only a 7 can pass it on': 'सिर्फ़ 7 ही इसे आगे बढ़ा सकता है',
  Match: 'मिलाएँ',
  Missed: 'चूक गए',
  'Last card': 'आख़िरी पत्ता',
  'Last card!': 'आख़िरी पत्ता!',
  'Wait for your turn': 'अपनी बारी का इंतज़ार करें',
  "That card can't go now": 'यह पत्ता अभी नहीं चल सकता',
  'Missed last card · picking 1 for you…': 'आख़िरी पत्ता बोलना भूले · आपके लिए 1 उठा रहे हैं…',
  'No matching card · picking one for you…': 'कोई मिलता पत्ता नहीं · आपके लिए एक उठा रहे हैं…',
  'Still no match · your turn passes…': 'अब भी कुछ नहीं मिला · आपकी बारी जा रही है…',
  'No match, we picked one for you': 'कुछ नहीं मिला, आपके लिए एक उठा लिया',
  'Play a glowing card': 'चमकता पत्ता चलें',
  'play a glowing card': 'चमकता पत्ता चलें',
  'Pick a card': 'एक पत्ता उठाएँ',
  'Dealing…': 'पत्ते बँट रहे हैं…',
  next: 'अगला',
  'or play a 7': 'या 7 चलें',
  'a turn': 'हर बारी',
  played: 'चला',
  'Said it': 'बोल दिया',
  'Missed · you pick 1 and skip your next turn': 'चूक गए · आप 1 उठाएँगे और अगली बारी छूटेगी',
  'Say LAST CARD now!': 'अभी आख़िरी पत्ता बोलें!',
  'Last card (say it, then play)': 'आख़िरी पत्ता (बोलें, फिर चलें)',
  'Pick a card ·': 'एक पत्ता उठाएँ ·',
  'Tap a glowing card to play it': 'चलने के लिए चमकते पत्ते पर टैप करें',
  'Remove': 'हटाएँ',
};

const SUIT_HI: Record<string, string> = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };

export const P: Pattern[] = [
  [/^Pick (\d+)!?$/, (m) => `${m[1]} उठाएँ${m[0].endsWith('!') ? '!' : ''}`],
  [/^Pick (\d+) cards, (\d+) left in the deck$/, '$1 पत्ते उठाएँ, गड्डी में $2 बचे'],
  [/^Pick a card, (\d+) left in the deck$/, 'एक पत्ता उठाएँ, गड्डी में $1 बचे'],
  [/^(\d+) cards in the deck$/, 'गड्डी में $1 पत्ते'],
  [/^(.+), (\d+) left in the deck$/, (m, tr) => `${tr(m[1])}, गड्डी में ${m[2]} बचे`],
  [/^Top card (.+), (\d+) in the pile$/, 'ऊपर का पत्ता $1, ढेर में $2'],
  [/^Top card (.+)$/, 'ऊपर का पत्ता $1'],
  [/^played (.+)$/, (m) => `${claimHi(m[1])} चला`],
  [/^Only a 7 now, or pick (\d+)$/, 'अब सिर्फ़ 7, या $1 उठाएँ'],
  [/^Pick (\d+) first$/, 'पहले $1 उठाएँ'],
  [/^That card doesn't match (.) or (\w+)$/, (m) => `यह पत्ता ${SUIT_HI[m[1]] ?? m[1]} या ${m[2]} से नहीं मिलता`],
  [/^(.+) missed last card · picking 1…$/, '$1 आख़िरी पत्ता बोलना भूले · 1 उठा रहे हैं…'],
  [/^Picking (\d+) for you…$/, 'आपके लिए $1 उठा रहे हैं…'],
  [/^(.+) picks (\d+)…$/, '$1 $2 उठा रहे हैं…'],
  [/^(.+) has no match · picking a card…$/, '$1 के पास मिलता पत्ता नहीं · पत्ता उठा रहे हैं…'],
  [/^(.+): still no match · passing…$/, '$1: अब भी कुछ नहीं मिला · पास…'],
  [/^Pick (\d+) or play a 7!?$/, '$1 उठाएँ या 7 चलें'],
  [/^Picked (\d+) of (\d+)$/, '$2 में से $1 उठाए'],
  [/^(.+) must pick (\d+)( or play a 7)?$/, (m) => `${m[1]} को ${m[2]} उठाने होंगे${m[3] ? ' या 7 चलना होगा' : ''}`],
  [/^It counts as a loss and you still pay your 🪙 (.+) stake$/, 'यह हार मानी जाएगी और आपको फिर भी 🪙 $1 का दांव देना होगा'],
];
