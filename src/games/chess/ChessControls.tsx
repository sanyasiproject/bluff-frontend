// The buttons under the move list: resign (with a confirm), draw, takeback, abort, flip and sound; offers to answer
import { useState } from 'react';
import { ConfirmBox } from '../../components/ConfirmBox';
import { cx } from '../../lib/cards';
import { isSoundOn, setSoundOn } from '../../lib/speech';
import type { ChessMoveInput, ChessView, Color } from './lib';

interface Props {
  cv: ChessView;
  myColor: Color | null;
  live: boolean;
  send: (m: ChessMoveInput) => void;
  onFlip: () => void;
}

export function ChessControls({ cv, myColor, live, send, onFlip }: Props) {
  const [ask, setAsk] = useState<'resign' | 'abort' | null>(null);
  const [sound, setSound] = useState(isSoundOn());
  const them = myColor === 'w' ? 'b' : 'w';
  const canAbort = live && cv.moves.length < 2;
  const theirDraw = live && cv.drawOffer === them;
  const myDraw = live && cv.drawOffer === myColor;
  const theirBack = live && cv.takebackOffer === them;
  const myBack = live && cv.takebackOffer === myColor;
  const canBack = live && !cv.rated && cv.moves.length > 0 && !cv.takebackOffer;
  return (
    <div className="ch-controls">
      {theirDraw && (
        <div className="ch-offer" role="alert">
          <span>🤝 Draw offered</span>
          <button className="btn small primary" onClick={() => send({ type: 'draw', offer: true })}>Accept</button>
          <button className="btn small ghost" onClick={() => send({ type: 'draw', offer: false })}>Decline</button>
        </div>
      )}
      {theirBack && (
        <div className="ch-offer" role="alert">
          <span>↩️ Takeback asked</span>
          <button className="btn small primary" onClick={() => send({ type: 'takeback', accept: true })}>Allow</button>
          <button className="btn small ghost" onClick={() => send({ type: 'takeback', accept: false })}>No</button>
        </div>
      )}
      <div className="ch-btns">
        {myColor && live && (canAbort ? (
          <button type="button" className="ch-btn" onClick={() => setAsk('abort')}>
            <span aria-hidden>✖️</span>Abort
          </button>
        ) : (
          <button type="button" className="ch-btn danger" onClick={() => setAsk('resign')}>
            <span aria-hidden>🏳️</span>Resign
          </button>
        ))}
        {myColor && live && !canAbort && (
          <button type="button" className={cx('ch-btn', myDraw && 'on')} disabled={myDraw || theirDraw} onClick={() => send({ type: 'draw', offer: true })}>
            <span aria-hidden>½</span>
            {myDraw ? 'Offered' : 'Draw'}
          </button>
        )}
        {myColor && live && !cv.rated && (
          <button type="button" className={cx('ch-btn', myBack && 'on')} disabled={!canBack} onClick={() => send({ type: 'takeback' })}>
            <span aria-hidden>↩️</span>
            {myBack ? 'Asked' : 'Takeback'}
          </button>
        )}
        <button type="button" className="ch-btn" aria-label="Flip the board" onClick={onFlip}>
          <span aria-hidden>🔃</span>Flip
        </button>
        <button type="button" className={cx('ch-btn', !sound && 'off')} aria-pressed={sound} onClick={() => (setSoundOn(!sound), setSound(!sound))}>
          <span aria-hidden>{sound ? '🔊' : '🔇'}</span>Sound
        </button>
      </div>
      {ask === 'resign' && (
        <ConfirmBox title="Resign this game?" body="Your opponent wins." action="Resign" onConfirm={() => (send({ type: 'resign' }), setAsk(null))} onCancel={() => setAsk(null)} />
      )}
      {ask === 'abort' && (
        <ConfirmBox title="Abort this game?" body="Nobody wins and ratings don't change." action="Abort" onConfirm={() => (send({ type: 'abort' }), setAsk(null))} onCancel={() => setAsk(null)} />
      )}
    </div>
  );
}
