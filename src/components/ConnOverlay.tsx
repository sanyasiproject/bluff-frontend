// Connection trouble at a room: the table dims while offline, and a card when the server lost the game
import '../styles/conn.css';
import { useEffect, useMemo, useState } from 'react';
import type { RoomView } from '../types';
import { Backdrop } from './Overlays';

/** a short blip shows nothing; longer than this dims the table */
const SHOW_AFTER_MS = 700;

export function ReconnectOverlay({ show, seated }: { show: boolean; seated: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [show]);
  if (!visible) return null;
  return (
    <div className="conn-dim" role="status" aria-live="polite">
      <div className="conn-card">
        <span className="conn-spin" aria-hidden />
        <b>Reconnecting…</b>
        {seated && <span className="muted small">Your seat is held</span>}
      </div>
    </div>
  );
}

export function LostGameCard({ onHome }: { onHome: () => void }) {
  return (
    <Backdrop center onClose={onHome}>
      <div className="confirm-box">
        <h3>Game couldn't be recovered</h3>
        <p className="muted">The game server restarted and that game couldn't be recovered. No coins moved.</p>
        <div className="confirm-actions">
          <button className="btn primary" onClick={onHome}>
            Back to Home
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

const clock = (ms: number) => {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

/** other players offline mid-game: how long their seat is still held before it forfeits */
export function SeatHeld({ view }: { view: RoomView }) {
  // ms left as of this view, counted on this phone's clock from when it arrived
  const held = useMemo(() => {
    const at = Date.now();
    return view.players
      .filter((p) => p.id !== view.meId && typeof p.seatMsLeft === 'number')
      .map((p) => ({ id: p.id, name: p.name, until: at + (p.seatMsLeft as number) }));
  }, [view]);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!held.length) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [held]);
  if (view.phase !== 'playing' || !held.length) return null;
  return (
    <div className="seat-held" role="status">
      {held.map((h) => (
        <span key={h.id}>{`${h.name} · seat held ${clock(h.until - now)}`}</span>
      ))}
    </div>
  );
}
