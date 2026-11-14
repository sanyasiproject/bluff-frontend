import '../../styles/tutorial.css';
import { gameName } from '../../lib/tutorial';
import type { GameKind } from '../../types';
import { Backdrop } from '../Overlays';

/** lobby: the first time someone plays this game, the practice lesson is offered once */
export function LessonOffer({ game, onPractice, onSkip }: { game: GameKind; onPractice: () => void; onSkip: () => void }) {
  return (
    <Backdrop center onClose={onSkip}>
      <div className="confirm-box tut-offer">
        <span className="tut-offer-emoji" aria-hidden>
          {game === 'crazy7' ? '7️⃣' : '🃏'}
        </span>
        <h3>First time playing {gameName(game)}?</h3>
        <p className="muted">Learn it in 1 minute with a practice game against Raju 🤖. You can open it again any time from 📘 How to play.</p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onSkip}>
            Skip
          </button>
          <button className="btn primary" onClick={onPractice}>
            Practice now
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
      <p className="muted small">A 1-minute practice game against Raju 🤖, with arrows showing what to tap.</p>
      <div className="tut-choices">
        <button className="option" onClick={() => onPick('bluff')}>
          <b>🃏 Bluff</b>
          <span>Lie about your cards, catch the liars</span>
        </button>
        <button className="option" onClick={() => onPick('crazy7')}>
          <b>7️⃣ Crazy 7</b>
          <span>Match suit or number; a 7 makes the next player pick 2</span>
        </button>
      </div>
      <button className="btn ghost block" onClick={onClose}>
        Close
      </button>
    </Backdrop>
  );
}
