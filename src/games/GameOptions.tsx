// Lobby settings for registry games, drawn from the game's catalog options
import { BotLevelPicker, Choice, SettingRow, StakePicker, type LobbyTab } from '../components/LobbySettings';
import { gameInfo, gameOpt, type GameConfig, type GameOptionSpec, type RoomView } from '../types';
import { PLUGGED } from './registry';

type Val = string | number | boolean;

/** an option is shown while its `when` option has that value */
const visible = (config: GameConfig, o: GameOptionSpec) => !o.when || gameOpt(config, o.when.id) === o.when.value;

/** the chosen options in a few words, for summaries and the felt sign */
export function pluggedSummary(view: RoomView): string[] {
  const c = view.config;
  const info = gameInfo(c.game);
  const out: string[] = [];
  for (const o of info.options) {
    if (!visible(c, o)) continue;
    const v = gameOpt<Val>(c, o.id);
    const choice = o.choices.find((ch) => ch.value === v);
    if (choice) out.push(o.id === 'mode' ? `🎮 ${choice.label}` : o.id === 'time' ? `⏱ ${choice.label}` : o.id === 'rounds' ? `🔁 ${choice.label}` : /^(On|Off)$/.test(choice.label) ? `${o.label} ${choice.label.toLowerCase()}` : choice.label);
  }
  if (c.teams && info.teams) out.push('👥 2 vs 2');
  if (view.players.some((p) => p.bot)) out.push('🤖 Bots');
  return out;
}

interface Props {
  view: RoomView;
  land: boolean;
  show: (t: LobbyTab) => boolean;
  coinsOn: boolean;
  set: (patch: Partial<GameConfig>) => void;
}

/** host: the registry game's settings (bots, stakes, its own options, teams) */
export function PluggedSettings({ view, land, show, coinsOn, set }: Props) {
  const c = view.config;
  const info = gameInfo(c.game);
  const bots = view.players.filter((p) => p.bot);
  const pick = (id: string, value: Val) => set({ opts: { ...(c.opts ?? {}), [id]: value } });
  return (
    <section className="panel">
      {!land && <h2 className="section-title">Game settings</h2>}
      {bots.length > 0 && show('stakes') && <BotLevelPicker value={c.botLevel ?? 'expert'} onPick={(level) => set({ botLevel: level })} />}
      {coinsOn && show('stakes') && (
        <StakePicker stake={c.stake} players={view.players.length} config={c} bots={bots.length > 0} isHost onPick={(n) => set({ stake: n })} />
      )}
      {show('game') &&
        info.options
          .filter((o) => visible(c, o))
          .map((o) => {
            const v = gameOpt<Val>(c, o.id);
            const hint = o.choices.find((ch) => ch.value === v)?.hint ?? o.hint ?? '';
            return (
              <div key={o.id} className="setting-row stacked">
                <div className="grow">
                  <b>{o.label}</b>
                  <span>{hint}</span>
                </div>
                <Choice<Val> value={v} options={o.choices.map((ch): [Val, string] => [ch.value, ch.label])} onPick={(nv) => pick(o.id, nv)} />
              </div>
            );
          })}
      {show('game') && info.teams && (
        <SettingRow title="👥 Teams" desc="2 vs 2 with exactly 4: partners sit opposite and win together">
          <Choice value={c.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
        </SettingRow>
      )}
    </section>
  );
}

/** the lobby's How to play box for a registry game */
export function PluggedHelp({ view }: { view: RoomView }) {
  const entry = PLUGGED[view.config.game as keyof typeof PLUGGED];
  const Rules = entry?.Rules;
  return Rules ? <Rules config={view.config} /> : <p className="muted small">{gameInfo(view.config.game).tagline}</p>;
}
