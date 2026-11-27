// Saanp Seedhi game over: the finish-order podium with fireworks and each player's ladders, snakes and bites
import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confetti, reducedMotion } from '../../lib/motion';
import { LUDO_COLOR_HEX, type LudoColor, type RoomView, type SnakesView } from '../../types';
import { Pawn } from '../ludo/Gotis';

const MEDALS = ['🥇', '🥈', '🥉', '4th'];

interface Props {
  view: RoomView;
  sv: SnakesView;
  styleOf: (id: string) => string;
  onNext: () => void;
}

export function SnakesOver({ view, sv, styleOf, onNext }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const people = [...view.players, ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false }))];
  const who = (id: string) => people.find((p) => p.id === id);
  const name = (id: string) => (id === view.meId ? 'You' : (who(id)?.name ?? 'Someone'));
  const order = [...sv.seats].sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || b.pos - a.pos);
  const won = (id: string) => view.winnerIds.includes(id);

  // fireworks over the podium
  useEffect(() => {
    if (view.stopped || reducedMotion()) return;
    const timers = [0, 350, 800, 1300, 1900].map((ms, i) =>
      window.setTimeout(() => {
        const r = box.current?.getBoundingClientRect();
        if (r) confetti(r.left + r.width * (0.2 + ((i * 0.3) % 0.6)), r.top + r.height * 0.25, { count: 40, spread: 1.3 });
      }, ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <Backdrop center onClose={onNext} panel="lu-over">
      <div ref={box} className="lu-over-box">
        <h2 className="lu-over-title">{view.stopped ? 'Game stopped' : won(view.meId) ? '🏆 You won!' : `🏆 ${name(view.winnerIds[0] ?? '')} won!`}</h2>
        <ol className="lu-podium">
          {order.map((s, i) => {
            const p = who(s.playerId);
            return (
              <li key={s.playerId} className={cx('lu-step', `at-${i + 1}`, won(s.playerId) && 'won')} style={{ '--lu-col': LUDO_COLOR_HEX[s.color as LudoColor], '--i': i } as CSSProperties}>
                <span className="lu-step-who">
                  <Avatar name={p?.name ?? '?'} avatar={p?.avatar ?? null} bot={p?.bot} size="sm" />
                  <span className="lu-step-goti" style={{ ['--cell' as string]: '22px' }}>
                    <Pawn color={s.color as LudoColor} style={styleOf(s.playerId)} />
                  </span>
                </span>
                <b data-no-translate>{name(s.playerId)}</b>
                <span className="lu-step-medal">{won(s.playerId) ? '🥇' : (MEDALS[i] ?? `${i + 1}th`)}</span>
                <small>{s.place ? '🏁 100' : `📍 ${s.pos}`}</small>
                <i className="lu-step-block" />
              </li>
            );
          })}
        </ol>
        <section className="lu-kills sn-recap">
          <p className="label">🪜 🐍 This game</p>
          <ul>
            {order.map((s) => (
              <li key={s.playerId}>
                <b data-no-translate>{name(s.playerId)}</b>
                <span>
                  🪜 {s.ladders} · 🐍 {s.snakes} · 🦷 {s.bites}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <button className="btn primary block shine" onClick={onNext}>
          Continue
        </button>
      </div>
    </Backdrop>
  );
}
