// A registry game's rules as a short sheet, offered instead of a practice lesson (Saanp Seedhi, Raja Mantri)
import { Backdrop } from '../components/Overlays';
import { gameInfo, type PluggedKind } from '../types';
import { PLUGGED } from './registry';

export function RulesSheet({ game, onDone, onClose }: { game: PluggedKind; onDone: () => void; onClose: () => void }) {
  const info = gameInfo(game);
  const Rules = PLUGGED[game].Rules;
  return (
    <Backdrop center onClose={onClose}>
      <div className="confirm-box tut-offer rules-sheet">
        <span className="tut-offer-emoji" aria-hidden>
          {info.emoji}
        </span>
        <h3>{`How to play ${info.name}`}</h3>
        <div className="muted small rules-sheet-body">{Rules ? <Rules /> : <p>{info.tagline}</p>}</div>
        <button className="btn primary block" onClick={onDone}>
          Got it
        </button>
      </div>
    </Backdrop>
  );
}
