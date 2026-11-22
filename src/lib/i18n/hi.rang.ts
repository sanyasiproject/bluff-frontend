import { ORD } from './hi.cards';
import type { Dict, Pattern } from './types';

// Rang table
const COLOR: Record<string, string> = { Red: 'लाल', Blue: 'नीला', Green: 'हरा', Yellow: 'पीला' };
const VALUE: Record<string, string> = { Skip: 'स्किप', Reverse: 'उल्टा', 'Draw 2': '+2', Wild: 'वाइल्ड', 'Wild Draw 4': 'वाइल्ड +4' };
const COLORS = '(Red|Blue|Green|Yellow)';

/** "Red 7" / "Blue Skip" / "Wild Draw 4" in Hindi */
const cardHi = (text: string): string => {
  const m = /^(Red|Blue|Green|Yellow) (.+)$/.exec(text);
  if (m) return `${COLOR[m[1]]} ${VALUE[m[2]] ?? m[2]}`;
  const w = /^(Wild(?: Draw 4)?), (Red|Blue|Green|Yellow)$/.exec(text);
  if (w) return `${VALUE[w[1]]}, ${COLOR[w[2]]}`;
  return VALUE[text] ?? text;
};

export const D: Dict = {
  "⏱ Time's up": '⏱ समय ख़त्म',
  'Ranked by points left: fewest first, equal points share the place': 'बचे अंकों से क्रम: सबसे कम पहले, बराबर अंक वाले बराबर स्थान पर',
  Rang: 'रंग',
  Red: 'लाल',
  Blue: 'नीला',
  Green: 'हरा',
  Yellow: 'पीला',
  Wild: 'वाइल्ड',
  'Wild Draw 4': 'वाइल्ड +4',
  'Pick a colour': 'रंग चुनें',
  'Swap hands with…': 'किससे पत्ते बदलें…',
  'You give them your cards and take theirs.': 'आप अपने पत्ते उन्हें देंगे और उनके ले लेंगे।',
  'Only a +4 can pass it on': 'सिर्फ़ +4 ही इसे आगे बढ़ा सकता है',
  'Only a +2 or +4 can pass it on': 'सिर्फ़ +2 या +4 ही इसे आगे बढ़ा सकता है',
  'Play any card': 'कोई भी पत्ता चलें',
  'Challenge the +4: if they had the colour, they take it back and pick 4; if not, you pick 6':
    '+4 को चुनौती दें: अगर उनके पास वो रंग था तो वो उसे वापस लेंगे और 4 उठाएँगे; नहीं तो आप 6 उठाएँगे',
  'Challenge the +4: if they had the colour, they pick 4; if not, you pick 6':
    '+4 को चुनौती दें: उनके पास वह रंग था तो वे 4 उठाएँगे; नहीं था तो आप 6 उठाएँगे',
  Challenge: 'चुनौती',
  'Play goes clockwise': 'खेल घड़ी की दिशा में चल रहा है',
  'Play goes anticlockwise': 'खेल घड़ी की उल्टी दिशा में चल रहा है',
  'passed hands on': 'सबके पत्ते आगे बढ़ाए',
  reversed: 'दिशा पलटी',
  skipped: 'बारी छूटी',
  passed: 'पास',
  challenged: 'चुनौती दी',
  'fair +4': '+4 सही था',
  caught: 'पकड़े गए',
  missed: 'चूक गए',
  'Stacking on': '+2/+4 जोड़ सकते हैं',
  '7 and 0 swap': '7 और 0 से अदला-बदली',
  '+2/+4 stack': '+2/+4 जोड़ सकते हैं',
  'Challenge +4': '+4 को चुनौती',
  '7-0 swap': '7-0 अदला-बदली',
  'pick again': 'फिर उठाएँ',
  pass: 'पास करें',
  Doubles: 'जोड़ी चाल',
  'Force play': 'उठाओ और चलो',
  'picked & played': 'उठाकर चला',
  'Only this card': 'सिर्फ़ यही पत्ता',
  "Tap a card to add it or leave it out. The last one's colour is next.": 'पत्ता जोड़ने या हटाने के लिए उस पर टैप करें। आख़िरी पत्ते का रंग आगे चलेगा।',
  'Tap a card to add it or leave it out.': 'पत्ता जोड़ने या हटाने के लिए उस पर टैप करें।',
  'Colour next': 'अगला रंग',
  ', added': ', जोड़ा गया',
  ', left out': ', छोड़ा गया',
  '🔵 vs 🟠': '🔵 बनाम 🟠',
};

export const P: Pattern[] = [
  [/^played (\d+)×(?: (\d))?$/, (m) => `${m[2] ? `${m[1]}× ${m[2]}` : `${m[1]}×`} चले`],
  [/^Doubles · (\d)$/, 'जोड़ी चाल · $1'],
  [/^Put down (\d+) together$/, '$1 पत्ते एक साथ चलें'],
  [new RegExp(`^Colour next: ${COLORS}$`), (m) => `अगला रंग: ${COLOR[m[1]]}`],
  [/^(\d+) cards each$/, 'हर किसी को $1 पत्ते'],
  [/^Last card penalty (\d+)$/, 'आख़िरी पत्ता भूलने पर $1'],
  [/^Your team: (blue|orange), with (.+)$/, (m) => `आपकी टीम: ${m[1] === 'blue' ? 'नीली' : 'नारंगी'}, ${m[2] === 'You' ? 'आप' : m[2]} के साथ`],
  [/^Up to (\d+) picks? a turn$/, 'हर बारी $1 तक उठा सकते हैं'],
  [/^up to (\d+) picks? a turn$/, 'हर बारी $1 तक उठा सकते हैं'],
  [/^(.+) must pick (\d+) or stack a \+4$/, '$1 को $2 उठाने होंगे या +4 जोड़ें'],
  [/^(.+) must pick (\d+) or stack a \+2 or \+4$/, '$1 को $2 उठाने होंगे या +2/+4 जोड़ें'],
  [/^missed · \+(\d+)$/, 'भूले · +$1'],
  [/^\+(\d+) · caught$/, '+$1 · पकड़े गए'],
  [/^\+4 back · \+(\d+)$/, '+4 वापस · +$1'],
  [/^((?:\+[24] )+)= (\d+)$/, '$1= $2'],
  [/^\+(\d+) · fair \+4$/, '+$1 · +4 सही था'],
  [/^(1st|2nd|3rd|4th|5th) · (\d+) pts$/, (m) => `${ORD[m[1]]} · ${m[2]} अंक`],
  [/^Lost · (\d+) pts$/, 'हारे · $1 अंक'],
  [/^Pick (\d+) or stack a \+4!?$/, '$1 उठाएँ या +4 जोड़ें'],
  [/^Pick (\d+) or stack a \+2 or \+4!?$/, '$1 उठाएँ या +2/+4 जोड़ें'],
  [/^Pick (\d+) to go on$/, 'आगे बढ़ने के लिए $1 उठाएँ'],
  [/^Only a \+4 now, or pick (\d+)$/, 'अब सिर्फ़ +4, या $1 उठाएँ'],
  [/^Only a \+2 or \+4 now, or pick (\d+)$/, 'अब सिर्फ़ +2 या +4, या $1 उठाएँ'],
  [new RegExp(`^Match ${COLORS}, or play a Wild$`), (m) => `${COLOR[m[1]]} मिलाएँ, या वाइल्ड चलें`],
  [new RegExp(`^Match ${COLORS} or (.+)$`), (m) => `${COLOR[m[1]]} या ${m[2]} मिलाएँ`],
  [new RegExp(`^That card doesn't match ${COLORS} or (.+)$`), (m) => `यह पत्ता ${COLOR[m[1]]} या ${m[2]} से नहीं मिलता`],
  [new RegExp(`^Colour to match: ${COLORS}$`), (m) => `मिलाने का रंग: ${COLOR[m[1]]}`],
  [/^swapped with (.+)$/, '$1 से पत्ते बदले'],
  [/^picks (\d+)$/, '$1 उठाएँगे'],
  [/^you pick (\d+)$/, 'आप $1 उठाएँगे'],
  [/^(\d+) in hand$/, 'हाथ में $1'],
  [/^(\d+) cards$/, '$1 पत्ते'],
  [/^(\d+) left$/, '$1 बचे'],
  [/^(\d+) pts$/, '$1 अंक'],
  [/^A 0 passes every hand on (.)$/, '0 चलने पर सबके पत्ते आगे बढ़ेंगे $1'],
  [/^Missed last card$/, 'आख़िरी पत्ता बोलना भूले'],
  [/^picking (\d+) for you…$/, 'आपके लिए $1 उठा रहे हैं…'],
  [/^(.+) missed last card$/, '$1 आख़िरी पत्ता बोलना भूले'],
  [/^picking (\d+)…$/, '$1 उठा रहे हैं…'],
  [/^(.+), playable$/, (m) => `${cardHi(m[1])}, चल सकते हैं`],
  [/^Top card (.+), (\d+) in the pile$/, (m) => `ऊपर का पत्ता ${cardHi(m[1])}, ढेर में ${m[2]}`],
  [new RegExp(`^${COLORS} (\\d|Skip|Reverse|Draw 2)$`), (m) => cardHi(m[0])],
  [/^Wild(?: Draw 4)?, (Red|Blue|Green|Yellow)$/, (m) => cardHi(m[0])],
];
