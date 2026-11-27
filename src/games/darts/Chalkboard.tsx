// The chalkboard by the dartboard: each player's points left, and the darts of the turn being thrown
import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { DARTS_PER_TURN, type DartsView } from '../../types';

interface Props {
  dv: DartsView;
  order: string[];
  name: (id: string) => string;
  colorOf: (id: string) => string;
  meId: string;
}

const PLACES = ['1st', '2nd', '3rd', '4th'];

export function Chalkboard({ dv, order, name, colorOf, meId }: Props) {
  const turnSum = dv.thrown.reduce((a, d) => a + d.score, 0);
  const bust = dv.thrown.some((d) => d.bust);
  return (
    <aside className="da-chalk" aria-label="Scores">
      <b className="da-chalk-title">{dv.start}</b>
      <ol>
        {order.map((id) => {
          const turn = id === dv.turnId;
          const place = dv.places[id];
          return (
            <li key={id} className={cx(turn && 'turn', id === meId && 'me', place && 'done')} style={{ '--c': colorOf(id) } as CSSProperties}>
              <span className="da-chalk-name" data-no-translate>
                {name(id)}
              </span>
              <b key={dv.left[id]} className="da-chalk-left bump">
                {place ? `🏁 ${PLACES[place - 1] ?? place}` : dv.left[id]}
              </b>
              {turn && (
                <span className="da-chalk-darts">
                  {Array.from({ length: DARTS_PER_TURN }, (_, i) => {
                    const d = dv.thrown[i];
                    return (
                      <i key={i} className={cx(d && 'hit', bust && 'bust')}>
                        {d ? d.score : '·'}
                      </i>
                    );
                  })}
                  <em className={cx(bust && 'bust')}>{bust ? 'BUST' : `= ${turnSum}`}</em>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
