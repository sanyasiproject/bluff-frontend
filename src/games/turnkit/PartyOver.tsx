// Party-game game over: a podium in player colours with fireworks, then the usual coins screen
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confetti, reducedMotion } from '../../lib/motion';
import type { RoomView } from '../../types';
import { MEDALS } from '../../lib/common';

interface Props {
  view: RoomView;
  /** players in seat order */
  ids: string[];
  /** 1 = first; ties share */
  placeOf: (id: string) => number;
  colorOf: (id: string) => string;
  /** the small line under each name (score, points left…) */
  line: (id: string) => string;
  /** extra recap under the podium */
  children?: ReactNode;
  onNext: () => void;
}

export function PartyOver({ view, ids, placeOf, colorOf, line, children, onNext }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const people = [...view.players, ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false }))];
  const who = (id: string) => people.find((p) => p.id === id);
  const name = (id: string) => (id === view.meId ? 'You' : (who(id)?.name ?? 'Someone'));
  const order = [...ids].sort((a, b) => placeOf(a) - placeOf(b));
  const top = view.winnerIds.length ? view.winnerIds : order.filter((id) => placeOf(id) === 1);

  useEffect(() => {
    if (view.stopped || reducedMotion()) return;
    const timers = [0, 350, 800, 1300, 1900].map((ms, i) =>
      window.setTimeout(() => {
        const r = box.current?.getBoundingClientRect();
        if (r) confetti(r.left + r.width * (0.2 + ((i * 0.3) % 0.6)), r.top + r.height * 0.22, { count: 40, spread: 1.3 });
      }, ms),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <Backdrop center onClose={onNext} panel="lu-over pt-over">
      <div ref={box} className="lu-over-box">
        <h2 className="lu-over-title">
          {view.stopped ? 'Game stopped' : top.includes(view.meId) ? (top.length > 1 ? '🏆 You share the win!' : '🏆 You won!') : `🏆 ${top.map(name).join(' & ')} won!`}
        </h2>
        <ol className="lu-podium">
          {order.map((id, i) => {
            const p = who(id);
            const pl = placeOf(id);
            return (
              <li key={id} className={cx('lu-step', `at-${Math.min(pl, 4)}`, pl === 1 && 'won')} style={{ '--lu-col': colorOf(id), '--i': i } as CSSProperties}>
                <span className="lu-step-who">
                  <Avatar name={p?.name ?? '?'} avatar={p?.avatar ?? null} bot={p?.bot} size="sm" />
                </span>
                <b data-no-translate>{name(id)}</b>
                <span className="lu-step-medal">{MEDALS[pl - 1] ?? `${pl}th`}</span>
                <small>{line(id)}</small>
                <i className="lu-step-block" />
              </li>
            );
          })}
        </ol>
        {children}
        <button className="btn primary block shine" onClick={onNext}>
          Continue
        </button>
      </div>
    </Backdrop>
  );
}
