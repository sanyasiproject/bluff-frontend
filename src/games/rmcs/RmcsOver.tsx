// Raja Mantri game over: the ranking podium with fireworks and every round's chits, before the usual coins screen
import { useEffect, useRef, type CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { confetti, reducedMotion } from '../../lib/motion';
import { RMCS_EMOJI, type RmcsView, type RoomView } from '../../types';
import { MEDALS } from '../../lib/common';

const COLS = ['#ffb300', '#8e24aa', '#26a69a', '#ef5350'];

interface Props {
  view: RoomView;
  rv: RmcsView;
  /** players in seat order */
  ids: string[];
  onNext: () => void;
}

export function RmcsOver({ view, rv, ids, onNext }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const people = [...view.players, ...view.leftPlayers.map((p) => ({ ...p, avatar: null, bot: false }))];
  const who = (id: string) => people.find((p) => p.id === id);
  const name = (id: string) => (id === view.meId ? 'You' : (who(id)?.name ?? 'Someone'));
  const score = (id: string) => rv.scores[id] ?? 0;
  const order = [...ids].sort((a, b) => score(b) - score(a));
  // ties share the place
  const place = (id: string) => 1 + ids.filter((o) => score(o) > score(id)).length;
  const top = view.winnerIds.length ? view.winnerIds : order.filter((id) => place(id) === 1);

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
    <Backdrop center onClose={onNext} panel="lu-over rm-over">
      <div ref={box} className="lu-over-box">
        <h2 className="lu-over-title">
          {view.stopped ? 'Game stopped' : top.includes(view.meId) ? '👑 You won!' : `👑 ${top.map(name).join(' & ')} won!`}
        </h2>
        <ol className="lu-podium">
          {order.map((id, i) => {
            const p = who(id);
            const pl = place(id);
            return (
              <li key={id} className={cx('lu-step', `at-${pl}`, pl === 1 && 'won')} style={{ '--lu-col': COLS[ids.indexOf(id) % 4], '--i': i } as CSSProperties}>
                <span className="lu-step-who">
                  <Avatar name={p?.name ?? '?'} avatar={p?.avatar ?? null} bot={p?.bot} size="sm" />
                </span>
                <b data-no-translate>{name(id)}</b>
                <span className="lu-step-medal">{MEDALS[pl - 1] ?? `${pl}th`}</span>
                <small>⭐ {score(id)}</small>
                <i className="lu-step-block" />
              </li>
            );
          })}
        </ol>
        <section className="rm-history">
          <p className="label">📜 Every round</p>
          <div className="rm-hist-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {ids.map((id) => (
                    <th key={id} data-no-translate>
                      {name(id)}
                    </th>
                  ))}
                  <th>🧐</th>
                </tr>
              </thead>
              <tbody>
                {rv.history.map((r) => (
                  <tr key={r.round}>
                    <td>{r.round}</td>
                    {ids.map((id) => (
                      <td key={id}>
                        {r.roles[id] ? RMCS_EMOJI[r.roles[id]] : '–'} {r.points[id] ?? 0}
                      </td>
                    ))}
                    <td>{r.correct ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Σ</td>
                  {ids.map((id) => (
                    <td key={id}>
                      <b>{score(id)}</b>
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
        <button className="btn primary block shine" onClick={onNext}>
          Continue
        </button>
      </div>
    </Backdrop>
  );
}
