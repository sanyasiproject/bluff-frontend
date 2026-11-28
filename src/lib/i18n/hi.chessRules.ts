import type { Dict, Pattern } from './types';

// Chess: rules (basics, each variant, diagram notes) and Profile → Chess
export const D: Dict = {
  '2 players, White moves first. Tap a piece, then a square (or drag it). Dots show where it can go, rings show captures.':
    '2 खिलाड़ी, पहली चाल सफ़ेद की। मोहरा टैप करें, फिर खाना (या खींचें)। बिंदु बताते हैं कहाँ जा सकता है, घेरे बताते हैं क्या कट सकता है।',
  'Checkmate wins: the king is attacked and has no way out. Stalemate, not enough pieces to mate, the same position three times and 50 moves without a capture or pawn move are draws.':
    'शह-मात से जीत: राजा पर हमला है और बचने का रास्ता नहीं। स्टेलमेट, मात देने लायक मोहरे न होना, एक ही स्थिति तीन बार और 50 चालें बिना कटौती या प्यादे की चाल ड्रॉ हैं।',
  'Clocks: each side has its own time and gets the increment after every move (5+3 = 5 minutes, +3 seconds a move). Run out of time and you lose.':
    'घड़ी: हर पक्ष का अपना समय है और हर चाल के बाद बढ़त मिलती है (5+3 = 5 मिनट, हर चाल +3 सेकंड)। समय ख़त्म तो हार।',
  'Before both sides have moved, a player can abort: nobody wins. You can offer a draw; in casual games you can ask for a takeback.':
    'दोनों के चलने से पहले खिलाड़ी गेम रद्द कर सकता है: कोई नहीं जीतता। आप ड्रॉ का प्रस्ताव दे सकते हैं; दोस्ताना गेम में चाल वापसी माँग सकते हैं।',
  'Rated games need two logged-in players on a clock. Everyone starts at 800; a "?" means the rating is still settling.':
    'रेटेड गेम के लिए घड़ी के साथ दो लॉग-इन खिलाड़ी चाहिए। सब 800 से शुरू करते हैं; "?" का मतलब रेटिंग अभी पक्की नहीं हुई।',
  'Normal chess with every rule: castling, en passant and promotion.': 'सारे नियमों वाला साधारण शतरंज: कैसलिंग, एन पासां और प्रमोशन।',
  'The back rank is shuffled (one of 960 starts), the same for both sides. Bishops stay on opposite colours and the king starts between the rooks.':
    'पीछे की पंक्ति फेंटी जाती है (960 में से एक शुरुआत), दोनों तरफ़ एक जैसी। ऊँट अलग-अलग रंग पर रहते हैं और राजा दोनों हाथियों के बीच शुरू होता है।',
  'Castling ends with the king and rook on their usual squares (g and f, or c and d). Tap the king, then its rook or its landing square.':
    'कैसलिंग के बाद राजा और हाथी अपने आम खानों पर (g और f, या c और d)। राजा टैप करें, फिर उसका हाथी या पहुँचने का खाना।',
  'Every piece you capture joins your pocket, in your colour. On your turn you may drop it on any empty square instead of moving.':
    'आप जो मोहरा काटते हैं वह आपके रंग में आपकी जेब में आता है। अपनी बारी पर चलने के बजाय उसे किसी भी खाली खाने पर रख सकते हैं।',
  'Pawns cannot be dropped on the first or last rank. A promoted piece goes back to the pocket as a pawn. Drops can block a check.':
    'प्यादे पहली या आख़िरी पंक्ति पर नहीं रखे जा सकते। प्रमोट हुआ मोहरा कटने पर प्यादा बनकर जेब में जाता है। रखा गया मोहरा शह रोक सकता है।',
  'Normal chess, but bring your king to one of the four centre squares (d4, e4, d5, e5) and you win at once.':
    'साधारण शतरंज, पर राजा को बीच के चार खानों (d4, e4, d5, e5) में से किसी पर लाओ और तुरंत जीतो।',
  'Normal chess, but giving check for the third time wins. The marks by each player count the checks given.':
    'साधारण शतरंज, पर तीसरी बार शह देने वाला जीतता है। हर खिलाड़ी के पास के निशान दी गई शह गिनते हैं।',
  'Lose all your pieces (or get stalemated) to win. If you can capture, you must.': 'सारे मोहरे खोकर (या स्टेलमेट होकर) जीतो। काट सकते हो तो काटना ही पड़ेगा।',
  'The king is an ordinary piece: no check, no castling, and a pawn can promote to a king.': 'राजा आम मोहरा है: शह नहीं, कैसलिंग नहीं, और प्यादा राजा भी बन सकता है।',
  'A capture explodes: the capturing and captured pieces and every piece except pawns on the 8 squares around are removed. Blow up the enemy king to win.':
    'कटौती पर धमाका: काटने और कटने वाला मोहरा और आसपास के 8 खानों के प्यादों को छोड़ सारे मोहरे हट जाते हैं। दुश्मन राजा को उड़ाकर जीतो।',
  'Kings cannot capture. Kings may stand next to each other, and then neither can be checked.': 'राजा काट नहीं सकते। राजा पास-पास खड़े हो सकते हैं, और तब किसी को शह नहीं लगती।',
  'White has 36 pawns and no king; Black has a normal army. Black wins by capturing every white piece, White wins by checkmate.':
    'सफ़ेद के 36 प्यादे हैं और राजा नहीं; काले के पास पूरी सेना। काला सारे सफ़ेद मोहरे काटकर जीतता है, सफ़ेद शह-मात से।',
  "White's pawns on the first rank may also move two squares.": 'पहली पंक्ति के सफ़ेद प्यादे भी दो खाने चल सकते हैं।',
  'Both sides start on the first two ranks. Race your king to the 8th rank to win. Giving check is not allowed at all.':
    'दोनों पक्ष पहली दो पंक्तियों पर शुरू करते हैं। राजा को 8वीं पंक्ति तक दौड़ाकर जीतो। शह देना बिल्कुल मना है।',
  'If White gets there first and Black can reach the 8th rank on the very next move, the game is a draw.':
    'अगर सफ़ेद पहले पहुँचे और काला अगली ही चाल में 8वीं पंक्ति पहुँच सके, तो ड्रॉ।',
  'The Italian Game: the bishop eyes f7': 'इटालियन गेम: ऊँट की नज़र f7 पर',
  'One of the 960 shuffled starts': '960 फेंटी शुरुआतों में से एक',
  'Each side now holds a pawn to drop': 'अब दोनों के पास रखने को एक प्यादा है',
  'The marked centre squares are the hill': 'बीच के निशान वाले खाने पहाड़ी हैं',
  'Check number one: two more to win': 'पहली शह: जीत के लिए दो और',
  'White can capture, so White must': 'सफ़ेद काट सकता है, इसलिए काटना ही होगा',
  'Nxf7 blows up the king next door': 'Nxf7 बगल के राजा को उड़ा देता है',
  '36 pawns against a full army': '36 प्यादे बनाम पूरी सेना',
  'The striped rank is the finish line': 'धारियों वाली पंक्ति फ़िनिश लाइन है',
  // Profile → Chess
  'Log in to keep chess ratings, your games and a place on the leaderboard.': 'शतरंज रेटिंग, अपने गेम और लीडरबोर्ड पर जगह के लिए लॉग इन करें।',
  peak: 'शिखर',
  games: 'गेम',
  won: 'जीते',
  lost: 'हारे',
  drawn: 'ड्रॉ',
  streak: 'लगातार',
  'best streak': 'सबसे लंबी जीत',
  '"?" means the rating is still settling: a few more rated games fix it.': '"?" का मतलब रेटिंग अभी पक्की नहीं: कुछ और रेटेड गेम से पक्की होगी।',
  '🕘 Recent games': '🕘 हाल के गेम',
  'No chess games yet. Finished games show here; tap one to analyse it.': 'अभी कोई शतरंज गेम नहीं। पूरे हुए गेम यहाँ दिखेंगे; विश्लेषण के लिए टैप करें।',
  'Your rating is still settling ("?"): play a few more rated games to be ranked': 'आपकी रेटिंग अभी पक्की नहीं ("?"): रैंक के लिए कुछ और रेटेड गेम खेलें',
  'Play a rated game to be ranked': 'रैंक के लिए एक रेटेड गेम खेलें',
  'Nobody is ranked here yet.': 'यहाँ अभी किसी की रैंक नहीं।',
  'Play rated games to draw your graph': 'अपना ग्राफ़ बनाने के लिए रेटेड गेम खेलें',
  '♟️ Chess': '♟️ शतरंज',
};

export const P: Pattern[] = [
  [/^🏆 (.+) top 50$/, (m, tr) => `🏆 ${tr(m[1])} टॉप 50`],
  [/^You are #(\d+)$/, 'आप #$1 पर हैं'],
  [/^low (\d+) · peak (\d+) · now (\d+)$/, 'न्यूनतम $1 · शिखर $2 · अभी $3'],
];
