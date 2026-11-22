import type { Pattern } from './types';
import { CLAIM, ORD, claimHi } from './hi.cards';

const BADGE: Record<string, string> = { Joker: 'जोकर', Murga: 'मुर्गा', Kachua: 'कछुआ', Aloo: 'आलू', Bandar: 'बंदर', Mirchi: 'मिर्ची' };
const and = (s: string) => s.replace(/ and /g, ' और ');

// Rang cards as the server says them ("red seven", "a wild +4"), and the extra sentences after a Rang or power-card play
const RANG_COLOR: Record<string, string> = { red: 'लाल', blue: 'नीला', green: 'हरा', yellow: 'पीला', Red: 'लाल', Blue: 'नीला', Green: 'हरा', Yellow: 'पीला' };
const RANG_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const RANG_CARD = `(a wild \\+4|a wild|(?:red|blue|green|yellow) (?:${RANG_NUM.join('|')}|skip|reverse|\\+2))`;
const SUIT_HI: Record<string, string> = { spades: 'हुकुम', hearts: 'पान', diamonds: 'ईंट', clubs: 'चिड़ी' };
function rangCardHi(text: string): string {
  if (text === 'a wild') return 'वाइल्ड';
  if (text === 'a wild +4') return 'वाइल्ड +4';
  const [color, what] = text.split(' ');
  const n = RANG_NUM.indexOf(what);
  return `${RANG_COLOR[color] ?? color} ${n >= 0 ? n : what === 'skip' ? 'स्किप' : what === 'reverse' ? 'रिवर्स' : what}`;
}
function afterPlayHi(part: string): string {
  let m: RegExpMatchArray | null;
  if ((m = part.match(/^(Red|Blue|Green|Yellow) next$/))) return `अगला रंग ${RANG_COLOR[m[1]]}`;
  if ((m = part.match(/^(.+) is skipped$/))) return `${m[1]} की बारी छूटी`;
  if (part === 'Every hand moves on') return 'सबके पत्ते आगे खिसके';
  if (part === 'Play turns the other way') return 'दिशा उलटी';
  if ((m = part.match(/^(.+) goes again$/))) return `${m[1]} फिर से चलेंगे`;
  if ((m = part.match(/^Next card must be (spades|hearts|diamonds|clubs)$/))) return `अगला पत्ता ${SUIT_HI[m[1]]} का होना चाहिए`;
  if ((m = part.match(/^Pick (\d+)!$/))) return `${m[1]} उठाओ!`;
  return part;
}

// lines the server announces (rooms.ts describe, socket.ts note), and useBluff toasts
export const P: Pattern[] = [
  [new RegExp(`^(.+?) played (?:(two|three|\\d+) × )?${RANG_CARD}( \\(picked and played\\))?(?: and swaps hands with (.+?))?((?:\\. .+)*)$`), (m) => `${m[1]} ने ${m[2] ? `${m[2] === 'two' ? 2 : m[2] === 'three' ? 3 : m[2]} × ` : ''}${rangCardHi(m[3])} ${m[4] ? 'उठाकर ' : ''}चला${m[5] ? ` और ${m[5]} से पत्ते बदले` : ''}${m[6] ? '। ' + m[6].slice(2).split('. ').map(afterPlayHi).join('। ') : ''}`],
  [new RegExp(`^(.+?) played ${CLAIM}((?:\\. (?:Next card must be|Play turns|.+ is skipped|.+ goes again)[^]*))$`), (m) => `${m[1]} ने ${claimHi(m[2])} चला। ${m[3].slice(2).split('. ').map(afterPlayHi).join('। ')}`],
  [/^(.+) challenged the \+4\. Caught! (.+) had the colour, takes the \+4 back and picks (\d+)$/, '$1 ने +4 को चुनौती दी। पकड़ा गया! $2 के पास वो रंग था, +4 वापस लेंगे और $3 उठाएँगे'],
  [/^(.+) challenged the \+4, but it was fair\. (.+) picks (\d+)$/, '$1 ने +4 को चुनौती दी, पर वो सही था। $2 $3 उठाएँगे'],
  [new RegExp(`^(.+) played ${CLAIM} with a Card Shield 🔒$`), (m) => `${m[1]} ने कार्ड शील्ड 🔒 के साथ ${claimHi(m[2])} ${/^(one|1) | of /.test(m[2]) ? 'चला' : 'चले'}`],
  [new RegExp(`^(.+) played ${CLAIM}(?:\\. Pick (\\d+)!)?$`), (m) => `${m[1]} ने ${claimHi(m[2])} ${/^(one|1) | of /.test(m[2]) ? 'चला' : 'चले'}${m[3] ? `। ${m[3]} उठाओ!` : ''}`],
  [/^(.+) passed$/, '$1 ने पास किया'],
  [/^Time's up! (.+) wins with (\d+) points$/, 'समय ख़त्म! $1 $2 अंकों के साथ जीते'],
  [/^Time's up! (.+) share first with (\d+) points$/, (m) => `समय ख़त्म! ${and(m[1])} ${m[2]} अंकों के साथ बराबर पहले नंबर पर`],
  [/^Time's up! (.+) (?:win|all share it) with the fewest points$/, (m) => `समय ख़त्म! सबसे कम अंकों के साथ ${and(m[1])} जीते`],
  [/^(.+) called bluff\. Caught! (.+) picks up (\d+) cards(?:\. (.+) pays (\d+) coins)?$/, (m) => `${m[1]} ने Bluff बोला। पकड़ा गया! ${m[2]} ${m[3]} पत्ते उठाएँगे${m[4] ? `। ${m[4]} ${m[5]} सिक्के देंगे` : ''}`],
  [/^(.+) called bluff\. It was true! (.+) picks up (\d+) cards(?:\. (.+) pays (\d+) coins)?$/, (m) => `${m[1]} ने Bluff बोला। सच था! ${m[2]} ${m[3]} पत्ते उठाएँगे${m[4] ? `। ${m[4]} ${m[5]} सिक्के देंगे` : ''}`],
  [/^Everyone passed\. (.+) starts a new round$/, 'सबने पास किया। $1 नया राउंड शुरू करेंगे'],
  [/^(.+) starts a new round$/, '$1 नया राउंड शुरू करेंगे'],
  [/^(.+) finished (1st|2nd|3rd|4th|5th)$/, (m) => `${m[1]} ${ORD[m[2]]} नंबर पर रहे`],
  [/^Game stopped, a team lost a player\. No coins moved$/, 'गेम रुका, एक टीम का खिलाड़ी चला गया। सिक्के नहीं कटे'],
  [/^Game stopped, not enough players left\. No coins moved$/, 'गेम रुका, खिलाड़ी कम बचे। सिक्के नहीं कटे'],
  [/^The host ended the game\. (.+) wins?$/, (m) => `होस्ट ने गेम ख़त्म किया। ${and(m[1])} जीते`],
  [/^Game over\. Only bots are left playing(?:\. (.+) wins)?$/, (m) => `गेम ख़त्म। सिर्फ़ बॉट बचे${m[1] ? `। ${m[1]} जीते` : ''}`],
  [/^Game over\. (.+) is the loser(?:\. Biggest liar: (.+))?$/, (m) => `गेम ख़त्म। ${m[1]} हारे${m[2] ? `। सबसे बड़ा झूठा: ${and(m[2])}` : ''}`],
  [/^Game over\. Biggest liar: (.+)$/, (m) => `गेम ख़त्म। सबसे बड़ा झूठा: ${and(m[1])}`],
  [/^Nobody can play and the deck is empty\. (.+) wins with the fewest cards$/, 'कोई चल नहीं सकता और गड्डी ख़ाली है। सबसे कम पत्तों के साथ $1 जीते'],
  [/^Game over\. (.+) wins?$/, (m) => `गेम ख़त्म। ${and(m[1])} जीते`],
  [/^(.+) picks (\d+) and misses a turn$/, '$1 $2 उठाएँगे और एक बारी जाएगी'],
  [/^(.+) picks (\d+)$/, '$1 $2 उठाएँगे'],
  [/^(.+): last card!$/, '$1: आख़िरी पत्ता!'],
  [/^Caught! (.+) didn't say last card$/, 'पकड़ा गया! $1 ने आख़िरी पत्ता नहीं बोला'],
  [/^The pile was shuffled into a new deck$/, 'ढेर को फेंटकर नई गड्डी बनी'],
  [/^(.+) had no match and passed$/, '$1 के पास मिलता पत्ता नहीं था, पास किया'],
  [/^(.+) won and the saza comes off!$/, '$1 जीते और saza उतर गई!'],
  [/^(.+) gets the (\w+) saza (.+)$/, (m) => `${m[1]} को ${BADGE[m[2]] ?? m[2]} saza मिली ${m[3]}`],
  [/^(.+) gave (.+) the (\w+) saza (.+)$/, (m) => `${m[1]} ने ${m[2]} को ${BADGE[m[3]] ?? m[3]} saza दी ${m[4]}`],
  [/^(.+) used a peek 🔍$/, '$1 ने झाँका 🔍'],
  [/^(Game started|Rematch)\. (.+) goes first(?:\. Pot: (.+) coins)?$/, (m) => `${m[1] === 'Rematch' ? 'फिर से गेम' : 'गेम शुरू'}। पहले ${m[2]} चलेंगे${m[3] ? `। कुल दांव: ${m[3]} सिक्के` : ''}`],
  [/^(.+) is watching$/, '$1 देख रहे हैं'],
  [/^(.+) is playing$/, '$1 खेल रहे हैं'],
  [/^(.+) left the game$/, '$1 ने गेम छोड़ा'],
  [/^(.+) left$/, '$1 चले गए'],
  [/^🏅 (.+) made this a ranked game$/, '🏅 $1 ने इसे रैंक्ड गेम बनाया'],
  [/^🎮 (.+) made this a casual game$/, '🎮 $1 ने इसे कैज़ुअल गेम बनाया'],
  [/^(.+) stopped the game\. No coins moved$/, '$1 ने गेम रोका। सिक्के नहीं कटे'],
  [/^(.+) moved (.+) to (watching|playing)$/, (m) => `${m[1]} ने ${m[2]} को ${m[3] === 'watching' ? 'दर्शक' : 'खिलाड़ी'} बनाया`],
  [/^(.+) added (.+) 🤖$/, '$1 ने $2 🤖 को जोड़ा'],
  [/^(.+) and (.+) swapped places$/, '$1 और $2 ने जगह बदली'],
  [/^(.+) asked (.+) to swap places$/, '$1 ने $2 से जगह बदलने को कहा'],
  [/^(.+) said no to swapping$/, '$1 ने जगह बदलने से मना किया'],
  [/^(.+) shuffled the teams$/, '$1 ने टीमें मिलाईं'],
  [/^(.+) made (.+) the host$/, '$1 ने $2 को होस्ट बनाया'],
  [/^(.+) was removed by the host$/, 'होस्ट ने $1 को हटाया'],
  [/^Stake lowered to (.+) for (\w+) bots$/, '$2 बॉट के लिए दांव घटाकर $1 किया'],
  [/^(\w+) bots play only free games, so this game is now free$/, '$1 बॉट सिर्फ़ फ़्री गेम खेलते हैं, इसलिए यह गेम अब फ़्री है'],
  // useBluff toasts
  [/^(.+) didn't let you into room ([A-Z]{4}) this time$/, '$1 ने इस बार आपको कमरा $2 में नहीं आने दिया'],
  [/^🎁 (.+) sent you 🪙 (.+)$/, '🎁 $1 ने आपको 🪙 $2 भेजे'],
  [/^You were removed from room ([A-Z]{4}) by the host$/, 'होस्ट ने आपको कमरा $1 से हटा दिया'],
];
