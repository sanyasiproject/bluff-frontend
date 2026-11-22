import type { ReactNode } from 'react';
import { compactCoins, formatCoins, stakeLabel } from '../lib/coins';
import { achievementsOf, TITLES } from '../lib/progress';
import {
  AVATAR_BACKGROUNDS,
  AVATAR_CHARACTERS,
  CARD_BACKS,
  TABLE_THEMES,
  AVATAR_FACES,
  BET_STEPS,
  BOT_STAKE_CAPS,
  CRAZY7_HAND_SIZES,
  CRAZY7_MAX_PICKS,
  DAILY_GAME_REWARDS,
  LEAGUE_CROWNS,
  LEAGUE_POINTS,
  LOGIN_BONUS,
  LOGIN_STREAK_REWARDS,
  SPIN_PRIZES,
  TURN_SECONDS,
  TURN_TIMER,
  WIN_STREAK_SHOWN,
  MAX_BLUFF_CALLS_IN_A_ROW,
  MAX_PEEKS,
  RANG_HAND_SIZE,
  RANG_MAX_PICKS,
  RANG_MISSED_PENALTY,
  TWO_PENALTY,
  REPLAY_KEEP_DAYS,
  MAX_CARD_SHIELDS,
  SHIELD_MAX_CARDS,
  MIN_REWARD_GAME_SEC,
  MISSIONS,
  MISSIONS_PER_SET,
  RANK_DIVISIONS,
  RANK_PROTECTION,
  RANK_SEASON_DROP,
  SEASON_START_DELAY_DAYS,
  SAZA_BADGES,
  SECRET_MISSIONS,
  SECRET_XP,
  SEVEN_PENALTY,
  SHOP_ITEMS,
  STAKES,
  THROWS,
  XP_RULES,
  xpForLevel,
  type MissionDef,
  type SecretMissionDef,
} from '../types';
import { DM_MAX_LENGTH } from '../types';
import { MAX_SHIELDS, PASS_SHIELD_COINS, PASS_TIER_XP, PASS_TIERS, PASS_XP } from '../types';
import { FullPage } from './FullPage';

/** the levels a catalog's locked items open at, lowest first */
const unlockLevels = (items: readonly { level: number }[]) =>
  [...new Set(items.map((i) => i.level).filter((l) => l > 1))].sort((a, b) => a - b).join(', ');

const ZERO = { gamesPlayed: 0, wins: 0, losses: 0, bluffs: 0, bluffsCaught: 0, goodCalls: 0, wrongCalls: 0, cardsPickedUp: 0, plays: 0, chances: 0, crazy7Games: 0, bonusXp: 0 };

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

/** one daily or weekly mission and what it pays */
const missionLine = (m: MissionDef) => (
  <li key={m.id}>
    {m.emoji} {m.title}: +{formatCoins(m.coins)} 🪙 · +{m.xp} XP{m.social ? ' (friend mission)' : ''}
  </li>
);

/** one secret mission card and how it's done */
const secretLine = (s: SecretMissionDef) => (
  <li key={s.id}>
    {s.emoji} <b>{s.title}</b>
    {s.how ? `: ${s.how}` : ''}
  </li>
);

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
          <li>
            You can call bluff at most {MAX_BLUFF_CALLS_IN_A_ROW} times in a row; playing or passing your turn unlocks it. A player's last
            cards can always be called, even then. With only 2 players left holding cards there's no limit.
          </li>
        </ul>
      </Section>

      <Section icon="🌈" title="Rang (third game)">
        <ul>
          <li>Our own colour-card game: 4 colours (🔴 🔵 🟢 🟡), numbers 0–9 and action cards. Same rooms, seats (2–5), bots, coins and tools.</li>
          <li>Everyone gets {RANG_HAND_SIZE} cards. The first card on the pile is always a number.</li>
          <li>On your turn play one card that matches the colour or the number/symbol on top (on a red 5: any red card or any 5).</li>
          <li>
            <b>⊘ Skip</b>: the next player misses a turn · <b>⇄ Reverse</b>: play turns the other way (with 2 players it works like a skip) ·{' '}
            <b>+2</b>: the next player picks 2 and misses a turn.
          </li>
          <li>
            <b>✦ Wild</b>: goes on anything; name the next colour · <b>+4 Wild</b>: name the colour, and the next player picks 4 and misses a
            turn.
          </li>
          <li>
            <b>Picks per turn</b> (1 to {RANG_MAX_PICKS}, host's choice, 1 by default): nothing fits, so a card is picked for you; you can keep
            picking until one fits, up to the limit. After any pick you may play a card that fits or Pass, even when the picked card fits.
          </li>
          <li>
            <b>➕ Stack</b> (on by default): answer a +2 with a +2 or a +4, and a +4 with a +4; the next player picks the total.
          </li>
          <li>
            <b>⚔️ Challenge the +4</b> (on by default): hit by a single +4? Challenge it. If its player held the colour in play, they pick 4
            and you play on; if the +4 was fair, you pick 6.
          </li>
          <li>
            <b>🔄 7-0 swap</b> (off by default): a 7 swaps your hand with a player you pick; a 0 passes every hand on in the direction of play.
            Not when it's your last card: then you simply win.
          </li>
          <li>
            <b>👯 Doubles</b> (off by default): when the top card is a number, put down all your cards of that number in one go (on a 4:
            every 4 you hold; on a green 8, a green 4 still goes alone). You pick which colour goes on top; the last
            one's colour is next. A doubled 7 or 0 swaps once.
          </li>
          <li>
            <b>⚡ Force play</b> (off by default): a card you pick that fits is played at once (a wild names the colour you hold most; a 7
            swaps with the smallest hand).
          </li>
          <li>
            <b>🃏 Cards each</b>: 5, 7 (default) or 10 · <b>📢 Forgot last card</b>: pick 1, 2 (default) or 4.
          </li>
          <li>
            <b>👥 2 vs 2</b> (off by default, exactly 4 players): partners sit opposite and play alternate turns with the other team. When one
            of you empties their hand, your team wins and splits the pot. A kick stops the game; a walk-out loses it for that team.
          </li>
          <li>📢 Last card works as in Crazy 7; forget it and you pick {RANG_MISSED_PENALTY} (or what the host set) and miss a turn.</li>
          <li>
            The first player to empty their hand wins. The rest are ranked by points left (numbers their face value, Skip/Reverse/+2 20, wilds
            50; lower is better); only the highest loses. Coins: everyone pays the stake, the winner takes the pot.
          </li>
        </ul>
      </Section>

      <Section icon="7️⃣" title="Crazy 7 (second game)">
        <ul>
          <li>The host picks the game at the top of the lobby: 🃏 Bluff (default), 7️⃣ Crazy 7 or 🌈 Rang. Same rooms, seats (2–5), bots, coins and tools.</li>
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
          <li>
            The first player to empty their hand wins at once. The rest are ranked by the value of cards left (A 1, 2–10 face value, J 11, Q 12, K 13; lower is better); only the highest loses. Coins: everyone
            pays the stake, the winner takes the pot.
          </li>
          <li>If nobody can play and nothing is left to pick, the game ends and the player with the fewest cards wins.</li>
          <li>
            <b>⚡ Power cards</b> (host's choice, off by default): <b>J</b> goes on anything and you name the next suit (the next card must be
            that suit or another J) · <b>8</b> skips the next player · <b>A</b> reverses the direction (with 2 players it works like a skip) ·{' '}
            <b>2</b> makes the next player pick {TWO_PENALTY}; with Stack 7s on, a 2 or a 7 answers either, and the total grows. The first card
            on the pile is never a power card.
          </li>
          <li>Leaving mid-game is a loss (you still pay); in a 2-player game the other player wins straight away.</li>
          <li>Host tools: Stop game and Play again work as in Bluff. There's no End game (the first one out already ends it).</li>
          <li>
            Awards: 🎯 Sevens master, 🧲 Card collector (most cards picked), 🙊 Forgot to call. XP and daily rewards count like Bluff. Cards picked
            in Crazy 7 don't count towards the lifetime 🧲 Collector achievement (that one is for Bluff piles).
          </li>
          <li>
            Peek, Bet, Teams, Saza, Lie reveal and the house twists are kept when you switch to Crazy 7 and back; Crazy 7 just ignores them (saza badges
            are hidden while Crazy 7 is picked).
          </li>
        </ul>
      </Section>

      <Section icon="⚙️" title="Room settings (host)">
        <ul>
          <li>
            <b>Game</b>: 🃏 Bluff, 7️⃣ Crazy 7 or 🌈 Rang, picked at the top of the lobby. The settings below follow the game.
          </li>
          <li>
            <b>Crazy 7</b>: cards each (5 or 7), picks per turn (1–{CRAZY7_MAX_PICKS}), Stack 7s (On/Off), 1 or 2 decks, coins at stake.
          </li>
          <li>
            <b>Coins at stake</b> per player: {STAKES.map(stakeLabel).join(', ')}. Coin games need everyone logged in. With bots at the
            table the bot level sets the most: Normal bots play only free games, Hard up to 🪙 {compactCoins(BOT_STAKE_CAPS.hard)}, Expert
            (and Crazy 7 bots) up to 🪙 {compactCoins(BOT_STAKE_CAPS.expert)}.
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
            <b>🔒 Card Shield</b>: Off (default) or 1–{MAX_CARD_SHIELDS} shields per player per game.
          </li>
          <li>
            <b>🎲 Bet your call</b> (coin games only): Off (default) or On.
          </li>
          <li>
            <b>👥 Teams</b>: Off (default) or 2 vs 2 (exactly 4 players).
          </li>
          <li>
            <b>🤡 Saza for the loser</b>: Off (default) or On.
          </li>
          <li>
            <b>🤥 Lie reveal</b>: On (default) or Off (lies stay secret).
          </li>
          <li>
            <b>🏅 Ranked</b> (Bluff): Off (default) or On. Only logged-in players, no bots.
          </li>
          <li>
            <b>🎭 Twists</b> (Bluff): Classic (both twists off, default) or Chaos (both on). A quick pick for the two rows below it.
          </li>
          <li>
            <b>🍀 Kismat card</b> (Bluff): Off (default) or On.
          </li>
          <li>
            <b>🪜 Seedhi</b> (Bluff): Off (default) or On.
          </li>
          <li>
            <b>🎧 Live voice</b> (both games): On (default) or Off.
          </li>
          <li>
            <b>⏰ Turn timer</b> (both games): Off (default), {TURN_SECONDS.join(', ')} seconds a turn. The server waits 5 more seconds after the
            clock shows 0 (and longer if it was itself stuck), so a short hiccup never costs a turn. Time up: the same brain the bots use plays the
            turn (it may lie or call; it never peeks; Crazy 7 always says last card). {TURN_TIMER.missesToAway} timeouts in a row: 💤 away,
            with {TURN_TIMER.awaySec}-second turns until they move again. Bots never have a clock.
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

      <Section icon="🔒" title="Card Shield">
        <ul>
          <li>When it's on, each player gets the chosen number of shields (1–{MAX_CARD_SHIELDS}) for the whole game.</li>
          <li>
            On your turn, tap 🔒 Card Shield above your hand, then play up to {SHIELD_MAX_CARDS} cards. Nobody can call bluff on that play or
            peek at it, so it always stands.
          </li>
          <li>Not on your last cards: a play that would empty your hand can't be shielded, so going out can always be called.</li>
          <li>Everyone sees the 🔒 on a shielded play. Shields don't carry over to the next game, and bots don't use them.</li>
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

      <Section icon="🤡" title="Saza for the loser">
        <ul>
          <li>
            Bluff only, when the host turns it on. When a game ends, the last player still holding cards gets a silly badge at random:{' '}
            {SAZA_BADGES.map((b) => `${b.emoji} ${b.name}`).join(', ')}. If you go out first against 2 or more bots, the game ends at once and
            the bot holding the highest card value (A 1 … K 13) gets it. Same after the host's End game: the highest card value left gets
            it (one of them at random on a tie).
          </li>
          <li>The winner can swap it for another one on the game-over screen, until everyone goes back to the lobby.</li>
          <li>
            Everyone sees it wobbling on that player's seat, in the lobby and in the results. It stays on through the next games until they win a
            Bluff game in this room (a 2 vs 2 win and the host's End game count). Bots can get one too.
          </li>
          <li>No new badge after 2 vs 2, or when players walk out: nobody was left last.</li>
          <li>Turning Saza off takes every badge off. Badges belong to the room: they aren't saved, and leaving the room takes yours off.</li>
        </ul>
      </Section>

      <Section icon="🤥" title="Lie reveal">
        <ul>
          <li>
            Bluff only, on unless the host turns it off. When the game ends, the lies nobody caught are turned face-up on the game-over screen:
            who said what and the real cards (✗ on each fake), boldest first, up to 6. Bots' lies are shown too.
          </li>
          <li>"Survived a call" means someone called it but turned over a real card.</li>
          <li>Below that: each player's lies, out of their plays, and how many got caught.</li>
          <li>
            Tap a name to see every play they made that game, truths too: what they said, the real cards (✓ real, ✗ fake) and whether it
            was caught, survived a call or got away, plus the cards they still held at the end.
          </li>
          <li>Nothing is shown while a game is on. With it off, every lie stays secret.</li>
        </ul>
      </Section>

      <Section icon="▶️" title="Game replay">
        <ul>
          <li>
            Every Bluff, Crazy 7 and Rang game is saved move by move (also when the host ends or stops it early). Profile → Recent games shows
            ▶ Replay on games saved since replays came in.
          </li>
          <li>
            The replay shows each seat's card count, whose turn it was, the pile, what the table heard, Bluff's claims and calls, and
            Crazy 7's top card. Play/pause, step back or forward, 1x/2x/4x speed, and tap or drag the bar to jump.
          </li>
          <li>
            Bluff: the real cards of each play (fakes marked) show only if the lie reveal was on. With lies kept secret, no played card is
            ever shown. Nobody's hand is shown, only how many cards they held.
          </li>
          <li>
            Only the players of that game (and admins) can open it. Very long games keep up to 800 steps. A replay is kept for{' '}
            {REPLAY_KEEP_DAYS} days; after that only the result stays.
          </li>
        </ul>
      </Section>

      <Section icon="🍀" title="House twists">
        <ul>
          <li>Bluff only, both off by default. The host turns each on in the lobby; the 🎭 Twists row sets both at once: Classic (both off) or Chaos (both on).</li>
          <li>
            <b>🍀 Kismat card</b>: at the deal one random rank is drawn for the whole game and shown to everyone (the 🍀 Kismat chip by the
            Round chip; tap it for a reminder). Cards of that rank are wild: they back up any claim. A play is a lie only if a card in it is
            neither the claimed rank nor the Kismat rank. You can claim the Kismat rank itself too.
          </li>
          <li>
            Kismat cards carry a small 🍀 in your hand, in bluff reveals and in the lie reveal, where they count as real (✓). With Pick one,
            turning over a Kismat card counts as a match.
          </li>
          <li>
            <b>🪜 Seedhi</b>: the round starter calls any rank. After that each call must be one rank down, the same, or one up from the last
            call (A and K wrap: after K comes Q, K or A; after A comes K, A or 2). Tap your cards, then one of the three rank buttons. The
            chip above the pile shows the next three ranks.
          </li>
          <li>A bluff call or a cleared pile starts a fresh round, so the next starter can call any rank again.</li>
          <li>Crazy 7 ignores both.</li>
          <li>Everyone seated needs the latest app: a twist game won't start until players on an older version reload it.</li>
        </ul>
      </Section>

      <Section icon="🤖" title="Bots">
        <ul>
          <li>The host taps 🤖 Add a bot in the lobby; each tap seats one bot in a free seat. Remove one with ✕. A person must always be playing.</li>
          <li>
            Bots play Crazy 7 too: they keep track of the cards played and of who had nothing to match, think ahead before each move, and
            usually say Last card (now and then they forget). Rang bots do the same, and also name colours, pick who to swap with and decide
            whether to challenge a +4 from what everyone could see. Like a person, they only know their own cards. When a person has just gone down to
            one card without saying it, bots wait at least 3.5 seconds before their move, so there's time to tap the button.
          </li>
          <li>
            🤖 Bot level (Bluff, host, at the top of Game settings once a bot is seated): Normal, Hard or Expert (the default). Normal is
            beatable and full of character; Expert counts every card, uses your saved habits and makes the fewest mistakes. The level also sets
            the most you can stake against them (free only / 🪙 {compactCoins(BOT_STAKE_CAPS.hard)} / 🪙 {compactCoins(BOT_STAKE_CAPS.expert)}).
            Crazy 7 and Rang bots always play their best.
          </li>
          <li>
            Every bot gets its own style (careful, wild liar, detective, sneaky, gambler…) with its own random numbers, and its mood shifts
            from game to game, so no two bots play alike and their moves can't be guessed. Styles show most at Normal.
          </li>
          <li>
            Bots are hard to read at every level. They lie often (more against players who never call bots), slip junk cards in with real ones,
            sometimes keep real cards back (now and then even passing while holding the rank, though a pass usually means they have none), and
            set the fake-now-real-later trap themselves. Every few rounds, and right after being caught, each bot switches plans: plain, heavy on fakes, full of tricks, or honest
            with sharp calls. Close calls go either way, and now and then a bot tests a small claim, so no lie is ever free.
          </li>
          <li>
            The trap (fake a rank you hold, then play your real ones when the claims look impossible) works on Normal bots. Hard and Expert
            bots weigh which claim of the round was really the lie: they see through it from your saved habits, or after being caught by it a
            few times in the same room.
          </li>
          <li>
            Bots count cards: their own, how many decks are in play, every claim of the round and the piles thrown away. A claim of more of a
            rank than can really be out there gets called almost every time (with 1 deck, 5 or more of a rank is always a lie; with 2 decks the
            line moves up), and so does a likely lie that would let someone go out.
          </li>
          <li>
            A player's last cards are always called, at every level: if that play stands, they're out. Under Pick one the bot may turn over
            any of those cards (likely fakes more often), so putting your real cards first or last doesn't fool it; good bots with a peek
            left look first.
          </li>
          <li>
            Your real habits are saved after every Bluff game: how often you lie and with how many cards, where you tap your fakes (cards stay in
            the order you tapped them), whether you pass or push a fake when you have none, whether you fake your last cards to finish, whether
            you keep real cards back, how your impossible-looking claims turn out, and how often you call bots' plays (their lies and their truths).
            Only the server and its bots read them, never another player, and bots read them before the game starts. Normal bots ignore them.
          </li>
          <li>
            Bots only know what a seated player could know, plus those saved habits: never anyone's hand, and never the cards of the play in
            front of them. They check their reads against every card turned over, so an honest player soon stops being called.
          </li>
          <li>
            Peeks are scarce, so good bots peek only when a look could change their call, at the card most likely to be fake; if it's fake, they
            call with that card. Bots also fake their last cards to go out when they think nobody will catch it.
          </li>
          <li>
            After any play, people get at least 2 seconds to call it before a bot moves (longer after big plays and when someone is going out).
            Bots take a human-like moment to think, and the pause doesn't depend on whether they're lying. They can peek and chat, but never bet.
          </li>
          <li>
            Coins: with bots the stake is at most what their level allows (Normal: free only · Hard: 🪙 {compactCoins(BOT_STAKE_CAPS.hard)} ·
            Expert and Crazy 7: 🪙 {compactCoins(BOT_STAKE_CAPS.expert)}). Adding a bot or picking a lower level brings a higher stake down.
            Bots put in nothing. If a person wins, they take the stake for every seat,
            bots' seats included. Coins a person loses to a bot (stake or bet) are simply gone; a bet won from a bot is paid in full.
          </li>
          <li>Games with bots count for XP, stats and the daily games reward like any other game.</li>
          <li>
            A room is never left to bots: when the last person leaves, the room closes. Once no person holds cards and the last play has been
            called or let go, the game ends straight away (except 2 vs 2, which plays on to find the winning team).
          </li>
          <li>Bots wait while no person is connected. They can't be the host or sit out to watch; in 2 vs 2 they swap places at once.</li>
        </ul>
      </Section>

      <Section icon="🏁" title="Ending a game">
        <ul>
          <li>Normal end: when only one player (or one team) is left, the game is over.</li>
          <li>
            <b>End game</b> (host): once someone has finished 1st, the host can end it. 1st place wins; those still holding cards are
            ranked by the value of cards left (A 1, 2–10 face value, J 11, Q 12, K 13; lower is better, equal values share a place) and only
            the highest loses. 2 vs 2: 1st place's team wins, the
            other team loses. It counts as a finished game.
          </li>
          <li>
            <b>Stop game</b> (host, ⋯ menu): ends it with no winner. No coins, XP or stats move.
          </li>
          <li>
            <b>Play again</b> (host, end screen): deals the same table again with the same settings.
          </li>
          <li>
            <b>Leave game</b> (any player, ⋯ menu, asks first): counts as a loss and you still pay the stake, even right after putting down
            your last cards if nobody has called them yet. In 2 vs 2 your team loses; if only one player is left, they win. Leavers show as 🚪
            Left · Lost on the end screen.
          </li>
        </ul>
      </Section>

      <Section icon="👑" title="Host tools">
        <ul>
          <li>
            ✅ Ready check: everyone in the lobby except the host gets 👍 I'm ready. Each player shows ✅ Ready or ⏳ Not ready, and the host's
            Start stays greyed out (⏳ Waiting for 2 players) until all of them are ready. Ready players can tap their button again to ask for a
            minute. A new stake, a different game, or turning 🏅 Ranked or a twist on or off asks everyone again; bots and players on an older version of the app always count as ready.
            Play again after a game keeps everyone's ready.
          </li>
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
          <li>
            🔥 Login streak: every day you open the app pays more, day 1 to 7: {LOGIN_STREAK_REWARDS.join(', ')}. Day 8 starts the week again (the
            streak count keeps going). Miss a day and it starts at day 1 ({LOGIN_BONUS}).
          </li>
          <li>
            🎡 Daily spin: one free spin a day (India time) on Home: {SPIN_PRIZES.map((p) => (p.kind === 'coins' ? `${p.amount} coins` : `${p.amount} XP`)).join(', ')}.
            The bigger the prize, the rarer it is.
          </li>
          <li>
            🔥 Win streak: finished games won in a row (any game, a 2v2 team win counts). From {WIN_STREAK_SHOWN} it pulses on the player's seat
            and lobby row. Any finished game not won starts it again; stopped games don't count.
          </li>
          <li>
            Daily games ladder: {ladder}. Up to {formatCoins(maxDaily)} a day, win or lose. Only games of {MIN_REWARD_GAME_SEC / 60} minute or
            more count; it starts again at midnight (India time).
          </li>
          <li>Stakes: everyone pays when the game finishes and the winner takes the pot. Stopped games move nothing.</li>
          <li>Coins are only for fun inside the app; there's no real money.</li>
        </ul>
      </Section>

      <Section icon="🛍️" title="Coin shop">
        <ul>
          <li>🛍️ Coin shop on Home and Profile. Everything is rented for a day or a week; nothing is kept for good.</li>
          <li>XP boosts (1.25x / 1.5x / 2x for a day, 1.25x / 1.5x for a week) multiply only a game's own XP, in games of {MIN_REWARD_GAME_SEC / 60} min or more.</li>
          <li>🛡️ Rank Shield (🪙 300 each, hold up to 5): used up on your next ranked loss, which then costs no rank points. Kept if you're at 0 points, where a loss costs nothing anyway.</li>
          <li>🪙 Coin Magnet: +25% on daily ladder and mission coins for 7 days.</li>
          <li>Auras show on your seat, card backs and profile. Win bursts and entry flashes are seen by everyone at the table.</li>
          <li>One XP boost and one coin boost at a time. Buying again adds time, up to 28 days ahead.</li>
          <li>{SHOP_ITEMS.map((i) => `${i.emoji} ${i.name} ${compactCoins(i.price)}`).join(' · ')}</li>
        </ul>
      </Section>

      <Section icon="🎯" title="Missions">
        <ul>
          <li>
            Logged-in players get {MISSIONS_PER_SET} daily missions and {MISSIONS_PER_SET} weekly ones (🎯 Missions on Home). Daily ones start
            again at midnight, weekly ones on Monday at midnight (India time).
          </li>
          <li>
            Each set has one friend mission (👯) and {MISSIONS_PER_SET - 1} others, all different. Every player gets their own set, and it stays
            the same all day (or all week).
          </li>
          <li>
            Only games that count for the daily games reward move them: finished, {MIN_REWARD_GAME_SEC / 60} minute or more, logged in, and not
            removed by the host. A friend game needs another logged-in player at the table who is your friend.
          </li>
          <li>
            Reaching the goal pays its coins and XP straight away, once; there's nothing to claim. Mission XP counts towards your level.
            Missions not finished by the reset just end.
          </li>
          <li>
            🎲 One free swap a day: change one unfinished mission, daily or weekly, for another one of that set's kind (daily or weekly) that
            isn't in the set. What comes in is never a friends mission, so a swap is the way out of one. The new one starts from 0.
          </li>
          <li>The game-over screen lists each mission that game finished, with its coins and XP.</li>
          <li>
            <b>Daily</b>:<ul>{MISSIONS.filter((m) => m.period === 'daily').map(missionLine)}</ul>
          </li>
          <li>
            <b>Weekly</b>:<ul>{MISSIONS.filter((m) => m.period === 'weekly').map(missionLine)}</ul>
          </li>
        </ul>
      </Section>

      <Section icon="🎟️" title="Season pass">
        <ul>
          <li>
            A free pass for logged-in players (🎟️ Season pass in Profile → Stats). It runs for the ranked season now on and starts again from
            0 when a new season starts.
          </li>
          <li>
            Pass XP comes from games that count (finished, {MIN_REWARD_GAME_SEC / 60} minute or more, logged in, not removed), Bluff and Crazy
            7: +{PASS_XP.game} a game, +{PASS_XP.win} more for a win, +{PASS_XP.mission} for each daily or weekly mission it finished.
          </li>
          <li>
            {PASS_TIERS.length} tiers of {PASS_TIER_XP} pass XP each. Each reached tier is claimed by tapping Claim (never automatic), once.
          </li>
          <li>
            Rewards: coins growing along the track, some bonus XP tiers, a 🛡️ Rank Shield at tiers{' '}
            {PASS_TIERS.flatMap((t, i) => (t.kind === 'shield' ? [i + 1] : [])).join(', ')} (🪙 {formatCoins(PASS_SHIELD_COINS)} instead when you
            already hold {MAX_SHIELDS}), and big coin prizes at 10, 20 and 30 (
            {[10, 20, 30].map((n) => `🪙 ${formatCoins(PASS_TIERS[n - 1].amount)}`).join(', ')}).
          </li>
          <li>The game-over screen shows the pass XP a game gave. Unclaimed rewards from an old season are gone when the new one starts.</li>
        </ul>
      </Section>

      <Section icon="🤫" title="Secret missions">
        <ul>
          <li>
            When a Bluff, Crazy 7 or Rang game starts, every person at the table gets a secret mission card for that game, at random (different cards
            when there are enough). Bots and watchers don't get one.
          </li>
          <li>
            Only you see your card: it sits above your cards with your progress and turns green with ✓ once it's done. Tap it to fold it into
            🤫 so nobody reads it over your shoulder, and tap again to open it.
          </li>
          <li>Only your own play in that game counts. Nobody, bots included, can see anyone else's card while the game is on.</li>
          <li>
            <b>Bluff cards</b>:<ul>{SECRET_MISSIONS.filter((s) => s.game === 'bluff').map(secretLine)}</ul>
          </li>
          <li>
            <b>Crazy 7 cards</b>:<ul>{SECRET_MISSIONS.filter((s) => s.game === 'crazy7').map(secretLine)}</ul>
          </li>
          <li>
            <b>Rang cards</b>:<ul>{SECRET_MISSIONS.filter((s) => s.game === 'rang').map(secretLine)}</ul>
          </li>
          <li>
            With 🤥 Lie reveal off, only Bluff cards that can't give a lie away are dealt (catching liars, putting down 4 cards). With Stack 7s
            off, nobody gets the card for answering a 7 with a 7.
          </li>
          <li>A lie counts as got past everyone only once it stood or survived a call, not when it was cut off by a walk-out or End game.</li>
          <li>
            Game over: everyone's card is turned over, ✓ done or ✗ not done. Tap a name to see their card face-up (what it asked and, on your
            own, how far you got), or Show all to turn every card over.
          </li>
          <li>
            A card done in a game that counts (finished, {MIN_REWARD_GAME_SEC / 60} minute or more, logged in, not removed by the host) gives +
            {SECRET_XP} XP towards your level, shown on the end screen. It also counts for the 🤫 missions.
          </li>
        </ul>
      </Section>

      <Section icon="🏆" title="Friends league">
        <ul>
          <li>
            A board of you and your friends that starts again every Monday at midnight (India time), so anyone can win any week. Open it
            from 🏆 Friends league on the home screen or your profile.
          </li>
          <li>
            Points: +{LEAGUE_POINTS.game} for each game, +{LEAGUE_POINTS.win} for a win, +{LEAGUE_POINTS.goodCall} for each liar you
            catch, +{LEAGUE_POINTS.cleanBluff} for each lie nobody catches (catches and lies count in Bluff). Coins never count.
          </li>
          <li>
            Only games of {MIN_REWARD_GAME_SEC / 60} minute or more with at least 2 logged-in players count, finished, Bluff, Crazy 7 or Rang.
            Bots, guests and players removed by the host don't count, and games against only bots don't count.
          </li>
          <li>
            Weekly crowns: {LEAGUE_CROWNS.map((c) => `${c.emoji} ${c.title}`).join(', ')} (most points, most liars caught, most lies
            nobody caught). Ties share a crown. Last week's winners stay up all week.
          </li>
          <li>The board shows you and the friends who played that week. "Hide me" takes you off your friends' boards; you still see your own.</li>
        </ul>
      </Section>

      <Section icon="❤️" title="Games together">
        <ul>
          <li>
            A friend's card shows ❤️ and how many games you finished together (every finished game of {MIN_REWARD_GAME_SEC / 60} minute or
            more you both played while logged in).
          </li>
          <li>The friend you've played with most gets a glowing 💖 Most played. When someone else passes them, the 💖 moves to that friend.</li>
          <li>Your profile (👥 Social) lists your friends by games together. Bots, guests and players removed by the host never count.</li>
        </ul>
      </Section>

      <Section icon="🏅" title="Ranked">
        <ul>
          <li>
            The host turns on 🏅 Ranked in the lobby (Bluff only). Everyone at the table must be logged in, and bots can't sit at a ranked
            table.
          </li>
          <li>
            A finished ranked game of {MIN_REWARD_GAME_SEC / 60} minute or more moves everyone's rank points: winning against strong
            players moves you up most. The order everyone finished in counts.
          </li>
          <li>
            Divisions: {RANK_DIVISIONS.map((d) => `${d.emoji} ${d.name} (${formatCoins(d.min)})`).join(', ')}. Each is split into tiers
            that climb from 1: Bronze and Silver 1–3, Gold and Platinum 1–4, Diamond 1–5 (Bluff Badshah has none). Tiers are just a
            marker of how far into a division you are. You keep showing a
            division until your points are {RANK_PROTECTION} below its start; past that you drop to the one below. Points never go below 0.
          </li>
          <li>
            The higher your division, the slower you climb: wins give a little less and losses take a little more. A 🛡️ Rank Shield from
            the coin shop makes one loss cost nothing.
          </li>
          <li>No daily limit: every win adds and every loss takes away, as many games as you play. Points never go below 0, and a loss at 0 costs nothing. In 2v2 the winning pair plays the losing pair.</li>
          <li>The host picks 🎮 Casual or 🏅 Ranked right under the game choice; everyone sees a gold RANKED banner in the lobby and a gold room code in the game. Everyone starts at {RANK_DIVISIONS[0].emoji} {RANK_DIVISIONS[0].name}. Your division shows on your profile and your player card, with your best and last 3 past seasons (tap All for every season).</li>
          <li>
            Seasons run about a month. An admin books the next one {SEASON_START_DELAY_DAYS} days ahead and everyone sees "ends in N days".
            When it starts, everyone drops {RANK_SEASON_DROP} divisions (never below 0) and the old season goes into their history.
          </li>
        </ul>
      </Section>

      <Section icon="📈" title="Levels, XP & titles">
        <ul>
          <li>
            XP per finished game: +{XP_RULES.game} for playing, +{XP_RULES.win} for winning, +{XP_RULES.goodCall} per liar caught, +
            {XP_RULES.cleanBluff} per bluff nobody caught. Missions add their own XP on top, and so does a secret mission card done (+
            {SECRET_XP}).
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
            🎨 Table &amp; cards (Profile): {TABLE_THEMES.length} felt themes unlock at Lv {unlockLevels(TABLE_THEMES)} and {CARD_BACKS.length} card
            backs at Lv {unlockLevels(CARD_BACKS)}. Both are your
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
            👋 Friend alerts: when a friend opens Bluff after 15 seconds or more away, a card shows in the top-right corner on any screen (home,
            lobby, in a game) with a soft chime. Friends who come online together share one card. In a lobby, Invite on the card invites them
            straight away. A quick reconnect, a friend already in your room, and a server restart don't trigger it. Each player can switch it
            off in Profile (per phone).
          </li>
          <li>
            🟢 Online now: Home shows which friends are online right now (free, in a lobby or in a game); tap one for Friends, or Join to take a
            seat in their lobby. A green count by your avatar opens Friends in one tap; in a lobby the count sits on the Friends button. Friends
            lists online friends first.
          </li>
          <li>
            Join a friend from Friends or Online now: tap Ask to join (or 👀 Watch). Nobody goes straight in: that friend gets a card at the
            top right and taps Let in or No. Room codes and invite links still let people straight in.
          </li>
          <li>Tap anyone in the lobby or Friends to see their public card: level, record and badges. Never coins or private data.</li>
          <li>
            🎭 Avatars: tap your picture on the Profile page to pick a girl or boy character ({AVATAR_CHARACTERS.length}, some waving, pointing or
            on the phone) or an emoji face ({AVATAR_FACES.length}), and a background ({AVATAR_BACKGROUNDS.length}). The rarest unlock with level,
            up to 👑 at Lv 40 and the rainbow background at Lv 30; gold, galaxy, rainbow and aurora shimmer. Everyone sees it on your seat, in lobbies,
            Friends and profiles. Guests and players who haven't picked one keep their first letter. Character art: Avataaars by Pablo Stanley and
            Notionists by Zoish.
          </li>
          <li>Your own Profile: level ring, XP and your ranked division this season on top, then four tabs (the last one used opens next time on that phone): 📊 Stats (rank, coins and rewards, missions, record, play style, achievements, the last 10 games), 👥 Social (online friends, Friends, rivals, league), 🎨 Looks (avatar, table and cards, coin shop) and ⚙️ Settings (notifications, friend alerts, admin, log out).</li>
        </ul>
      </Section>

      <Section icon="🗨️" title="Room chat">
        <ul>
          <li>The 💬 button in the lobby and at the table opens the room's chat: type a line (up to 200 characters) or use Quick Chat; both go into one list for everyone in the room, players and watchers.</li>
          <li>Someone who joins later sees the whole list. A red count on 💬 shows new lines since you last opened it.</li>
          <li>One room, one list: it keeps the last 500 lines, stays through every game in the room, and is gone when the room closes (never saved). A server restart clears it too.</li>
          <li>People you muted don't show in your list. A short wait between typed lines stops spam.</li>
        </ul>
      </Section>

      <Section icon="💬" title="Private messages">
        <ul>
          <li>Friends (accepted requests only) can message each other one to one: tap 💬 on a friend in Friends to open the chat.</li>
          <li>
            Messages are 1 to {DM_MAX_LENGTH} characters and arrive at once on every phone where the app is open. At most 20 a minute per
            sender; blocked accounts can't send or get messages.
          </li>
          <li>A red count on 💬 shows unread messages from that friend, and a 💬 pill at the top right shows the total. Opening a chat marks it read and shows "Seen" to the sender.</li>
          <li>The last 200 messages of each pair are kept; older ones are deleted. After unfriending, the chat is closed both ways.</li>
        </ul>
      </Section>

      <Section icon="🎧" title="Live voice">
        <ul>
          <li>
            🔊 turns hearing the others on or off; 🎙️ turns your mic on or off. They're in the game's top bar and in a row in the lobby.
            While 🎙️ is on you talk freely, no time limit.
          </li>
          <li>Only logged-in players with a seat can talk or hear; watchers and guests never. The host's voice switch in the lobby covers it too.</li>
          <li>
            Phones talk to each other directly; the server only helps them find each other. A seat shows 🎧 for someone in voice, or 🔇 when
            your phone can't hear them right now. It keeps trying quietly; nothing pops up over the game.
          </li>
          <li>The phone asks for the mic the first time. On iPhone, voice stops while the screen is locked or the app is in the background.</li>
        </ul>
      </Section>

      <Section icon="🛡" title="Safety & limits">
        <ul>
          <li>One room per account: joining a new room leaves your old one. Not allowed while you still have cards there, or it's open on another device.</li>
          <li>Search, profile cards and friend actions: up to 20 a minute per player.</li>
          <li>Online status is shown only to friends. When a friend is offline, Friends shows when they were last on (“seen 2 h ago”), and so does their card (“last online 2 h ago”).</li>
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
