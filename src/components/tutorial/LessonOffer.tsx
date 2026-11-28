import '../../styles/tutorial.css';
import { gameName } from '../../lib/tutorial';
import { gameInfo, isPlugged, type GameKind } from '../../types';
import { Backdrop } from '../Overlays';

/** lobby: the first time someone plays this game, the practice lesson is offered once */
export function LessonOffer({ game, onPractice, onSkip }: { game: GameKind; onPractice: () => void; onSkip: () => void }) {
  // registry games other than Ludo have a rules sheet, not a practice game
  const sheetOnly = isPlugged(game) && game !== 'ludo';
  return (
    <Backdrop center onClose={onSkip} panel="tut-offer-modal">
      <div className="confirm-box tut-offer">
        <span className="tut-offer-emoji" aria-hidden>
          {gameInfo(game).emoji}
        </span>
        <h3>First time playing {gameName(game)}?</h3>
        <p className="muted">{game === 'ludo' ? 'Learn it in 1 minute: a short walk round the board.' : sheetOnly ? 'The rules in 30 seconds.' : 'Learn it in 1 minute with a practice game against Raju 🤖.'}{' '}You can open it again any time from 📘 How to play.</p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onSkip}>
            Skip
          </button>
          <button className="btn primary" onClick={onPractice}>
            {sheetOnly ? 'Show the rules' : 'Practice now'}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

/** Home: pick which lesson to open */
export function LessonChooser({ onPick, onClose }: { onPick: (game: GameKind) => void; onClose: () => void }) {
  return (
    <Backdrop onClose={onClose}>
      <h3>📘 How to play</h3>
      <p className="muted small">Pick a game: a 1-minute practice round, or its rules in 30 seconds.</p>
      <div className="tut-choices">
        <button className="option" onClick={() => onPick('bluff')}>
          <b>🃏 Bluff</b>
          <span>Lie about your cards, catch the liars</span>
        </button>
        <button className="option" onClick={() => onPick('crazy7')}>
          <b>7️⃣ Crazy 7</b>
          <span>Match suit or number; a 7 makes the next player pick 2</span>
        </button>
        <button className="option" onClick={() => onPick('ludo')}>
          <b>🎲 Ludo</b>
          <span>Roll, race and knock gotis home</span>
        </button>
        <button className="option" onClick={() => onPick('snakes')}>
          <b>🐍 Saanp Seedhi</b>
          <span>Climb the ladders, dodge the snakes</span>
        </button>
        <button className="option" onClick={() => onPick('rmcs')}>
          <b>👑 Raja Mantri Chor Sipahi</b>
          <span>Find the Chor before he gets away</span>
        </button>
        <button className="option" onClick={() => onPick('darts')}>
          <b>🎯 Darts</b>
          <span>Count down from 301, land exactly on zero</span>
        </button>
        <button className="option" onClick={() => onPick('dots')}>
          <b>⬛ Dots and Boxes</b>
          <span>Draw lines, close boxes, steal the board</span>
        </button>
        <button className="option" onClick={() => onPick('colorwar')}>
          <b>🎨 Colour Wars</b>
          <span>Grow dots, burst and take over the board</span>
        </button>
        <button className="option" onClick={() => onPick('fruit')}>
          <b>🍉 Fruit Slice Duel</b>
          <span>Fastest sword takes the fruit. Never cut the magnet!</span>
        </button>
        <button className="option" onClick={() => onPick('spikes')}>
          <b>🔺 Spike Attack</b>
          <span>Dodge the spikes, keep your 3 lives</span>
        </button>
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
