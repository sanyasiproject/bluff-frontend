// Offline setup: pick one of the 9 games, its options and 2–4 seats (a person with a name, or a computer at a level)
import { useState, type CSSProperties } from 'react';
import { BackButton } from '../components/BackButton';
import { Choice } from '../components/LobbySettings';
import { useBack } from '../lib/back';
import { cx } from '../lib/cards';
import { gameOpt, type GameConfig, type GameOptionSpec } from '../types';
import { botSeat, fitSetup, infoOf, levelChoices, newSetup, OFFLINE_GAMES, personSeat, seatColor, seatRange, type OfflineKind, type OfflineSeat, type OfflineSetup, type SeatLevel } from './games';
import { loadSetups, saveSetup } from './store';

type Val = string | number | boolean;
/** options a seat or the phone decides offline */
const HIDDEN = new Set(['rated', 'color', 'level']);

interface Props {
  /** why the last Start was refused */
  error?: string | null;
  myName: string;
  initial?: OfflineSetup | null;
  onStart: (s: OfflineSetup) => void;
  onBack: () => void;
}

export function OfflineSetupScreen({ error, myName, initial, onStart, onBack }: Props) {
  const [s, setS] = useState<OfflineSetup>(() => {
    if (initial) return fitSetup(initial);
    const saved = loadSetups();
    const k = saved.last ?? 'ludo';
    return saved.byKind[k] ?? newSetup(k, myName);
  });
  useBack(onBack);
  // a refusal shows until the setup changes
  const [errSeen, setErrSeen] = useState<string | null>(null);
  const showErr = error && error !== errSeen ? error : null;
  const info = infoOf(s.kind);
  const [min, max] = seatRange(s.kind);
  const set = (patch: Partial<OfflineSetup>) => {
    setErrSeen(error ?? null);
    setS((cur) => fitSetup({ ...cur, ...patch }));
  };
  const pickGame = (k: OfflineKind) => {
    if (k === s.kind) return;
    setErrSeen(error ?? null);
    const saved = loadSetups().byKind[k];
    // keep the people already named when switching games
    const people = s.seats.filter((x) => x.bot === undefined);
    setS(saved ?? fitSetup({ ...newSetup(k, myName), seats: people.length ? [...people, botSeat(k, people.length)] : newSetup(k, myName).seats }));
  };
  const cfg = { game: s.kind, opts: s.opts } as Pick<GameConfig, 'game' | 'opts'>;
  const visible = (o: GameOptionSpec) => !HIDDEN.has(o.id) && (!o.when || gameOpt(cfg, o.when.id) === o.when.value);
  const setSeat = (i: number, seat: OfflineSeat) => set({ seats: s.seats.map((x, j) => (j === i ? seat : x)) });
  // a seat's colour is its place in the order: tapping it swaps with the next seat
  const swap = (i: number) => {
    const seats = [...s.seats];
    const j = (i + 1) % seats.length;
    [seats[i], seats[j]] = [seats[j], seats[i]];
    set({ seats });
  };
  const people = s.seats.filter((x) => x.bot === undefined).length;
  const ok = people >= 1 && s.seats.every((x) => x.name.trim().length > 0);
  const start = () => {
    const clean = fitSetup({ ...s, seats: s.seats.map((x) => ({ ...x, name: x.name.trim().slice(0, 16) })) });
    saveSetup(clean);
    setErrSeen(null);
    onStart(clean);
  };

  return (
    <main className="screen off-setup nt-night">
      <header className="off-head">
        <BackButton onClick={onBack} />
        <h2 className="grow">📴 Play offline</h2>
        <span className="off-free">No coins, XP or ratings</span>
      </header>
      <div className="off-body">
        <nav className="off-games" aria-label="Game">
          {OFFLINE_GAMES.map((k) => {
            const g = infoOf(k);
            return (
              <button key={k} className={cx('off-game', k === s.kind && 'on')} aria-pressed={k === s.kind} onClick={() => pickGame(k)} style={{ '--g1': g.colors[0], '--g2': g.colors[1] } as CSSProperties}>
                <span className="off-game-emoji" aria-hidden>
                  {g.emoji}
                </span>
                <span className="off-game-name">{g.name}</span>
              </button>
            );
          })}
        </nav>

        <section className="off-opts panel" aria-label="Options">
          <h3 className="off-title">
            {info.emoji} {info.name}
          </h3>
          {info.options.filter(visible).map((o) => {
            const v = gameOpt<Val>(cfg, o.id);
            const hint = o.choices.find((c) => c.value === v)?.hint ?? o.hint ?? '';
            return (
              <div key={o.id} className="setting-row stacked">
                <div className="grow">
                  <b>{o.label}</b>
                  <span>{hint}</span>
                </div>
                {o.choices.length > 5 ? (
                  <select className="off-select" value={String(v)} onChange={(e) => set({ opts: { ...s.opts, [o.id]: o.choices.find((c) => String(c.value) === e.target.value)?.value ?? o.default } })}>
                    {o.choices.map((c) => (
                      <option key={String(c.value)} value={String(c.value)}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Choice<Val> value={v} options={o.choices.map((c): [Val, string] => [c.value, c.label])} onPick={(nv) => set({ opts: { ...s.opts, [o.id]: nv } })} />
                )}
              </div>
            );
          })}
          {info.teams && s.seats.length === 4 && (
            <div className="setting-row stacked">
              <div className="grow">
                <b>👥 Teams</b>
                <span>Partners sit opposite and win together</span>
              </div>
              <Choice value={s.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
            </div>
          )}
          {s.kind === 'chess' && (
            <div className="setting-row stacked">
              <div className="grow">
                <b>🔄 Turn the board</b>
                <span>{s.flip ? 'The board faces whoever moves' : 'White stays at the bottom'}</span>
              </div>
              <Choice value={s.flip} options={[[true, 'On'], [false, 'Off']]} onPick={(flip) => set({ flip })} />
            </div>
          )}
          {info.options.filter(visible).length === 0 && s.kind !== 'chess' && <p className="muted small">No options for this game.</p>}
        </section>

        <section className="off-seats panel" aria-label="Players">
          <h3 className="off-title">
            Players <small className="muted">{min === max ? `${min}` : `${min}–${max}`}</small>
          </h3>
          <ol className="off-seat-list">
            {s.seats.map((seat, i) => (
              <SeatRow
                key={seat.id}
                kind={s.kind}
                seat={seat}
                color={seatColor(s.kind, s.seats.length, i)}
                index={i}
                canRemove={s.seats.length > min}
                onChange={(x) => setSeat(i, x)}
                onSwap={() => swap(i)}
                onRemove={() => set({ seats: s.seats.filter((_, j) => j !== i) })}
              />
            ))}
          </ol>
          {s.seats.length < max && (
            <div className="off-add">
              <button className="btn ghost small" onClick={() => set({ seats: [...s.seats, personSeat(people)] })}>
                ➕ Person
              </button>
              <button className="btn ghost small" onClick={() => set({ seats: [...s.seats, botSeat(s.kind, s.seats.length)] })}>
                🤖 Computer
              </button>
            </div>
          )}
          {people === 0 && <p className="off-warn small">At least one person must play.</p>}
        </section>
      </div>
      <footer className="off-foot">
        {showErr ? <span className="off-warn small">{showErr}</span> : <span className="muted small">Pass the phone between turns · works with no internet</span>}
        <button className="btn primary shine off-start" disabled={!ok} onClick={start}>
          ▶ Start
        </button>
      </footer>
    </main>
  );
}

interface RowProps {
  kind: OfflineKind;
  seat: OfflineSeat;
  color: string;
  index: number;
  canRemove: boolean;
  onChange: (s: OfflineSeat) => void;
  onSwap: () => void;
  onRemove: () => void;
}

function SeatRow({ kind, seat, color, index, canRemove, onChange, onSwap, onRemove }: RowProps) {
  const bot = seat.bot !== undefined;
  const levels = levelChoices(kind);
  return (
    <li className={cx('off-seat', bot && 'bot')}>
      <button className="off-color" style={{ background: color }} aria-label={`Colour ${index + 1}: swap with the next seat`} title="Swap colour" onClick={onSwap} />
      <div className="mini-seg off-kind" role="group">
        <button className={cx(!bot && 'on')} aria-pressed={!bot} onClick={() => bot && onChange(personSeat(index))}>
          🙂
        </button>
        <button className={cx(bot && 'on')} aria-pressed={bot} onClick={() => !bot && onChange(botSeat(kind, index))}>
          🤖
        </button>
      </div>
      {bot ? (
        <select className="off-select grow" aria-label="Computer level" value={String(seat.bot)} onChange={(e) => onChange({ ...seat, bot: (levels.find((l) => String(l.value) === e.target.value)?.value ?? levels[0].value) as SeatLevel })}>
          {levels.map((l) => (
            <option key={String(l.value)} value={String(l.value)}>
              {`🤖 ${l.label}`}
            </option>
          ))}
        </select>
      ) : (
        <input className="off-name grow" value={seat.name} maxLength={16} placeholder={`Player ${index + 1}`} aria-label={`Player ${index + 1} name`} data-no-translate onChange={(e) => onChange({ ...seat, name: e.target.value })} />
      )}
      {canRemove && (
        <button className="icon-btn off-remove" aria-label="Remove seat" onClick={onRemove}>
          ✕
        </button>
      )}
    </li>
  );
}
