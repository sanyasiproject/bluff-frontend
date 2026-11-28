// Forfeits, held seats, server restarts and the error screen
import type { Dict, Pattern } from './types';

export const D: Dict = {
  'Server is restarting, your game will continue in a moment': 'सर्वर रीस्टार्ट हो रहा है, आपका गेम थोड़ी देर में फिर चलेगा',
  'Something went wrong with this game, so it was stopped. No coins moved': 'इस गेम में कुछ गड़बड़ हुई, इसलिए गेम रोका गया। सिक्के नहीं कटे',
  'On staked and ranked tables the game plays to the end': 'दांव और रैंक वाली टेबल पर गेम आख़िर तक चलता है',
  'Your seat is held': 'आपकी सीट रुकी हुई है',
  "Game couldn't be recovered": 'गेम वापस नहीं आ सका',
  "The game server restarted and that game couldn't be recovered. No coins moved.": 'गेम सर्वर रीस्टार्ट हुआ और वह गेम वापस नहीं आ सका। सिक्के नहीं कटे।',
  'Back to Home': 'होम पर वापस',
  Reload: 'फिर से लोड करें',
  'This screen hit a problem. Reload to try again.': 'इस स्क्रीन में दिक्कत आई। फिर से लोड करके देखें।',
  'Stop and forfeit?': 'रोककर हार मानें?',
  'On staked and ranked tables, stopping counts as your forfeit: you lose and the others play on.': 'दांव और रैंक वाली टेबल पर रोकना आपकी हार गिना जाता है: आप हारते हैं और बाकी खेलते रहते हैं।',
  Forfeit: 'हार मानें',
  '⚠️ Engine stopped': '⚠️ इंजन रुक गया',
  '⚠️ Engine unavailable': '⚠️ इंजन नहीं चल रहा',
};

export const P: Pattern[] = [
  [/^(.+) left the game and forfeits it$/, '$1 गेम छोड़ गए, उनकी हार'],
  [/^(.+) was offline too long and forfeits the game$/, '$1 बहुत देर ऑफ़लाइन रहे, उनकी हार'],
  [/^(.+) stopped a staked game, which counts as a forfeit$/, '$1 ने दांव वाला गेम रोका, इसलिए उनकी हार'],
  [/^(.+) · seat held (\d+:\d\d)$/, '$1 · सीट रुकी है $2'],
];
