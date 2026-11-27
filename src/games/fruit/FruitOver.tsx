// Fruit Slice Duel game over: the score podium (ties share a place) with fireworks and each player's slices, best combo and bombs
import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confetti, reducedMotion } from '../../lib/motion';
import type { FruitView, RoomView } from '../../types';

const MEDALS = ['🥇', '🥈', '🥉', '4th'];

interface Props {
  view: RoomView;
  fv: FruitView;
  order: string[];
  colorOf: (id: string) => string;
  onNext: () => void;
}

export function FruitOver({ view, fv, order, colorOf, onNext }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const people = [...view.players, ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false }))];
  const who = (id: string) => people.find((p) => p.id === id);
  const name = (id: string) => (id === view.meId ? 'You' : (who(id)?.name ?? 'Someone'));
  const score = (id: string) => fv.scores[id] ?? 0;
  const sorted = [...order].sort((a, b) => score(b) - score(a));
  // ties share the place
  const placeOf = (id: string) => 1 + sorted.filter((x) => score(x) > score(id)).length;
  const won = (id: string) => (view.winnerIds.length ? view.winnerIds.includes(id) : placeOf(id) === 1);
  const winners = sorted.filter(won);

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

  const title = view.stopped
    ? 'Game stopped'
    : won(view.meId)
      ? winners.length > 1
        ? '🤝 You tied for first!'
        : '🏆 You won!'
      : winners.length > 1
        ? `🤝 ${winners.map(name).join(' & ')} tied!`
        : `🏆 ${name(winners[0] ?? '')} won!`;

  return (
    <Backdrop center onClose={onNext} panel="lu-over">
      <div ref={box} className="lu-over-box">
        <h2 className="lu-over-title">{title}</h2>
        <ol className="lu-podium">
          {sorted.map((id, i) => {
            const p = who(id);
            const place = placeOf(id);
            return (
              <li key={id} className={cx('lu-step', `at-${Math.min(4, i + 1)}`, won(id) && 'won')} style={{ '--lu-col': colorOf(id), '--i': i } as CSSProperties}>
                <span className="lu-step-who">
                  <Avatar name={p?.name ?? '?'} avatar={p?.avatar ?? null} bot={p?.bot} size="sm" />
                </span>
                <b data-no-translate>{name(id)}</b>
                <span className="lu-step-medal">{MEDALS[place - 1] ?? `${place}th`}</span>
                <small>⭐ {score(id)}</small>
                <i className="lu-step-block" />
              </li>
            );
          })}
        </ol>
        <section className="lu-kills ar-recap">
          <p className="label">🍉 This game</p>
          <ul>
            {sorted.map((id) => (
              <li key={id}>
                <b data-no-translate>{name(id)}</b>
                <span>
                  🍉 {(fv.sliced[id] ?? []).length} · 🔥 {fv.combo[id] ?? 0} · 💣 {fv.bombs[id] ?? 0}
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
