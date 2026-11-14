import type { ReactNode } from 'react';
import { compactCoins, formatCoins, stakeLabel } from '../lib/coins';
import { achievementsOf, TITLES } from '../lib/progress';
import {
  AVATAR_BACKGROUNDS,
  AVATAR_CHARACTERS,
  AVATAR_FACES,
  BET_STEPS,
  BOT_MAX_STAKE,
  CRAZY7_HAND_SIZES,
  CRAZY7_MAX_PICKS,
  DAILY_GAME_REWARDS,
  LOGIN_BONUS,
  MAX_BLUFF_CALLS_IN_A_ROW,
  MAX_PEEKS,
  MIN_REWARD_GAME_SEC,
  SEVEN_PENALTY,
  STAKES,
  THROWS,
  XP_RULES,
  xpForLevel,
} from '../types';
import { FullPage } from './FullPage';

const ZERO = { gamesPlayed: 0, wins: 0, losses: 0, bluffs: 0, bluffsCaught: 0, goodCalls: 0, wrongCalls: 0, cardsPickedUp: 0, plays: 0, chances: 0, crazy7Games: 0 };

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

      <Section icon="7️⃣" title="Crazy 7 (second game)">
        <ul>
          <li>The host picks the game at the top of the lobby: 🃏 Bluff (default) or 7️⃣ Crazy 7. Same rooms, seats (2–5), bots, coins and tools.</li>
          <li>
            Everyone gets {CRAZY7_HAND_SIZES.join(' or ')} cards (host's choice, 7 by default). The rest is the deck; its top card starts the pile.
            A 7 is never the starting card.
          </li>
          <li>On your turn play one card that matches the top card's suit or number (on 5♥: any ♥ or any 5). Cards you can play glow.</li>
          <li>
            <b>Picking</b>: if nothing matches, 1 card is picked for you automatically. With <b>Picks per turn</b> above 1 (1 to{' '}
            {CRAZY7_MAX_PICKS}, default 1) you may pick more, or <b>Pass</b> to stop picking early. Pass only ever ends picking: you can't pass
            without picking first, and at the limit you must play a card that fits. With 1 pick a turn there is no Pass. You can also pick on
            purpose instead of playing. Reaching the limit with nothing to play passes your turn for you. Automatic picks and passes happen one at a time with a short pause (“Raju has no match · picking a card…”), so everyone can see them.
          </li>
          <li>
            <b>The 7</b>: the next player picks {SEVEN_PENALTY} and misses their turn. With <b>Stack 7s</b> on (default) they can answer with their own 7
            instead, and the next player then picks {SEVEN_PENALTY * 2}, then {SEVEN_PENALTY * 3}… While a pick waits, only a 7 can be played. With
            stacking on, everyone hit by a 7 taps <b>Pick N</b> themselves (so nobody can tell who holds a 7); with it off, the pick is taken for them.
          </li>
          <li>
            <b>📢 Last card</b>: say it with the button on your turn while you hold 2 cards (say it, then play), or right after your play. You're
            caught only if another player makes a move (play, pick or pass) before you say it. If the turn just comes back round to you, you can
            still say it, or play your last card. Caught: on your next turn you pick 1 (plus any 7 waiting for you) and miss that turn.
          </li>
          <li>Bots usually say last card, but now and then they forget too, so you can catch them.</li>
          <li>When the deck runs out, the pile (except its top card) is shuffled into a new deck.</li>
          <li>The first player to empty their hand wins at once; everyone else loses. Coins: everyone pays the stake, the winner takes the pot.</li>
          <li>If nobody can play and nothing is left to pick, the game ends and the player with the fewest cards wins.</li>
          <li>Leaving mid-game is a loss (you still pay); in a 2-player game the other player wins straight away.</li>
          <li>Host tools: Stop game and Play again work as in Bluff. There's no End game (the first one out already ends it).</li>
          <li>
            Awards: 🎯 Sevens master, 🧲 Card collector (most cards picked), 🙊 Forgot to call. XP and daily rewards count like Bluff. Cards picked
            in Crazy 7 don't count towards the lifetime 🧲 Collector achievement (that one is for Bluff piles).
          </li>
          <li>Peek, Bet and Teams settings are kept when you switch to Crazy 7 and back; Crazy 7 just ignores them.</li>
        </ul>
      </Section>

      <Section icon="⚙️" title="Room settings (host)">
        <ul>
          <li>
            <b>Game</b>: 🃏 Bluff or 7️⃣ Crazy 7, picked at the top of the lobby. The settings below follow the game.
          </li>
          <li>
            <b>Crazy 7</b>: cards each (5 or 7), picks per turn (1–{CRAZY7_MAX_PICKS}), Stack 7s (On/Off), 1 or 2 decks, coins at stake.
          </li>
          <li>
            <b>Coins at stake</b> per player: {STAKES.map(stakeLabel).join(', ')}. Coin games need everyone logged in. With bots at the
            table the stake goes up to {BOT_MAX_STAKE}.
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

      <Section icon="🤖" title="Bots">
        <ul>
          <li>The host taps 🤖 Add a bot in the lobby; each tap seats one bot in a free seat. Remove one with ✕. A person must always be playing.</li>
          <li>
            Bots play Crazy 7 too: they keep track of the cards played and of who had nothing to match, think ahead before each move, and
            usually say Last card (now and then they forget). Like a person, they only know their own cards. When a person has just gone down to
            one card without saying it, bots wait at least 3.5 seconds before their move, so there's time to tap the button.
          </li>
          <li>
            Every bot gets its own style (careful, wild liar, detective, sneaky, gambler…) with its own random numbers, and its mood shifts
            from game to game, so no two bots play alike and their moves can't be guessed.
          </li>
          <li>
            Bots only know what a seated player could know: their own cards, the claims, cards turned over, and their own cards in a pile
            someone picked up. They never see anyone's hand.
          </li>
          <li>
            Every player has a lie rate and a call rate. Bots read them from your saved record when you join, then keep watching you at the
            table, and lie or call against you to match. Nothing is looked up during the game.
          </li>
          <li>
            Bots notice habits without catching you: a player who never passes when they likely have none of the rank, or who claims more of
            a rank than they probably hold, gets called. Played cards stay in the order you tapped them, so if you always tap your fake last
            (or first), bots learn where to look. They also lie more against players who never call.
          </li>
          <li>Bots take a human-like moment to think, and the pause doesn't depend on whether they're lying. They can peek and chat, but never bet.</li>
          <li>
            Coins: with bots the stake is at most 🪙 {BOT_MAX_STAKE}. Bots put in nothing. If a person wins, they take the stake for every seat,
            bots' seats included. Coins a person loses to a bot (stake or bet) are simply gone; a bet won from a bot is paid in full.
          </li>
          <li>Games with bots count for XP, stats and the daily games reward like any other game.</li>
          <li>
            A room is never left to bots: when the last person leaves, the room closes. Once no person holds cards, the game ends straight
            away (except 2 vs 2, which plays on to find the winning team).
          </li>
          <li>Bots wait while no person is connected. They can't be the host or sit out to watch; in 2 vs 2 they swap places at once.</li>
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
          <li>
            <b>Leave game</b> (any player, ⋯ menu, asks first): counts as a loss and you still pay the stake. In 2 vs 2 your team loses;
            if only one player is left, they win. Leavers show as 🚪 Left · Lost on the end screen.
          </li>
        </ul>
      </Section>

      <Section icon="👑" title="Host tools">
        <ul>
          <li>Tap a player in the lobby to open their card. The host also gets: Make host, Move to watching/playing, Remove from room.</li>
          <li>The host can remove people during a game (People in the ⋯ menu); their cards leave the game and they pay or win nothing.</li>
          <li>If the host leaves, the next player becomes the host.</li>
          <li>
            Join requests: once a game has started, newcomers must ask. Nothing blocks the game: the host hears a knock, sees a short note, and a
            pulsing 👀 button with a count appears at the top. Open it to Let in, No, or Let everyone in. Anyone still waiting gets in when the
            room goes back to the lobby.
          </li>
        </ul>
      </Section>

      <Section icon="👀" title="Watch mode">
        <ul>
          <li>Up to 5 play and 7 more can watch (12 per room).</li>
          <li>When 5 are seated, newcomers watch and get the next free seat.</li>
          <li>After a game has started, newcomers wait until the host lets them in, then watch and play the next game.</li>
          <li>After asking to watch, or being told no, a player waits 10 seconds before they can ask again.</li>
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
          <li>Players see their XP on the end screen, and a full guide under "How to earn XP" on their profile.</li>
          <li>
            Level up: a full-screen "Level up! Lv N" with the title (✨ New title! when it changes) and any table or card back that level unlocks.
          </li>
          <li>
            🎨 Table &amp; cards (Profile): felt themes unlock at Lv 3, 6, 10, 15, 20, 30 and card backs at Lv 2, 5, 8, 12, 18, 25, 40. Both are your
            showpiece: everyone at the table sees your seat box in your table style, and your face-down cards in your card back (the cards you
            play onto the pile, cards flying to your hand). Your own screen uses your table as the felt.
          </li>
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
          <li>Add friends straight from the lobby, and invite friends who aren't in a room (they get a Join popup).</li>
          <li>
            🔔 Invite notifications are on by default: an invite reaches a friend whose Bluff is closed as a phone notification, and tapping it
            opens the room. The phone asks "Allow notifications?" when a player logs in or signs up (players already logged in see a one-time
            card on Home), and a phone that allowed it before is signed up by itself. Each player can switch it off in Profile; it then stays off
            on that phone. Works in Android browsers and the installed app; on iPhone only in the app added to the Home Screen.
          </li>
          <li>
            Join a friend from Friends: while they're in a lobby, tap Join (take a seat) or 👀 Watch. Once their game has started, tap 👀 Ask
            to watch and the host decides.
          </li>
          <li>Tap anyone in the lobby or Friends to see their public card: level, record and badges. Never coins or private data.</li>
          <li>
            🎭 Avatars: tap your picture on the Profile page to pick a girl or boy character ({AVATAR_CHARACTERS.length}, some waving, pointing or
            on the phone) or an emoji face ({AVATAR_FACES.length}), and a background ({AVATAR_BACKGROUNDS.length}). The rarest unlock with level,
            up to 👑 at Lv 40 and the rainbow background at Lv 30; gold, galaxy and rainbow shimmer. Everyone sees it on your seat, in lobbies,
            Friends and profiles. Guests and players who haven't picked one keep their first letter. Character art: Avataaars by Pablo Stanley and
            Notionists by Zoish.
          </li>
          <li>Your own Profile: level ring, coins and rank, rewards, record, play style, achievements and the last 10 games.</li>
        </ul>
      </Section>

      <Section icon="🛡" title="Safety & limits">
        <ul>
          <li>One room per account: joining a new room leaves your old one. Not allowed while you still have cards there, or it's open on another device.</li>
          <li>Search, profile cards and friend actions: up to 20 a minute per player.</li>
          <li>Online status is shown only to friends.</li>
          <li>Each network can open about 10 rooms in 10 minutes and keep 5 open at once, so nobody can flood the server.</li>
        </ul>
      </Section>

      <Section icon="🛠" title="Admin tools">
        <ul>
          <li>Admin (from your profile): search every account and open one.</li>
          <li>On a user's page: give or take coins with a reason, rename, make admin or player, block or unblock, reset password.</li>
          <li>Block and role changes ask first. Every change is kept in the admin history (10 per page).</li>
          <li>You can't change your own role or block yourself.</li>
          <li>
            Guest play (top of the Admin page): turn it off and everyone must log in to create or join a room. Guests already in a room can
            finish their game. It asks first, and open apps update straight away.
          </li>
          <li>
            Invite notifications (under Guest play on the Admin page): turn them off and invites only reach friends who have Bluff open. It
            asks first, and open apps update straight away. Shows "Not set up on the server" until the push keys are set.
          </li>
        </ul>
      </Section>

      <Section icon="📱" title="App tips">
        <ul>
          <li>Install from the home screen card (Android: Install; iPhone: Share → Add to Home Screen).</li>
          <li>Invite with the WhatsApp, Share or Copy buttons; the link drops friends straight into the room.</li>
          <li>💬 quick chat: emoji and short messages float up the screen (messages wait a second at the top). 🔊 sound and voice can be muted from the ⋯ menu.</li>
          <li>Voice: Girl or Boy in the lobby. Phones without a male voice get a deeper version of the same voice.</li>
          <li>
            Throw an emoji at someone ({THROWS.length} to pick from: {THROWS.join(' ')}): tap their seat in a game, or their name in the lobby.
            Everyone sees it wind up, arc across and land with its own animated hit and sound: the bomb's fuse burns then blows up the seat,
            the tomato squashes into a splat, the egg cracks, lips stamp a kiss, the rose drops petals, hands clap, the laughing face cries
            tears, the popper bursts confetti, the angry face boils red with steam, the axe thunks in and sticks, the chappal lands a THAPP!
            slap, the punch goes DHISHOOM! with dizzy stars, the poop splats with flies, the cake smashes into frosting, the mugs clink
            CHEERS!, the scared face screams AAAA! with its hair on end, the puppy eyes beg Pleaseee, the folded hands bow with Plz yaar!,
            the teasing face sticks its tongue out with both hands on its head (BLEHH!), and the joker honks JOKER!. Hard hits on your own
            seat give a small buzz on Android.
          </li>
          <li>
            Animated emoji: Noto Animated Emoji by Google, licensed CC BY 4.0 (credited under the throw buttons). Player: lottie-web (MIT).
          </li>
          <li>🎁 Gift coins to a friend (10, 25, 50 or 100) from the same places or their card in Friends. Up to 100 coins a day in total; in a room everyone sees the coins fly.</li>
          <li>The phone's back button closes one step at a time and only leaves the app from the home page.</li>
          <li>Tap the cards on the home screen to peek at the middle one. Animations follow the phone's reduce-motion setting.</li>
          <li>
            📘 Practice tutorial: a 1-minute scripted game against Raju 🤖 for each game, with arrows on what to tap. Every account is offered it
            once in the lobby before its first game of that kind (Practice now / Skip); it's always open from 📘 How to play on Home and in the lobby.
          </li>
          <li>Hold the pile in a game to drop 😂 🤥 👀 🔥 😱 on the last play; everyone sees it pop onto the pile with your name.</li>
          <li>
            Down to one card: that seat gets a pulsing gold spotlight with a heartbeat and a buzz. Game over: a 🏆 with fireworks, a 👑 on the
            winner's seat and 🙈 over the losers.
          </li>
          <li>If the free server is asleep, the intro screen waits until it wakes (up to about a minute).</li>
        </ul>
      </Section>
    </FullPage>
  );
}
