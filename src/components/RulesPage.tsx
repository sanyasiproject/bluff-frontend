import type { ReactNode } from 'react';
import { compactCoins, formatCoins, stakeLabel } from '../lib/coins';
import { achievementsOf, TITLES } from '../lib/progress';
import {
  BET_STEPS,
  DAILY_GAME_REWARDS,
  LOGIN_BONUS,
  MAX_BLUFF_CALLS_IN_A_ROW,
  MAX_PEEKS,
  MIN_REWARD_GAME_SEC,
  STAKES,
  XP_RULES,
  xpForLevel,
} from '../types';
import { FullPage } from './FullPage';

const ZERO = { gamesPlayed: 0, wins: 0, losses: 0, bluffs: 0, bluffsCaught: 0, goodCalls: 0, wrongCalls: 0, cardsPickedUp: 0 };

function Section({ icon, title, open, children }: { icon: string; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="panel rules-section" open={open}>
      <summary>
        <span>{icon}</span> {title}
      </summary>
      <div className="rules-body">{children}</div>
    </details>
  );
}

/** admin-only reference: every rule and feature, to explain the app to friends */
export function RulesPage({ onClose }: { onClose: () => void }) {
  const ladder = DAILY_GAME_REWARDS.map((r) => `${r.games} game${r.games > 1 ? 's' : ''} → +${formatCoins(r.coins)}`).join(' · ');
  const maxDaily = DAILY_GAME_REWARDS.reduce((sum, r) => sum + r.coins, 0);

  return (
    <FullPage title="Rules & features" onBack={onClose}>
      <p className="muted small">Only admins see this page. Tap a section to open it.</p>

      <Section icon="🃏" title="How to play" open>
        <ul>
          <li>2 to 5 players. All cards are dealt; empty your hand to finish.</li>
          <li>The round starter puts down 1 or more cards face down and calls a rank. They can lie.</li>
          <li>Everyone after must put down cards of that same rank (truth or lie), or pass.</li>
          <li>If everyone passes, the pile is cleared and the last player starts a new round.</li>
          <li>The last player still holding cards loses. Places 1st, 2nd… are shown at the end.</li>
          <li>Cards go down in the order they were tapped. Double-tap a card to select every card of that rank.</li>
        </ul>
      </Section>

      <Section icon="🤥" title="Calling bluff">
        <ul>
          <li>Anyone (not the player who just played) can tap Bluff! on the last play.</li>
          <li>
            <b>Show all</b>: every card of that play is turned over. <b>Pick one</b> (default): the caller chooses one face-down card.
          </li>
          <li>Caught lying: the liar picks up the whole pile. It was true: the caller picks it up. The winner of the call starts the next round.</li>
          <li>You can call bluff at most {MAX_BLUFF_CALLS_IN_A_ROW} times in a row; playing or passing your turn unlocks it.</li>
        </ul>
      </Section>

      <Section icon="⚙️" title="Room settings (host)">
        <ul>
          <li>
            <b>Coins at stake</b> per player: {STAKES.map(stakeLabel).join(', ')}. Coin games need everyone logged in.
          </li>
          <li>
            <b>Cards</b>: 1 deck (52, default) or 2 decks (104).
          </li>
          <li>
            <b>Bluff rule</b>: Show all or Pick one (default).
          </li>
          <li>
            <b>🔍 Peek power</b>: No (default) or Yes with 1–{MAX_PEEKS} peeks per player per game.
          </li>
          <li>
            <b>🎲 Bet your call</b> (coin games only): Off (default) or On.
          </li>
          <li>
            <b>👥 Teams</b>: Off (default) or 2 vs 2 (exactly 4 players).
          </li>
          <li>Players who aren't the host see all settings as chips in the lobby.</li>
        </ul>
      </Section>

      <Section icon="🔍" title="Peek power">
        <ul>
          <li>When it's on, each player gets the chosen number of peeks for the whole game.</li>
          <li>Before calling bluff, tap 🔍 Peek and choose one face-down card of the last play to see it.</li>
          <li>Only you see the card. Everyone else sees "Ravi used a peek".</li>
          <li>You can't peek at your own play, and peeks don't carry over to the next game.</li>
        </ul>
      </Section>

      <Section icon="🎲" title="Bet your call">
        <ul>
          <li>Only in coin games with the setting on.</li>
          <li>Tap 🪙 Bet and pick an amount first, then tap Bluff!. Steps: {BET_STEPS.map(compactCoins).join(', ')}.</li>
          <li>You can never bet more than the room's stake, or more than you can still afford.</li>
          <li>Right call: you win the bet from that player. Wrong call: you pay it to them.</li>
          <li>Like the stake, bets are paid when the game finishes. A stopped game moves no coins.</li>
        </ul>
      </Section>

      <Section icon="👥" title="Teams 2 vs 2">
        <ul>
          <li>Exactly 4 players in 4 team slots: 🔵 blue (2 slots) against 🟠 orange (2 slots). Turns alternate between the teams.</li>
          <li>In the lobby, tap an empty slot to pick your team and partner, or 🔄 Swap to ask someone to trade places (they get Accept / No thanks).</li>
          <li>The host can also tap 🔀 Shuffle teams.</li>
          <li>During the game you can open 🤝 your partner's cards (read-only) to plan together; the other team never sees them.</li>
          <li>You can't call bluff on your partner. Your partner has 🤝 on their seat.</li>
          <li>The first team with both partners out wins; the other team loses. A coin pot is split between the winners.</li>
          <li>If the host removes a player mid-game, the game stops and no coins move.</li>
        </ul>
      </Section>

      <Section icon="🏁" title="Ending a game">
        <ul>
          <li>Normal end: when only one player (or one team) is left, the game is over.</li>
          <li>
            <b>End game</b> (host): once someone has finished 1st, the host can end it. 1st place (or their team) wins, everyone else
            loses. It counts as a finished game.
          </li>
          <li>
            <b>Stop game</b> (host, ⋯ menu): ends it with no winner. No coins, XP or stats move.
          </li>
          <li>
            <b>Play again</b> (host, end screen): deals the same table again with the same settings.
          </li>
        </ul>
      </Section>

      <Section icon="👑" title="Host tools">
        <ul>
          <li>Tap a player in the lobby to open their card. The host also gets: Make host, Move to watching/playing, Remove from room.</li>
          <li>The host can remove people during a game (People in the ⋯ menu); their cards leave the game and they pay or win nothing.</li>
          <li>If the host leaves, the next player becomes the host.</li>
        </ul>
      </Section>

      <Section icon="👀" title="Watch mode">
        <ul>
          <li>Up to 5 play and 7 more can watch (12 per room).</li>
          <li>People who join mid-game, or when 5 are seated, watch and get the next free seat.</li>
          <li>Anyone can switch 🎮 Playing / 👀 Watching in the lobby; a chosen watcher stays watching until they switch back.</li>
          <li>Watchers see the real cards of each play and one player's hand (following the turn, or a player they tap).</li>
        </ul>
      </Section>

      <Section icon="🪙" title="Coins & daily rewards">
        <ul>
          <li>New accounts start with coins (1,000 by default) plus the first daily bonus.</li>
          <li>+{LOGIN_BONUS} every day you open the app.</li>
          <li>
            Daily games ladder: {ladder}. Up to {formatCoins(maxDaily)} a day, win or lose. Only games of {MIN_REWARD_GAME_SEC / 60} minute or
            more count; it starts again at midnight (India time).
          </li>
          <li>Stakes: everyone pays when the game finishes and the winner takes the pot. Stopped games move nothing.</li>
          <li>Coins are only for fun inside the app; there's no real money.</li>
        </ul>
      </Section>

      <Section icon="📈" title="Levels, XP & titles">
        <ul>
          <li>
            XP per finished game: +{XP_RULES.game} for playing, +{XP_RULES.win} for winning, +{XP_RULES.goodCall} per liar caught, +
            {XP_RULES.cleanBluff} per bluff nobody caught.
          </li>
          <li>Each level needs 100 XP more than the one before. Levels never go down.</li>
          <li>
            Titles:{' '}
            {TITLES.map((t) => `${t.emoji} ${t.title} (Lv ${t.level}, ${formatCoins(xpForLevel(t.level))} XP)`).join(' · ')}
          </li>
          <li>Players see their XP and level ups on the end screen, and a full guide under "How to earn XP" on their profile.</li>
        </ul>
      </Section>

      <Section icon="🏅" title="Achievements">
        <ul>
          {achievementsOf(ZERO, 0).map((a) => (
            <li key={a.title}>
              {a.emoji} <b>{a.title}</b>: {a.desc}
              {a.private ? ' (coin badge, not shown on public profiles)' : ''}
            </li>
          ))}
        </ul>
      </Section>

      <Section icon="🤝" title="Friends & profiles">
        <ul>
          <li>Friends: search by username or name, then + Add. Requests show as a red number on the avatar and Friends button.</li>
          <li>Add friends straight from the lobby, and invite online friends who aren't in a room (they get a Join popup).</li>
          <li>Tap anyone in the lobby or Friends to see their public card: level, record and badges. Never coins or private data.</li>
          <li>Your own Profile: level ring, coins and rank, rewards, record, play style, achievements and the last 10 games.</li>
        </ul>
      </Section>

      <Section icon="🛠" title="Admin tools">
        <ul>
          <li>Admin (from your profile): search every account and open one.</li>
          <li>On a user's page: give or take coins with a reason, rename, make admin or player, block or unblock, reset password.</li>
          <li>Block and role changes ask first. Every change is kept in the admin history (10 per page).</li>
          <li>You can't change your own role or block yourself.</li>
        </ul>
      </Section>

      <Section icon="📱" title="App tips">
        <ul>
          <li>Install from the home screen card (Android: Install; iPhone: Share → Add to Home Screen).</li>
          <li>Invite with the WhatsApp, Share or Copy buttons; the link drops friends straight into the room.</li>
          <li>💬 quick chat: emoji reactions and short messages. 🔊 sound and voice can be muted from the ⋯ menu.</li>
          <li>The phone's back button closes one step at a time and only leaves the app from the home page.</li>
          <li>If the free server is asleep, the intro screen waits until it wakes (up to about a minute).</li>
        </ul>
      </Section>
    </FullPage>
  );
}
