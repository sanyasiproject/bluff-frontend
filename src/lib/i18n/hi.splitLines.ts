import type { Dict, Pattern } from './types';

// Lines the JSX builds from pieces: Hindi for the pieces and patterns for the joined lines
export const D: Dict = {
  // seat labels beside a big number, and the Ludo kills list (names are their own nodes)
  'checked out': 'पूरा किया',
  box: 'डिब्बा',
  boxes: 'डिब्बे',
  cell: 'खाना',
  cells: 'खाने',
  word: 'शब्द',
  words: 'शब्द',
  'knocked off': 'ने गोटी काटी:',
  // the registry tables' leave and remove confirms (LudoMenus): "<what happens> and it counts as a loss."
  'Your gotis leave the board': 'आपकी गोटियाँ बोर्ड से हट जाएँगी',
  'Their gotis leave the board': 'इनकी गोटियाँ बोर्ड से हट जाएँगी',
  'Your score stops': 'आपका स्कोर रुक जाएगा',
  'Their score stops': 'इनका स्कोर रुक जाएगा',
  'Your marks stay on the board': 'आपके निशान बोर्ड पर रहेंगे',
  'Their marks stay on the board': 'इनके निशान बोर्ड पर रहेंगे',
  'You drop out of the circle': 'आप घेरे से बाहर हो जाएँगे',
  'They drop out of the circle': 'ये घेरे से बाहर हो जाएँगे',
  'Your fleet sinks out of the game': 'आपका बेड़ा गेम से डूब जाएगा',
  'Their fleet leaves the game': 'इनका बेड़ा गेम से हट जाएगा',
  'Leaving resigns the game': 'छोड़ने का मतलब है हार मान लेना',
  'They lose the game': 'ये गेम हार जाएँगे',
  'Your coins stay pocketed': 'आपकी डाली गई गोटियाँ पॉकेट में ही रहेंगी',
  'Their coins stay pocketed': 'इनकी डाली गई गोटियाँ पॉकेट में ही रहेंगी',
  'Your points so far are lost': 'अब तक के आपके अंक चले जाएँगे',
  'Their points so far are lost': 'अब तक के इनके अंक चले जाएँगे',
  'Your chits stop scoring': 'आपकी पर्चियों के अंक रुक जाएँगे',
  'You leave the arena': 'आप मैदान छोड़ देंगे',
  'They leave the arena': 'ये मैदान छोड़ देंगे',
  'Your cells empty out': 'आपके खाने खाली हो जाएँगे',
  'Their cells empty out': 'इनके खाने खाली हो जाएँगे',
  'Your darts come off the board': 'आपके डार्ट बोर्ड से उतर जाएँगे',
  'Their darts come off the board': 'इनके डार्ट बोर्ड से उतर जाएँगे',
  'Your boxes stay on the board': 'आपके डिब्बे बोर्ड पर रहेंगे',
  'Their boxes stay on the board': 'इनके डिब्बे बोर्ड पर रहेंगे',
  'Your stones stay on the board': 'आपके पत्थर बोर्ड पर रहेंगे',
  'Their stones stay on the board': 'इनके पत्थर बोर्ड पर रहेंगे',
};

// unknown parts keep the whole line in English rather than mixing
export const P: Pattern[] = [
  // the "You are Red" banner (colour or piece name)
  [
    /^You are (.+)$/,
    (m, tr) => {
      const what = tr(m[1]);
      return what === m[1] ? m[0] : `आप ${what} हो`;
    },
  ],
  [
    /^(.+) and it counts as a loss(?:; you still pay your 🪙 (.+) stake)?\.$/,
    (m, tr) => {
      const what = tr(m[1]);
      if (what === m[1]) return m[0];
      return `${what} और यह हार मानी जाएगी${m[2] ? `; फिर भी आपको 🪙 ${m[2]} का दांव देना होगा` : ''}।`;
    },
  ],
  [
    /^(.+) and they won't pay or win coins\.$/,
    (m, tr) => {
      const what = tr(m[1]);
      return what === m[1] ? m[0] : `${what} और ये सिक्के न देंगे न जीतेंगे।`;
    },
  ],
];
