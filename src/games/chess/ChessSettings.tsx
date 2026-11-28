// Host's chess settings in the lobby: a variant button (sheet with a diagram per variant), time by speed, Rated, colour, bot level
import { useState } from 'react';
import { Choice } from '../../components/LobbySettings';
import { Backdrop } from '../../components/Overlays';
import { cx } from '../../lib/cards';
import { gameOpt, type GameConfig, type RoomView } from '../../types';
import { VariantDiagram } from './ChessRules';
import { CHESS_BOT_LEVELS, CHESS_VARIANTS, type ChessVariant } from './lib';
import { TIME_GROUPS, timeText } from './texts';

type Val = string | number | boolean;

/** why Rated can't be on in this room, or null when it can */
export function ratedBlock(view: RoomView): string | null {
  const time = gameOpt<string>(view.config, 'time');
  if (time === 'none') return 'Untimed games are always casual';
  if (view.players.some((p) => p.bot)) return 'Games with a bot are casual';
  if (view.players.some((p) => !p.registered)) return 'Both players need to be logged in';
  return null;
}

export function ChessSettings({ view, pick }: { view: RoomView; pick: (id: string, v: Val) => void }) {
  const c: GameConfig = view.config;
  const [sheet, setSheet] = useState(false);
  const variant = gameOpt<string>(c, 'variant') as ChessVariant;
  const time = gameOpt<string>(c, 'time');
  const rated = gameOpt<string>(c, 'rated');
  const color = gameOpt<string>(c, 'color');
  const level = gameOpt<number>(c, 'level');
  const info = CHESS_VARIANTS.find((v) => v.id === variant);
  const block = ratedBlock(view);
  const bots = view.players.some((p) => p.bot);
  return (
    <>
      <div className="setting-row stacked ch-set">
        <div className="grow">
          <b>Variant</b>
          <span>{info?.about}</span>
        </div>
        <button type="button" className="ch-variant-btn" onClick={() => setSheet(true)}>
          <span className="ch-variant-mini" aria-hidden>
            <VariantDiagram variant={variant} bare />
          </span>
          <b>{info?.name ?? 'Standard'}</b>
          <small>Change ▸</small>
        </button>
      </div>
      <div className="setting-row stacked ch-set">
        <div className="grow">
          <b>Time</b>
          <span>{time === 'none' ? 'No clock: play at your own pace' : `${timeText(time)}: minutes each, plus seconds added per move`}</span>
        </div>
        <div className="ch-times">
          {TIME_GROUPS.map((g) => (
            <div key={g.id} className="ch-time-row">
              <small>
                {g.icon} {g.name}
              </small>
              <div className="mini-seg" role="group" aria-label={g.name}>
                {g.times.map((t) => (
                  <button key={t} className={cx(t === time && 'on')} aria-pressed={t === time} onClick={() => t !== time && pick('time', t)}>
                    {timeText(t)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="setting-row stacked ch-set">
        <div className="grow">
          <b>Rated</b>
          <span className={cx(block && 'warn')}>{block ?? (rated === 'yes' ? 'Wins and losses change your rating' : 'Ratings stay as they are')}</span>
        </div>
        <div className={cx(block && 'ch-locked')}>
          <Choice<Val> value={block ? 'no' : rated} options={[['no', 'Casual'], ['yes', 'Rated']]} onPick={(v) => !block && pick('rated', v)} />
        </div>
      </div>
      <div className="setting-row stacked ch-set">
        <div className="grow">
          <b>Host plays</b>
          <span>{color === 'random' ? 'Colours are drawn at the start' : `You play ${color}`}</span>
        </div>
        <Choice<Val> value={color} options={[['random', '🎲 Random'], ['white', '⚪ White'], ['black', '⚫ Black']]} onPick={(v) => pick('color', v)} />
      </div>
      {bots && (
        <div className="setting-row stacked ch-set">
          <div className="grow">
            <b>🤖 Bot level</b>
            <span>{`Level ${level}: plays at about ${CHESS_BOT_LEVELS.find((l) => l.level === level)?.label.replace('≈ ', '') ?? '?'}`}</span>
          </div>
          <div className="mini-seg ch-levels" role="group" aria-label="Bot level">
            {CHESS_BOT_LEVELS.map((l) => (
              <button key={l.level} className={cx(l.level === level && 'on')} aria-pressed={l.level === level} aria-label={`Level ${l.level}, ${l.label}`} onClick={() => pick('level', l.level)}>
                {l.level}
              </button>
            ))}
          </div>
        </div>
      )}
      {sheet && <VariantSheet value={variant} onPick={(v) => (pick('variant', v), setSheet(false))} onClose={() => setSheet(false)} />}
    </>
  );
}

/** all nine variants, each with its line and a small board */
function VariantSheet({ value, onPick, onClose }: { value: ChessVariant; onPick: (v: ChessVariant) => void; onClose: () => void }) {
  return (
    <Backdrop onClose={onClose} panel="ch-variant-sheet">
      <h3>♟️ Pick a variant</h3>
      <div className="ch-variants">
        {CHESS_VARIANTS.map((v) => (
          <button key={v.id} type="button" className={cx('ch-variant', v.id === value && 'on')} aria-pressed={v.id === value} onClick={() => onPick(v.id)}>
            <span className="ch-variant-art" aria-hidden>
              <VariantDiagram variant={v.id} bare />
            </span>
            <b>{v.name}</b>
            <small>{v.about}</small>
          </button>
        ))}
      </div>
    </Backdrop>
  );
}
