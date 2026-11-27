// Ludo game over: the finish-order podium with fireworks and the kill recap, before the usual coins screen
import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confetti, reducedMotion } from '../../lib/motion';
import { LUDO_COLOR_HEX, type LudoView, type RoomView } from '../../types';
import { Pawn } from './Gotis';

const MEDALS = ['🥇', '🥈', '🥉', '4th'];

interface Props {
  view: RoomView;
  lv: LudoView;
  gotiStyle: string;
  onNext: () => void;
}

export function LudoOver({ view, lv, gotiStyle, onNext }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const people = [...view.players, ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false }))];
  const who = (id: string) => people.find((p) => p.id === id);
  const name = (id: string) => (id === view.meId ? 'You' : (who(id)?.name ?? 'Someone'));
  // finish order; timed mode by points; anyone unplaced after the placed ones
  const order = [...lv.seats].sort((a, b) => {
    if (lv.mode === 'timed') return b.score - a.score;
    return (a.place ?? 99) - (b.place ?? 99) || b.home - a.home;
  });
  const won = (id: string) => view.winnerIds.includes(id);

  // fireworks over the podium: a few bursts in a row
  useEffect(() => {
    if (view.stopped || reducedMotion()) return;
    const timers = [0, 350, 800, 1300, 1900].map((ms, i) =>
      window.setTimeout(() => {
        const r = box.current?.getBoundingClientRect();
        if (!r) return;
        confetti(r.left + r.width * (0.2 + ((i * 0.3) % 0.6)), r.top + r.height * 0.25, { count: 40, spread: 1.3 });
      }, ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <Backdrop center onClose={onNext} panel="lu-over">
      <div ref={box} className="lu-over-box">
        <h2 className="lu-over-title">{view.stopped ? 'Game stopped' : view.winnerIds.includes(view.meId) ? '🏆 You won!' : `🏆 ${name(view.winnerIds[0] ?? '')} won!`}</h2>
        <ol className="lu-podium">
          {order.map((s, i) => {
            const p = who(s.playerId);
            return (
              <li
                key={s.playerId}
                className={cx('lu-step', `at-${i + 1}`, won(s.playerId) && 'won')}
                style={{ '--lu-col': LUDO_COLOR_HEX[s.color], '--i': i } as CSSProperties}
              >
                <span className="lu-step-who">
                  <Avatar name={p?.name ?? '?'} avatar={p?.avatar ?? null} bot={p?.bot} size="sm" />
                  <span className="lu-step-goti" style={{ ['--cell' as string]: '22px' }}>
                    <Pawn color={s.color} style={gotiStyle} />
                  </span>
                </span>
                <b data-no-translate>{name(s.playerId)}</b>
                <span className="lu-step-medal">{won(s.playerId) ? '🥇' : (MEDALS[i] ?? `${i + 1}th`)}</span>
                <small>
                  🏠 {s.home} · ⚔️ {s.kills}
                  {lv.mode === 'timed' ? ` · ⭐ ${s.score}` : ''}
                </small>
                <i className="lu-step-block" />
              </li>
            );
          })}
        </ol>
        <section className="lu-kills">
          <p className="label">⚔️ Kills</p>
          {lv.kills.length === 0 ? (
            <p className="muted small">A peaceful game: nobody was knocked off.</p>
          ) : (
            <ul>
              {lv.kills.map((k, i) => (
                <li key={`${k.at}-${i}`}>
                  <b data-no-translate>{name(k.by)}</b> knocked off <b data-no-translate>{name(k.victim)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
        <button className="btn primary block shine" onClick={onNext}>
          Continue
        </button>
      </div>
    </Backdrop>
  );
}
