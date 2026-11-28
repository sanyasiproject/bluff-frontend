import type { Dict, Pattern } from './types';

// Offline pass-and-play: Home entry, setup screen, pass-the-phone banner, game over
export const D: Dict = {
  '📴 Play offline (one phone)': '📴 ऑफ़लाइन खेलें (एक फ़ोन)',
  '📴 Resume offline game': '📴 ऑफ़लाइन खेल जारी रखें',
  'No internet? Play on this phone': 'इंटरनेट नहीं? इसी फ़ोन पर खेलें',
  '📴 Play offline': '📴 ऑफ़लाइन खेलें',
  'No coins, XP or ratings': 'कोई सिक्के, XP या रेटिंग नहीं',
  'no coins, XP or ratings': 'कोई सिक्के, XP या रेटिंग नहीं',
  '📴 Offline ·': '📴 ऑफ़लाइन ·',
  '📴 Offline game · no coins, XP or ratings': '📴 ऑफ़लाइन खेल · कोई सिक्के, XP या रेटिंग नहीं',
  Players: 'खिलाड़ी',
  '➕ Person': '➕ व्यक्ति',
  '🤖 Computer': '🤖 कंप्यूटर',
  'At least one person must play.': 'कम से कम एक व्यक्ति को खेलना होगा।',
  'Pass the phone between turns · works with no internet': 'हर बारी पर फ़ोन आगे दें · बिना इंटरनेट के चलता है',
  '▶ Start': '▶ शुरू करें',
  '👥 Teams': '👥 टीमें',
  'Partners sit opposite and win together': 'साथी आमने-सामने बैठते हैं और साथ जीतते हैं',
  '🔄 Turn the board': '🔄 बोर्ड घुमाएँ',
  'The board faces whoever moves': 'बोर्ड चाल चलने वाले की ओर घूमता है',
  'White stays at the bottom': 'सफ़ेद नीचे ही रहता है',
  'No options for this game.': 'इस खेल के लिए कोई विकल्प नहीं।',
  'Pass the phone': 'फ़ोन आगे दें',
  "'s turn": ' की बारी',
  '👥 Change players': '👥 खिलाड़ी बदलें',
  'Swap colour': 'रंग बदलें',
  'Remove seat': 'सीट हटाएँ',
  'Computer level': 'कंप्यूटर का स्तर',
  '🤖 Normal': '🤖 नॉर्मल',
  '🤖 Hard': '🤖 कठिन',
  '🤖 Expert': '🤖 एक्सपर्ट',
  'Classic carrom is for 2 or 4 players (2v2). Pick Freestyle for 3': 'क्लासिक कैरम 2 या 4 खिलाड़ियों (2v2) के लिए है। 3 के लिए फ़्रीस्टाइल चुनें',
  'At least one person must play': 'कम से कम एक व्यक्ति को खेलना होगा',
  'Teams need exactly 4 players': 'टीमों के लिए ठीक 4 खिलाड़ी चाहिए',
};

export const P: Pattern[] = [
  [/^🤖 Level (\d)$/, '🤖 स्तर $1'],
  [/^Player (\d)$/, 'खिलाड़ी $1'],
];
