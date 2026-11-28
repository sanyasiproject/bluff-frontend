import { type ReactNode } from 'react';
import { GameArt } from '../art/GameArt';
import { Icon } from '../art/icons';
import { useBack } from '../lib/back';
import { cx } from '../lib/cards';
import { formatCoins, compactCoins, stakeLabel } from '../lib/coins';
import { PluggedHelp, PluggedSettings, pluggedSummary } from '../games/GameOptions';
import { VoiceSettings } from './VoiceSettings';
import {
  BOT_LEVEL_NAMES,
  GAME_CATALOG,
  gameInfo,
  isPlugged,
  BOT_LEVELS,
  BOT_STAKE_CAPS,
  botStakeCap,
  CRAZY7_MAX_PICKS,
  RANG_MAX_PICKS,
  SHIELD_MAX_CARDS,
  STAKES,
  type BotLevel,
  type GameConfig,
  type GameKind,
  type RoomView,
  TURN_SECONDS,
  TURN_TIMER,
  type TurnSeconds,
} from '../types';

/** picker lines for the hand-wired games and a few registry games */
const GAME_DESC: Partial<Record<GameKind, string>> = {
  bluff: 'Lie about your cards, catch the liars',
  crazy7: 'Match suit or number; a 7 makes the next player pick 2',
  rang: 'Match colour or number; Skip, Reverse, +2 and wilds',
  gomoku: 'Take turns placing stones; five in a row wins',
  uttt: 'Nine tic-tac-toe boards; your move picks their board',
  wordhunt: 'Same letters for all; trace words, unique ones score double',
};

/** the lobby's settings tabs (landscape drawer); portrait shows them all at once */
export type LobbyTab = 'game' | 'stakes' | 'extras' | 'help' | 'voice';

/** what a bot level lets the table stake, in a few words */
const capText = (cap: number) => (cap === 0 ? 'Free only' : `Up to 🪙 ${compactCoins(cap)}`);

/** host: how well the bots play, three even choices that each show what can be staked against them */
export function BotLevelPicker({ value, onPick }: { value: BotLevel; onPick: (level: BotLevel) => void }) {
  return (
    <div className="setting-row stacked">
      <div className="grow">
        <b>🤖 Bot level</b>
        <span>Stronger bots count every card and remember how you play</span>
      </div>
      <div className="level-seg" role="group" aria-label="Bot level">
        {BOT_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            className={cx('level-chip', level === value && 'on')}
            aria-pressed={level === value}
            onClick={() => level !== value && onPick(level)}
          >
            <b>{BOT_LEVEL_NAMES[level]}</b>
            <small>{capText(BOT_STAKE_CAPS[level])}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

interface OptionProps {
  on: boolean;
  disabled: boolean;
  title: string;
  desc: string;
  onClick: () => void;
  /** a small picture on the left (the game picker's art, shown sideways only) */
  art?: ReactNode;
}

/** a newer setting: title, a few words on what it does, and its switch on the right */
export function SettingRow({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="grow">
        <b>{title}</b>
        <span>{desc}</span>
      </div>
      {children}
    </div>
  );
}

/** two or more small choices side by side */
export function Choice<T>({ value, options, onPick }: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="mini-seg" role="group">
      {options.map(([v, label]) => (
        <button key={label} className={cx(v === value && 'on')} aria-pressed={v === value} onClick={() => v !== value && onPick(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Option({ on, disabled, title, desc, onClick, art }: OptionProps) {
  return (
    <button type="button" className={cx('option', on && 'on', !!art && 'has-art')} disabled={disabled} aria-pressed={on} onClick={onClick}>
      {art && (
        <span className="option-art" aria-hidden>
          {art}
        </span>
      )}
      <b>{title}</b>
      <span>{desc}</span>
    </button>
  );
}

/** host picks how many coins each player puts in; everyone sees what it means. Bots cap it by their level and put in nothing */
export function StakePicker({ stake, players, config, bots, isHost, onPick }: { stake: number; players: number; config: GameConfig; bots: boolean; isHost: boolean; onPick: (n: number) => void }) {
  const pot = stake * Math.max(players, 2);
  const cap = botStakeCap(config);
  // Crazy 7 bots always play their best; Bluff's are named by their level
  const who = config.game === 'crazy7' || config.game === 'rang' ? 'Bots' : `${BOT_LEVEL_NAMES[config.botLevel ?? 'expert']} bots`;
  return (
    <>
      <p className="label">🪙 Coins at stake (per player)</p>
      {isHost && (
        <div className="stake-grid">
          {STAKES.map((s) => (
            <button
              key={s}
              type="button"
              className={cx('stake-chip', s === stake && 'on')}
              aria-pressed={s === stake}
              disabled={bots && s > cap}
              onClick={() => onPick(s)}
            >
              {stakeLabel(s)}
            </button>
          ))}
        </div>
      )}
      <div className={cx('stake-explain', stake > 0 && 'live')}>
        {stake === 0 ? (
          <>
            <b>Free game</b>
            <span>Just for fun · guests can play</span>
          </>
        ) : (
          <>
            <b>
              Everyone puts in 🪙 {formatCoins(stake)} · Winner takes 🪙 {formatCoins(pot)}
            </b>
            <span>
              {bots ? 'Bots put in nothing · coins lost to a bot are gone' : 'Paid only when the game finishes · log in needed'}
            </span>
          </>
        )}
        {/* what the bots allow, inside the box so it never crowds the chips */}
        {isHost && bots && <span className="stake-bots">🤖 {cap === 0 ? `${who} play only free games` : `${who} play for up to 🪙 ${compactCoins(cap)}`}</span>}
      </div>
    </>
  );
}

interface BodyProps {
  view: RoomView;
  isHost: boolean;
  coinsOn: boolean;
  /** the open tab in landscape; null in portrait, where every section shows */
  tab: LobbyTab | null;
  set: (patch: Partial<GameConfig>) => void;
  onLesson: (game: GameKind) => void;
}

/** every game setting block: host controls, the read-only summary for others, help and voice */
export function SettingsBody({ view, isHost, coinsOn, tab, set, onLesson }: BodyProps) {
  const land = tab !== null;
  const show = (t: LobbyTab) => tab === null || tab === t;
  // the game's own settings panel has rows on every tab but Help
  const settingsOpen = !land || (tab !== 'help' && tab !== 'voice');
  const setLesson = onLesson;
  const crazy7 = view.config.game === 'crazy7';
  const rang = view.config.game === 'rang';
  const plugged = isPlugged(view.config.game);
  const isBluff = !crazy7 && !rang && !plugged;
  const info = gameInfo(view.config.game);
  const stake = view.config.stake;
  const pot = stake * view.players.length;
  const bots = view.players.filter((p) => p.bot);
  const rankedKnown = typeof view.config.ranked === 'boolean';
  const twists = !view.config.kismat && !view.config.seedhi ? 'classic' : view.config.kismat && view.config.seedhi ? 'chaos' : null;
  const ranked = isBluff && view.config.ranked === true;
  return (
    <>
      {!isHost && show('game') && (
        <section className="panel settings-summary">
          <h2 className="section-title">Game settings</h2>
          <div className="summary-chips">
            <span className="game-chip">{info.emoji} {info.name}</span>
            <span>{stake > 0 ? `🪙 ${formatCoins(stake)} each` : '🆓 Free game'}</span>
            {!rang && !plugged && <span>🎴 {view.config.decks === 2 ? '2 decks' : '1 deck'}</span>}
            {plugged ? (
              pluggedSummary(view).map((b) => <span key={b}>{b}</span>)
            ) : rang ? (
              <>
                <span>
                  🂠 Up to {view.config.rangPicks ?? 1} pick{(view.config.rangPicks ?? 1) > 1 ? 's' : ''}
                </span>
                <span>{view.config.rangStack !== false ? '➕ +2/+4 stack' : '➕ No stacking'}</span>
                {view.config.rangChallenge !== false && <span>⚔️ Challenge +4</span>}
                {view.config.rangSwap && <span>🔄 7-0 swap</span>}
                {view.config.rangDoubles && <span>👯 Doubles</span>}
                {view.config.rangForce && <span>⚡ Force play</span>}
                {(view.config.rangTime ?? 0) > 0 && <span>⏱ {view.config.rangTime} min game</span>}
                {(view.config.rangHand ?? 7) !== 7 && <span>🃏 {view.config.rangHand} cards each</span>}
                {(view.config.rangMissed ?? 2) !== 2 && <span>📢 Miss last card: pick {view.config.rangMissed}</span>}
                {view.config.teams && <span>👥 2 vs 2</span>}
              </>
            ) : crazy7 ? (
              <>
                <span>🃏 {view.config.handSize} cards each</span>
                <span>
                  🂠 Up to {view.config.maxPicks} pick{view.config.maxPicks > 1 ? 's' : ''}
                </span>
                <span>{view.config.stack7 ? '7️⃣ 7s stack' : '7️⃣ No stacking'}</span>
                {view.config.c7Power && <span>⚡ Power cards</span>}
              </>
            ) : (
              <>
                {ranked && <span className="ranked-chip">🏅 Ranked</span>}
                <span>{view.config.bluffRule === 'one' ? '👆 Pick one card' : '🃏 Show all cards'}</span>
                {view.config.peeks > 0 && <span>🔍 {view.config.peeks} peek{view.config.peeks > 1 ? 's' : ''}</span>}
                {view.config.shields > 0 && <span>🔒 {view.config.shields} shield{view.config.shields > 1 ? 's' : ''}</span>}
                {view.config.bets && <span>🎲 Bets on calls</span>}
                {view.config.teams && <span>👥 2 vs 2</span>}
                {view.config.saza && <span>🤡 Saza for the loser</span>}
                {view.config.kismat && <span>🍀 Kismat card</span>}
                {view.config.seedhi && <span>🪜 Seedhi</span>}
                {view.config.secretLies && <span>🤐 Lies stay secret</span>}
                {bots.length > 0 && <span>🤖 {BOT_LEVEL_NAMES[view.config.botLevel ?? 'expert']} bots</span>}
              </>
            )}
            {view.config.voice === false && <span>🔇 No voice</span>}
            {view.config.turnTimer && <span>⏰ {view.config.turnSec ?? TURN_TIMER.turnSec}s turns</span>}
          </div>
          {stake > 0 && <p className="muted small">Winner takes 🪙 {formatCoins(pot)}</p>}
          {bots.length > 0 && <p className="muted small">🤖 Bots put in nothing · coins lost to a bot are gone</p>}
          {ranked && <p className="muted small">🏅 A finished game moves everyone's rank points</p>}
        </section>
      )}

      {isHost && show('game') && (
        <section className="panel">
          {!land && <h2 className="section-title">Game</h2>}
          <div className="seg game-seg">
            {/* every game in the catalog; one too big for the seated players can't be picked */}
            {GAME_CATALOG.map((g) => (
              <Option
                key={g.kind}
                on={view.config.game === g.kind}
                disabled={view.players.length > Math.min(5, g.maxPlayers)}
                title={`${g.emoji} ${g.name}${g.isNew ? ' 🆕' : ''}`}
                art={
                  <>
                    <GameArt kind={g.kind} />
                    {g.isNew && <i className="nt-badge new">New</i>}
                  </>
                }
                desc={view.players.length > Math.min(5, g.maxPlayers) ? `Up to ${g.maxPlayers} players: move someone to watching first` : (GAME_DESC[g.kind] ?? g.tagline)}
                // ranked kept on from before can't come back while bots sit at the table
                onClick={() => set({ game: g.kind, ...(g.kind === 'bluff' && bots.length > 0 && view.config.ranked ? { ranked: false } : {}) })}
              />
            ))}
          </div>
          {/* Bluff only: casual or ranked, as big as the game choice */}
          {isBluff && coinsOn && rankedKnown && (
            <div className="seg mode-seg">
              <Option on={!ranked} disabled={false} title="🎮 Casual" desc="Just for fun · no rank points" onClick={() => ranked && set({ ranked: false })} />
              <Option
                on={ranked}
                disabled={bots.length > 0 && !ranked}
                title="🏅 Ranked"
                desc={bots.length > 0 && !ranked ? 'People only: remove the bots first' : 'Rank points move · logged-in players, no bots'}
                onClick={() => !ranked && set({ ranked: true })}
              />
            </div>
          )}
        </section>
      )}

      {isHost && plugged && settingsOpen && <PluggedSettings view={view} land={land} show={show} coinsOn={coinsOn} set={set} />}

      {isHost && crazy7 && settingsOpen && (
        <section className="panel">
          {!land && <h2 className="section-title">Game settings</h2>}
          {coinsOn && show('stakes') && <StakePicker stake={stake} players={view.players.length} config={view.config} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
          {show('game') && (
          <>
          <SettingRow title="🃏 Cards each" desc="Dealt to every player at the start">
            <Choice<5 | 7> value={view.config.handSize} options={[[5, '5'], [7, '7']]} onPick={(n) => set({ handSize: n })} />
          </SettingRow>
          <div className="setting-row stacked">
            <div className="grow">
              <b>🂠 Picks per turn</b>
              <span>When nothing matches, 1 card is picked for you. Above 1 you may pick more or Pass to stop early.</span>
            </div>
            <div className="mini-seg pick-seg" role="group" aria-label="Picks per turn">
              {Array.from({ length: CRAZY7_MAX_PICKS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={cx(view.config.maxPicks === n && 'on')}
                  aria-pressed={view.config.maxPicks === n}
                  onClick={() => view.config.maxPicks !== n && set({ maxPicks: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          </>
          )}
          {show('extras') && (
          <>
          <SettingRow title="7️⃣ Stack 7s" desc={view.config.c7Power ? 'Answer a 7 or a 2 with a 7 or a 2: the next player picks the total' : 'Answer a 7 with a 7: the next player picks 4, then 6…'}>
            <Choice value={view.config.stack7} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ stack7: on })} />
          </SettingRow>
          <SettingRow title="⚡ Power cards" desc="J changes the suit · 8 skips the next player · A reverses · 2 makes the next player pick 2">
            <Choice value={view.config.c7Power === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ c7Power: on })} />
          </SettingRow>
          </>
          )}
          {show('game') && (
          <>
          <p className="label">Cards</p>
          <div className="seg">
            <Option on={view.config.decks === 1} disabled={false} title="1 deck" desc="52 cards" onClick={() => set({ decks: 1 })} />
            <Option on={view.config.decks === 2} disabled={false} title="2 decks" desc="104 cards, more 7s" onClick={() => set({ decks: 2 })} />
          </div>
          </>
          )}
        </section>
      )}

      {isHost && rang && settingsOpen && (
        <section className="panel">
          {!land && <h2 className="section-title">Game settings</h2>}
          {coinsOn && show('stakes') && <StakePicker stake={stake} players={view.players.length} config={view.config} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
          {show('game') && (
          <div className="setting-row stacked">
            <div className="grow">
              <b>🂠 Picks per turn</b>
              <span>Nothing fits? Keep picking until a card fits, up to this many. At 1 you pick one card, then play it or pass.</span>
            </div>
            <div className="mini-seg pick-seg" role="group" aria-label="Picks per turn">
              {Array.from({ length: RANG_MAX_PICKS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={cx((view.config.rangPicks ?? 1) === n && 'on')}
                  aria-pressed={(view.config.rangPicks ?? 1) === n}
                  onClick={() => (view.config.rangPicks ?? 1) !== n && set({ rangPicks: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          )}
          {show('extras') && (
          <>
          <SettingRow title="➕ Stack +2 and +4" desc="Answer a +2 with a +2 or +4, a +4 with a +4: the next player picks the total">
            <Choice value={view.config.rangStack !== false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangStack: on })} />
          </SettingRow>
          <SettingRow title="⚔️ Challenge the +4" desc="Hit by a +4? Challenge it: if they held the colour, they take the +4 back and pick 4; if not, you pick 6">
            <Choice value={view.config.rangChallenge !== false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangChallenge: on })} />
          </SettingRow>
          <SettingRow title="🔄 7-0 swap" desc="A 7 swaps hands with a player you pick · a 0 passes every hand on">
            <Choice value={view.config.rangSwap === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangSwap: on })} />
          </SettingRow>
          <SettingRow title="👯 Doubles" desc="On a number, put down all your cards of that number at once (on a 4: every 4 you hold)">
            <Choice value={view.config.rangDoubles === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangDoubles: on })} />
          </SettingRow>
          <SettingRow title="⚡ Force play" desc="A card you pick that fits is played at once">
            <Choice value={view.config.rangForce === true} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ rangForce: on })} />
          </SettingRow>
          </>
          )}
          {show('game') && (
          <SettingRow title="🃏 Cards each" desc="Dealt to every player at the start">
            <Choice<5 | 7 | 10> value={view.config.rangHand ?? 7} options={[[5, '5'], [7, '7'], [10, '10']]} onPick={(n) => set({ rangHand: n })} />
          </SettingRow>
          )}
          {show('extras') && (
          <SettingRow title="📢 Forgot last card" desc="Cards picked by a player caught not saying last card">
            <Choice<1 | 2 | 4> value={view.config.rangMissed ?? 2} options={[[1, '1'], [2, '2'], [4, '4']]} onPick={(n) => set({ rangMissed: n })} />
          </SettingRow>
          )}
          {show('game') && (
          <>
          {/* stacked: three wide choices leave the text no room beside them */}
          <div className="setting-row stacked">
            <div className="grow">
              <b>⏱ Game time</b>
              <span>When time runs out, the fewest points left win; equal points share the place</span>
            </div>
            <div className="mini-seg" role="group" aria-label="Game time">
              {([[0, 'No limit'], [3, '3 min'], [5, '5 min']] as const).map(([n, label]) => (
                <button key={n} className={cx((view.config.rangTime ?? 0) === n && 'on')} aria-pressed={(view.config.rangTime ?? 0) === n} onClick={() => (view.config.rangTime ?? 0) !== n && set({ rangTime: n })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <SettingRow title="👥 Teams" desc="2 vs 2: partners sit opposite; when one goes out, both win">
            <Choice value={view.config.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
          </SettingRow>
          </>
          )}
        </section>
      )}

      {isHost && isBluff && settingsOpen && <section className="panel">
        {!land && <h2 className="section-title">Game settings</h2>}
        {/* the bots' level comes first: it sets how much can be staked */}
        {bots.length > 0 && show('stakes') && <BotLevelPicker value={view.config.botLevel ?? 'expert'} onPick={(level) => set({ botLevel: level })} />}
        {coinsOn && show('stakes') && <StakePicker stake={stake} players={view.players.length} config={view.config} bots={bots.length > 0} isHost={isHost} onPick={(n) => set({ stake: n })} />}
        {show('game') && (
        <>
        <p className="label">Cards</p>
        <div className="seg">
          <Option on={view.config.decks === 1} disabled={!isHost} title="1 deck" desc="52 cards" onClick={() => set({ decks: 1 })} />
          <Option on={view.config.decks === 2} disabled={!isHost} title="2 decks" desc="104 cards" onClick={() => set({ decks: 2 })} />
        </div>
        <p className="label">When someone calls bluff</p>
        <div className="seg">
          <Option
            on={view.config.bluffRule === 'all'}
            disabled={!isHost}
            title="Show all"
            desc="Every card of that play is turned over"
            onClick={() => set({ bluffRule: 'all' })}
          />
          <Option
            on={view.config.bluffRule === 'one'}
            disabled={!isHost}
            title="Pick one"
            desc="Caller picks one card to turn over"
            onClick={() => set({ bluffRule: 'one' })}
          />
        </div>
        </>
        )}
        {show('extras') && (
        <>
        {!land && <p className="label">Extras</p>}
        <SettingRow title="🔍 Peek power" desc="Secretly see one played card before calling">
          <Choice value={view.config.peeks > 0} options={[[false, 'No'], [true, 'Yes']]} onPick={(on) => set({ peeks: on ? 1 : 0 })} />
        </SettingRow>
        {view.config.peeks > 0 && (
          <SettingRow title="Peeks per player" desc="How many each player gets per game">
            <Choice value={view.config.peeks} options={[[1, '1'], [2, '2'], [3, '3']]} onPick={(n) => set({ peeks: n })} />
          </SettingRow>
        )}
        <SettingRow title="🔒 Card Shield" desc={`Lock a play of up to ${SHIELD_MAX_CARDS} cards: nobody can call or peek it. Not on your last cards`}>
          <Choice value={view.config.shields ?? 0} options={[[0, 'Off'], [1, '1'], [2, '2'], [3, '3']]} onPick={(n) => set({ shields: n })} />
        </SettingRow>
        {coinsOn && stake > 0 && (
          <SettingRow title="🎲 Bet your call" desc="Bet coins on your Bluff calls">
            <Choice value={view.config.bets} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ bets: on })} />
          </SettingRow>
        )}
        <SettingRow title="👥 Teams" desc="Partners play together, both must finish">
          <Choice value={view.config.teams} options={[[false, 'Off'], [true, '2 vs 2']]} onPick={(on) => set({ teams: on })} />
        </SettingRow>
        <SettingRow title="🤡 Saza for the loser" desc="The last player wears a silly badge until they win a game here">
          <Choice value={view.config.saza ?? false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ saza: on })} />
        </SettingRow>
        <SettingRow title="🤥 Lie reveal" desc="When the game ends, show the lies nobody caught">
          <Choice value={!(view.config.secretLies ?? false)} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ secretLies: !on })} />
        </SettingRow>
        {/* older servers have no house twists */}
        {view.config.kismat !== undefined && (
          <>
            <div className="setting-row stacked twist-presets">
              <div className="grow">
                <b>🎭 Twists</b>
                <span>Classic: no twists · Chaos: both on. Or set each one below</span>
              </div>
              <Choice<'classic' | 'chaos' | null>
                value={twists}
                options={[
                  ['classic', 'Classic'],
                  ['chaos', 'Chaos'],
                ]}
                onPick={(v) => set({ kismat: v === 'chaos', seedhi: v === 'chaos' })}
              />
            </div>
            <SettingRow title="🍀 Kismat card" desc="A random rank each game is wild: it backs up any claim">
              <Choice value={view.config.kismat} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ kismat: on })} />
            </SettingRow>
            <SettingRow title="🪜 Seedhi" desc="Each claim goes one rank down, stays, or goes one up. K and A wrap">
              <Choice value={view.config.seedhi ?? false} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ seedhi: on })} />
            </SettingRow>
          </>
        )}
        </>
        )}
      </section>}

      {/* older servers have no turn timer */}
      {isHost && view.config.turnTimer !== undefined && show('extras') && (
        <section className="panel">
          <div className="setting-row stacked">
            <div className="grow">
              <b>⏰ Turn timer</b>
              <span>{`Seconds a turn. Time up: the bot brain plays for you. Miss ${TURN_TIMER.missesToAway} in a row and you're away (${TURN_TIMER.awaySec}s turns)`}</span>
            </div>
            {/* older servers have only on (30 s) or off */}
            {view.config.turnSec === undefined ? (
              <Choice value={view.config.turnTimer} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ turnTimer: on })} />
            ) : (
              <Choice<number>
                value={view.config.turnTimer ? view.config.turnSec : 0}
                options={[[0, 'Off'], ...TURN_SECONDS.map((n): [number, string] => [n, `${n}s`])]}
                onPick={(n) => set(n === 0 ? { turnTimer: false } : { turnTimer: true, turnSec: n as TurnSeconds })}
              />
            )}
          </div>
        </section>
      )}

      {/* older servers have no voice notes */}
      {isHost && view.config.voice !== undefined && show('extras') && (
        <section className="panel">
          <SettingRow title="🎧 Live voice" desc="Logged-in players in the game can talk and hear each other. Never recorded">
            <Choice value={view.config.voice} options={[[false, 'Off'], [true, 'On']]} onPick={(on) => set({ voice: on })} />
          </SettingRow>
        </section>
      )}

      {!rang && show('help') && (
        <button className="link-btn tut-link" onClick={() => setLesson(view.config.game)}>
          📘 How to play: 1-minute practice game
        </button>
      )}
      {show('help') && (
      <details className="panel rules" open={land || undefined}>
        <summary>{`How to play ${info.name}`}</summary>
        {plugged ? (
          <PluggedHelp view={view} />
        ) : rang ? (
          <ul>
            <li>Play one card that matches the colour or the number/symbol on top (on a red 5: any red card or any 5).</li>
            <li>⊘ Skip: the next player misses a turn. ⇄ Reverse: play turns the other way. +2: the next player picks 2 and misses a turn.</li>
            <li>✦ Wild: name the next colour. +4 Wild: name the colour and the next player picks 4 and misses a turn.</li>
            <li>
              Nothing fits? One card is picked for you
              {(view.config.rangPicks ?? 1) > 1 ? `; keep picking (up to ${view.config.rangPicks} a turn), play a card that fits, or Pass.` : '; play it if it fits, or Pass.'}
            </li>
            {view.config.rangStack !== false && <li>➕ Hit by a +2 or +4? Answer with your own (+2 on +2, +4 on either) and the next player picks the total.</li>}
            {view.config.rangChallenge !== false && <li>⚔️ Hit by a +4? Challenge it: if they held the colour in play, they take the +4 back and pick 4; if not, you pick 6.</li>}
            {view.config.rangSwap && <li>🔄 A 7 swaps hands with a player you pick; a 0 passes every hand on in the direction of play.</li>}
            {view.config.rangDoubles && <li>👯 Doubles: when the top card is a number, put down all your cards of that number at once and pick which colour goes on top. On any other card, one card at a time.</li>}
            {view.config.rangForce && <li>⚡ Force play: a card you pick that fits is played at once.</li>}
            {view.config.teams && <li>👥 2 vs 2: partners sit opposite. When one of you goes out, your team wins.</li>}
            {(view.config.rangTime ?? 0) > 0 && <li>⏱ {view.config.rangTime} minute game: if nobody is out by then, the fewest points left win (equal points share the place).</li>}
            <li>With 2 cards on your turn, tap 📢 Last card, then play. Forget it and someone moves first: you pick {view.config.rangMissed ?? 2} and miss a turn.</li>
            <li>First to empty their hand wins. The rest are ranked by points left (numbers face value, Skip/Reverse/+2 20, wilds 50); the highest loses.</li>
          </ul>
        ) : crazy7 ? (
          <ul>
            <li>Play one card that matches the top card's suit or number (on 5♥: any ♥ or any 5).</li>
            <li>
              Nothing matches? One card is picked for you, then play it if it fits.
              {view.config.maxPicks > 1
                ? ` You may pick more (up to ${view.config.maxPicks} a turn) or Pass to stop early; at the limit you must play a card that fits.`
                : ' No passing: one pick a turn.'}
            </li>
            <li>
              A 7 makes the next player pick 2 and miss their turn
              {view.config.stack7 ? ', unless they answer with their own 7 (then 4, 6…). Hit by a 7? Tap Pick 2 (or play a 7)' : ''}.
            </li>
            {view.config.c7Power && <li>⚡ Power cards: J goes on anything and you name the next suit · 8 skips the next player · A reverses the direction · 2 makes the next player pick 2 (answer it with a 2 or a 7).</li>}
            <li>
              With 2 cards on your turn, tap 📢 Last card, then play. Forget it and someone moves before you say it: you pick 1 and miss your next
              turn.
            </li>
            <li>The first player to empty their hand wins. The rest are ranked by card value left (A 1 … K 13); the highest loses. Stuck with nothing to play or pick: fewest cards wins.</li>
          </ul>
        ) : (
          <ul>
            <li>On your turn put one or more cards face down and call a rank. You can lie.</li>
            <li>
              {view.config.seedhi
                ? 'Everyone after you calls one rank down, the same, or one up from the last call (K and A wrap), or passes.'
                : 'Everyone after you must call the same rank, or pass.'}
            </li>
            {view.config.kismat && <li>🍀 Kismat card: one random rank is wild all game. Its cards back up any call.</li>}
            <li>Anyone can shout Bluff on the last play. Liar picks up the whole pile; if it was true, the caller does.</li>
            <li>If everyone passes, the pile is cleared and the last player starts a new round.</li>
            <li>Empty your hand first to win. The last player holding cards loses.</li>
          </ul>
        )}
      </details>
      )}

      {show('voice') && <VoiceSettings />}
    </>
  );
}

/** which settings tabs this player gets: the host can change everything, others read the game and help */
export function lobbyTabs(isHost: boolean, coinsOn: boolean, hasStakes: boolean): [LobbyTab, string][] {
  return isHost
    ? [['game', '🎲 Game'], ...(hasStakes ? [['stakes', coinsOn ? '🪙 Stakes' : '🤖 Bots'] as [LobbyTab, string]] : []), ['extras', '✨ Extras'], ['voice', '🗣️ Voice'], ['help', '📘 Help']]
    : [['game', '🎲 Game'], ['voice', '🗣️ Voice'], ['help', '📘 Help']];
}

/** the table's settings in a few words, for the sign on the felt */
export function summaryBits(view: RoomView): string[] {
  const c = view.config;
  const bits = [c.stake > 0 ? `🪙 ${compactCoins(c.stake)} each` : '🆓 Free game'];
  if (isPlugged(c.game)) {
    bits.push(...pluggedSummary(view).slice(0, 2));
  } else if (c.game === 'rang') {
    bits.push(`🃏 ${c.rangHand ?? 7} cards`, `🂠 ${c.rangPicks ?? 1} pick${(c.rangPicks ?? 1) > 1 ? 's' : ''}`);
  } else if (c.game === 'crazy7') {
    bits.push(`🃏 ${c.handSize} cards`, `🂠 ${c.maxPicks} pick${c.maxPicks > 1 ? 's' : ''}`);
  } else {
    bits.push(c.decks === 2 ? '2 decks' : '1 deck', c.bluffRule === 'one' ? 'Pick one' : 'Show all');
  }
  if (c.teams && c.game !== 'crazy7' && gameInfo(c.game).teams) bits.push('👥 2 vs 2');
  return bits;
}

interface DrawerProps {
  isHost: boolean;
  tabs: [LobbyTab, string][];
  tab: LobbyTab;
  onTab: (t: LobbyTab) => void;
  /** casual or ranked, shown on top of the Game tab */
  banner?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

/** landscape: settings in a glass drawer from the right; the host changes them, everyone else reads them */
export function SettingsDrawer({ isHost, tabs, tab, onTab, banner, children, onClose }: DrawerProps) {
  // the phone's back button closes it
  useBack(onClose);
  return (
    <div className="room-drawer-bd" onClick={onClose}>
      <aside className="room-drawer" role="dialog" aria-modal aria-label={isHost ? 'Settings' : 'Table settings'} onClick={(e) => e.stopPropagation()}>
        <header className="room-drawer-head">
          <b className="room-drawer-title">
            <Icon name="settings" size={22} className="room-drawer-icon" />
            {isHost ? 'Settings' : 'Table settings'}
          </b>
          {!isHost && <span className="muted small">Only the host can change these</span>}
          <span className="grow" />
          <button type="button" className="room-drawer-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>
        <nav className="lobby-tabs" role="tablist" aria-label="Lobby sections">
          {tabs.map(([t, label]) => (
            <button key={t} type="button" role="tab" className={cx('lobby-tab', t === tab && 'on')} aria-selected={t === tab} onClick={() => onTab(t)}>
              {label}
            </button>
          ))}
        </nav>
        {/* a new tab starts at its top */}
        <div key={tab} className="lobby-scroll">
          {tab === 'game' && banner}
          {children}
        </div>
      </aside>
    </div>
  );
}
