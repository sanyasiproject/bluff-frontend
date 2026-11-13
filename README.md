# Bluff frontend

Mobile-first React app for the Bluff card game. Connects to `bluff-backend` over Socket.IO and reads every move aloud with the phone's built-in voice.

## Run locally

Start the backend first (`npm run dev` in `bluff-backend`), then:

```bash
npm install
npm run dev      # http://localhost:5173
```

Open it in several browser tabs (or a normal + private window) to play as different people. Each tab is its own player.

## Play on real phones over home Wi-Fi

1. Mac and phones on the same Wi-Fi.
2. `npm run dev` prints a **Network** address, e.g. `http://192.168.1.5:5173`. Open that on each phone.
3. The app finds the backend on port 3001 of the same Mac automatically. If macOS asks whether `node` may accept incoming connections, allow it.

## Deploy on Vercel (free)

1. Push this folder to its own GitHub repo.
2. Vercel → **Add New → Project** → import the repo. Framework **Vite** is detected (build `npm run build`, output `dist`).
3. Environment variable `VITE_SERVER_URL` = your Render URL, e.g. `https://bluff-backend.onrender.com`. Deploy.
4. Put the Vercel URL into the backend's `CLIENT_ORIGIN` on Render and redeploy it.

`VITE_SERVER_URL` is baked in at build time, so redeploy the frontend after changing it.

`vercel.json` adds security headers (Content-Security-Policy, no framing, nosniff, Referrer-Policy, Permissions-Policy). Its `connect-src` names the Render backend (`https://` and `wss://`): **if the backend URL changes, update it there too**, or the app can't reach the server.

## Invite links

- The lobby has **WhatsApp**, **Share…** (phone share sheet) and **Copy**. They send `Join my Bluff game 🃏 Room code: ABCD` plus `https://<site>/?room=ABCD`.
- Opening the link joins that room directly: a phone that already had a seat there gets it back, a phone with a saved name joins at once, and a new phone only types a name and taps **Join room ABCD**.
- The `?room=` part is removed from the address bar once inside, so reloading or leaving never re-joins by itself.

## Accounts

- When the backend has a database, the home screen offers **Log in / Sign up**; otherwise only guest play is shown.
- Logged-in players play under their account name; wins, losses, stats and coins are saved. **My stats** shows lifetime numbers and the last 10 games.
- Admins get an **Admin** button: a **Guest play** On/Off switch (asks first; when off, guests see "Log in to play" instead of Create/Join), search all users, give or take coins (with a reason), make someone admin.
- The login token is kept in the browser and sent as `Authorization: Bearer …` to the API and in the socket handshake.

## Coins, friends and hosting

- **Top-right corner:** coins + avatar (with level and a red count of friend requests) opens the full **Profile** page: level and XP, coins and rank, daily rewards, record, play style, achievements, recent games, Friends, Admin and Log out. Guests see **Log in**.
- **Daily rewards:** a popup shows the +200 login bonus; the Game over screen shows each player's stake result, the daily games reward they reached, and how many more games until the next one.
- **Stakes:** the host picks Free … 10L in the lobby; the lobby explains it in one line and the Start button says what's blocking (guests, not enough coins).
- **Friends:** search players by name (shows if they exist, their level, and online status for friends only) and tap **+ Add**; accept requests (a red count shows new ones live), see who's online, add players straight from the lobby, and **Invite** online friends. They get a popup with a Join button.
- **Host tools:** ✕ next to a player in the lobby, or 👥 in the game, removes someone.
- **End game:** once someone finishes 1st, the host can end the game: 1st place wins, everyone else loses.
- **Leave game:** any player can leave from ⋯ during a game (asks first). It counts as a loss and still pays the stake; in 2v2 the team loses. They stay in the pot and show as 🚪 Left · Lost on the end screen.
- **Join requests:** after a game starts, newcomers see "Waiting for the host…" with Cancel. The host isn't interrupted: they hear a knock, see a short "Ravi wants to watch" note, and a pulsing 👀 button with a count appears in the top bar and opens the list (No / Let in / Let everyone in). Anyone still waiting gets in when the room goes back to the lobby. After asking, or a no, there's a 10 s wait before asking again.
- **Join a friend:** in Friends, a friend in a lobby shows **Join** and **👀 Watch**; once their game is on, **👀 Ask to watch** sends the host a request. Joining gives up your current lobby seat.
- **Bots:** the host taps **🤖 Add a bot** in the lobby (one per tap, any free seat; ✕ removes). Bots show 🤖 on their seat, think for a human-like moment, peek, call, lie and chat in their own style. With bots the stake goes up to 🪙 100; bots put in nothing, a person who wins takes every seat's stake, and coins lost to a bot are gone. A person must always be playing.
- **Player profiles:** tap a player in the lobby or in Friends (list, requests, search) to see their public card: level, record, badges and a friend button. Not during a game.
- **Make host:** in the lobby the host taps a player → 👑 Make host (asks first).
- **Room extras:** 🔍 Peek power (No / 1–3), 🎲 Bet your call (coin games: one Bet button next to Bluff opens a sheet to pick the amount) and 👥 Teams 2 vs 2 (team slots in the lobby: take an empty slot or ask to 🔄 swap; team colours, 🤝 partner's cards in the game, Shuffle).
- **Rules & features** (admins only, from the profile): every rule and feature in one page, to explain the app to friends.
- **Phone back button:** closes one step at a time (sheet, page, lobby → home, in a game it opens the menu) and only leaves the app from the home page (`src/lib/back.ts`).
- **Motion:** cards deal out to every seat at the start, fly to the pile on each play and to whoever picks it up after a reveal; the turn seat gets a running gold ring; reveals land like a stamp; confetti when someone finishes, for a caught liar's caller and for winners; coins and XP count up. Home has a swaying card fan (tap it to peek), a shining title and floating suits. All of it turns off with the phone's reduce-motion setting.
- **Intro screen** while the app loads and the free server wakes up (`components/Splash.tsx`, with the same markup in `index.html` for the first paint).

## Crazy 7 (second game)

- **Pick the game:** at the top of the lobby the host chooses 🃏 Bluff (default) or 7️⃣ Crazy 7; the settings below follow the game and everyone else sees them as chips. Rooms, seats (2–5), bots, coins, invites, watching and host tools are shared.
- **Settings:** coins at stake, cards each (5 or 7), picks per turn (1–7), Stack 7s (On/Off), 1 or 2 decks.
- **Play:** match the top card's suit or number. Cards you can play lift and glow green, the rest fade; one tap plays a card. The deck glows when you may pick (tap it, or **Pick a card · n left**); **Pass** appears only when the room allows more than 1 pick a turn, after you've picked: it stops picking early. At the limit you must play a card that fits. With nothing to match, the first card is picked for you.
- **7s:** a big red banner shows the waiting pick ("Pick 4 or play a 7!"); only 7s glow; **Pick N** (or the deck, whose tip then says Pick N) takes it. With Stack 7s on, everyone hit by a 7 taps Pick N themselves, so nobody can tell who holds a 7; with it off the pick is taken for them.
- **📢 Last card** shows on your turn with 2 cards ("say it, then play") and right after you're down to 1; it turns red and shakes ("Say LAST CARD now!") while you're at risk. You're caught only when another player plays, picks or passes before you say it; if the turn just comes back to you, you can still say it or play your last card. Caught: next turn you pick 1 (plus any waiting 7) and miss it, and your hand shows 🙊 Missed. Seats show 📢, a red **1 card!** and 🙊. Bots wait at least 3.5 s when a person is at risk, and sometimes forget to say it themselves.
- **Table:** seats start from the player after you and that seat is tagged **next**; under the pile "Ravi played 7♠"; tapping a card off-turn says "Wait for your turn". A reload or rejoin mid-game doesn't replay the deal. If the host is offline anyone can Stop the game from ⋯.
- **Motion and sound:** the played card flies face up to the pile and lands (a 7 sends out a red shock ring and its own sting), picked cards fly from the deck, a bell rings for any Last card call, a buzz for a catch, a riffle when the pile is shuffled back in, and the winner gets confetti.
- If nobody can play and nothing is left to pick, the fewest cards wins. Leaving mid-game is a loss; in a 2-player game the other wins.
- Game over uses the same screen: the winner wins, everyone else lost (with cards left).

## Game screen

- Top bar: room code, pot, 👀 join requests (host, only when someone is waiting), 💬 quick chat and ⋯ (voice, people, stop game, leave).
- Quick chat is a small tray (emoji row + message pills); messages float up like emoji, wait a second at the top, and also show on the sender's seat.
- Tap an opponent's seat to throw an emoji at them (20: 🌹💋👏🎉😂🍅🥚💣😡🪓🩴👊💩🎂🍻😱🥺🙏😝🤡, 5 per row) or, for friends, send 🎁 coins. Everyone sees it wind up, arc and land with an animated hit and its own synthesized sound: 💣 fuse burns then blasts (screen flash, shock rings, smoke, scorch, nearby seats pushed back), 🍅 squashes into a splat and drips, 🥚 cracks open with a wobbling yolk, 💋 stamps lips and hearts, 🌹 drops petals, 👏 claps with applause, 😂 cries tears with HA HA HA, 🎉 bursts confetti, 😡 boils red with steam from the ears, 🪓 thunks in and sticks wobbling, 🩴 lands a "THAPP!" slap and bounces off, 👊 goes "DHISHOOM!" with dizzy stars, 💩 splats with buzzing flies, 🎂 smashes into frosting and its candles puff out, 🍻 mugs clink "CHEERS!" with foam, 😱 screams "AAAA!" with hair on end and a cold shiver, 🥺 begs "Pleaseee" with big shiny eyes, 🙏 bows twice with golden rays and "Plz yaar!", 😝 teases with its tongue out and two hands on its head, fingers flapping ("BLEHH!", nyah-nyah tune), 🤡 springs in with honks and "JOKER!". Hard hits on your own seat buzz on Android. New throws go at the end of `THROWS` (the index is what's sent), and the axe, chappal and egg are drawn in code (`fx/props.ts`, `fx/shapes.ts`) because Noto has no animated version, as are the teasing hands on 😝. `public/fx` is about 1.6 MB (about 208 KB compressed); each file loads only when its throw lands. Reduced motion: the emoji just appears on the person.
- Throw code: `components/Flyers.tsx` (loader) and `components/fx/` (effects, loaded with the first throw), sounds in `lib/throwSounds.ts`, styles in `styles/throws.css`. Animated emoji are Lottie files in `public/fx/`, played by `lottie-web` 5.13.0 (light build, no eval or workers, so it fits the CSP), each fetched only when that throw lands.
- **Credit:** animated emoji are [Noto Animated Emoji](https://googlefonts.github.io/noto-emoji-animation/) by Google, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (unmodified; a credit line sits under the throw buttons). Keep the credit if the files change, and note any edits. `lottie-web` is MIT.
- Your turn: gold glow and a YOUR TURN bar above your cards. Seats show each player's last move (e.g. 3 × Q).
- Bluff is limited to 2 calls in a row; the button shows "last call", then "Bluff locked" until you play or pass.

## Chat, watching and awards

- **💬 Quick chat** (lobby and table): 8 emoji reactions and 26 quick messages float up on every screen with the sender's name (never the top banner). Edit the lists in `src/types.ts` (and the same file in the backend).
- **Watch mode:** joining when 5 are seated, or mid-game once the host lets you in, makes you a watcher: you see the table, hear the voice and can chat; you get a seat in the next game. In the lobby anyone can switch **🎮 Playing / 👀 Watching**; a chosen watcher keeps watching until they switch back. The host can also move anyone from their player card (Move to watching / playing).
  - Watchers see the real cards of each play face up (green = matches the claim, red = bluff).
  - Watchers see one player's hand at a time: it follows whoever's turn it is, or tap a player to stick to them ("Follow turn" goes back).
  - Only watchers' phones receive these cards; seated players never get anyone else's hand.
- **Awards** on the Game over screen: Biggest liar, Smoothest liar, Best detective, Trust issues, Card collector. The voice also announces the Biggest liar.

## Install as an app

Bluff is a Progressive Web App: friends install it from the website, free, with no app store.

- **Android (Chrome):** tap **Install** on the home screen card, or browser menu ⋮ → **Install app**.
- **iPhone (Safari):** Share ⬆ → **Add to Home Screen** → **Add**. The Install card shows these steps.
- It then opens full screen from its own icon and updates itself after every Vercel deploy.
- `public/sw.js` loads fresh files first and keeps a copy only so the app can open without internet. `public/icons/app-icon.svg` is the source of the PNG icons.
- Install **before** joining a game: on iPhone the installed app has its own storage, so a seat taken in Safari isn't carried over.

## Voice

- Uses the browser's speech feature: no audio files, no paid service.
- **Girl voice is the default.** Each phone can switch Girl / Boy in the lobby; the choice is remembered on that phone and the voice name is shown under it.
- Browsers don't report a voice's gender, so the app matches known voice names (Samantha, Heera, Google UK English Female…). Android voice names don't say the gender, so there it uses the phone's Indian-English voice with a slightly higher pitch; for a different voice, change the voice in Android's text-to-speech settings.
- iPhone allows speech only after the first tap; any tap in the app unlocks it. "Test" in the lobby checks it.
- If nothing is heard on iPhone, check the silent switch and volume. 🔊 / 🔇 in the game header turns the voice on or off for that phone.

## Code map

| File | What it does |
|---|---|
| `src/useBluff.ts` | Connection, auto-rejoin, announcements, all player actions |
| `src/components/Table.tsx` | Game screen: seats, pile, bluff button, action bar |
| `src/components/Crazy7Table.tsx` | Crazy 7 game screen: seats, deck, pile, penalty banner, playable glow, Pick / Pass / Last card |
| `src/components/Lobby.tsx` | Game picker (Bluff / Crazy 7), settings for each game, players, bots, teams |
| `src/components/Hand.tsx` | Fits any hand size into overlapping rows |
| `src/components/Overlays.tsx` | Rank picker, pick-one sheet, bluff reveal, game over |
| `src/lib/speech.ts` | Voice queue and iPhone unlock |
| `src/types.ts` | Copy of `bluff-backend/src/types.ts`; keep both in sync |
