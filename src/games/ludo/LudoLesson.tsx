// Ludo's 1-minute lesson: a few cards with a goti and the dice showing each rule
import '../../styles/land-ludo.css';
import '../../styles/land-ludo-goti.css';
import '../../styles/land-ludo-dice.css';
import '../../styles/land-ludo-over.css';
import { useState } from 'react';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confettiAt } from '../../lib/motion';
import type { LudoColor } from '../../types';
import { Dice } from './Dice';
import { Pawn } from './Gotis';

const STEPS: { title: string; text: string; dice?: number; gotis: LudoColor[]; tag?: string }[] = [
  { title: 'Roll the dice', text: 'On your turn tap the dice. The number is how far one of your gotis moves.', dice: 4, gotis: ['red'] },
  { title: 'A 6 opens a goti', text: 'Every goti starts in its base. Roll a 6 to bring one out onto your start square, and roll again.', dice: 6, gotis: ['red'] },
  { title: 'Tap a glowing goti', text: 'Gotis that can move glow. Hold one to see where it lands, tap to move it.', dice: 3, gotis: ['red', 'red'] },
  { title: 'Knock them off!', text: "Land on another player's goti to send it back to their base, and you roll again. ⭐ Stars and start squares are safe.", dice: 5, gotis: ['red', 'green'], tag: '⚔️ KILL!' },
  { title: 'Race home', text: 'Go round the board, then up your coloured lane to home in the middle. You need the exact number to get in.', dice: 2, gotis: ['red'], tag: '🏠' },
  { title: 'Bonus rolls', text: 'A 6, a kill or a goti home gives another roll. But three 6s in a row lose your turn!', dice: 6, gotis: ['red'], tag: '🎲 +1' },
  { title: "You're ready!", text: 'Get all your gotis home first to win. Pick a mode in the lobby: Classic, Quick, Timed or Master.', gotis: ['red', 'green', 'yellow', 'blue'] },
];

export function LudoLesson({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [seq, setSeq] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const next = (e: React.MouseEvent) => {
    if (last) {
      confettiAt(e.currentTarget, { count: 60, spread: 1.2 });
      onDone();
      return;
    }
    setI(i + 1);
    setSeq((n) => n + 1);
  };
  return (
    <Backdrop center onClose={onClose} panel="lu-lesson">
      <div className="lu-lesson">
        <p className="muted small">
          🎲 Ludo · {i + 1}/{STEPS.length}
        </p>
        <h3>{step.title}</h3>
        <div className="lu-lesson-art" style={{ ['--cell' as string]: '34px', ['--lu-tilt' as string]: '0deg' }}>
          {step.gotis.map((c, k) => (
            <span key={`${i}-${k}`} className={cx('lu-lesson-goti', k === 0 && i === 2 && 'glow')}>
              <Pawn color={c} style="glossy" />
            </span>
          ))}
          {step.dice && <Dice value={step.dice} rollSeq={seq} skin="ivory" live={false} rolling={false} onRoll={() => undefined} />}
          {step.tag && <b className="lu-lesson-tag">{step.tag}</b>}
        </div>
        <p>{step.text}</p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onDone}>
            Skip
          </button>
          <button className="btn primary" onClick={next}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}
