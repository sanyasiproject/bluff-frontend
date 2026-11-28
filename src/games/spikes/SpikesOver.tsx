// Spike Attack game over: the survival podium (players out on the same strike share a place) with fireworks and hearts left
import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confetti, reducedMotion } from '../../lib/motion';
import { SPIKES_LIVES, type RoomView, type SpikesView } from '../../types';
import { MEDALS } from '../../lib/common';

interface Props {
  view: RoomView;
  sv: SpikesView;
  order: string[];
  colorOf: (id: string) => string;
  onNext: () => void;
}

export function SpikesOver({ view, sv, order, colorOf, onNext }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const people = [...view.players, ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false }))];
  const who = (id: string) => people.find((p) => p.id === id);
  const name = (id: string) => (id === view.meId ? 'You' : (who(id)?.name ?? 'Someone'));
  // still standing at the end counts as first
  const placeOf = (id: string) => sv.places[id] ?? ((sv.lives[id] ?? 0) > 0 ? 1 : order.length);
  const sorted = [...order].sort((a, b) => placeOf(a) - placeOf(b) || (sv.lives[b] ?? 0) - (sv.lives[a] ?? 0));
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
        ? '🤝 You shared the win!'
        : '🏆 Last one standing: you!'
      : winners.length > 1
        ? `🤝 ${winners.map(name).join(' & ')} shared the win`
        : `🏆 ${name(winners[0] ?? '')} survived!`;

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
                <small>{(sv.lives[id] ?? 0) > 0 ? '❤️'.repeat(sv.lives[id]) : '👻'}</small>
                <i className="lu-step-block" />
              </li>
            );
          })}
        </ol>
        <section className="lu-kills ar-recap">
          <p className="label">🔺 This game</p>
          <ul>
            {sorted.map((id) => {
              const hits = SPIKES_LIVES - Math.max(0, sv.lives[id] ?? 0);
              return (
                <li key={id}>
                  <b data-no-translate>{name(id)}</b>
                  <span>
                    ❤️ {Math.max(0, sv.lives[id] ?? 0)}/{SPIKES_LIVES} · 💥 {hits} {hits === 1 ? 'hit' : 'hits'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
        <button className="btn primary block shine" onClick={onNext}>
          Continue
        </button>
      </div>
    </Backdrop>
  );
}
