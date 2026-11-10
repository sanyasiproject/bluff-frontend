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
- Admins get an **Admin** button: search all users, give or take coins (with a reason), make someone admin.
- The login token is kept in the browser and sent as `Authorization: Bearer …` to the API and in the socket handshake.

## Coins, friends and hosting

- **Top-right corner:** coins + avatar (with level and a red count of friend requests) opens the full **Profile** page: level and XP, coins and rank, daily rewards, record, play style, achievements, recent games, Friends, Admin and Log out. Guests see **Log in**.
- **Daily rewards:** a popup shows the +200 login bonus; the Game over screen shows each player's stake result, the daily games reward they reached, and how many more games until the next one.
- **Stakes:** the host picks Free … 10L in the lobby; the lobby explains it in one line and the Start button says what's blocking (guests, not enough coins).
- **Friends:** search players by name (shows if they exist, their level, and online status for friends only) and tap **+ Add**; accept requests (a red count shows new ones live), see who's online, add players straight from the lobby, and **Invite** online friends. They get a popup with a Join button.
- **Host tools:** ✕ next to a player in the lobby, or 👥 in the game, removes someone.
- **End game:** once someone finishes 1st, the host can end the game: 1st place wins, everyone else loses.
- **Leave game:** any player can leave from ⋯ during a game (asks first). It counts as a loss and still pays the stake; in 2v2 the team loses. They stay in the pot and show as 🚪 Left · Lost on the end screen.
- **Join requests:** after a game starts, newcomers see "Waiting for the host…" with Cancel. The host isn't interrupted: a 👀 button with a count appears in the top bar and opens the list (No / Let in / Let everyone in). Anyone still waiting gets in when the room goes back to the lobby.
- **Player profiles:** tap a player in the lobby or in Friends (list, requests, search) to see their public card: level, record, badges and a friend button. Not during a game.
- **Make host:** in the lobby the host taps a player → 👑 Make host (asks first).
- **Room extras:** 🔍 Peek power (No / 1–3), 🎲 Bet your call (coin games: one Bet button next to Bluff opens a sheet to pick the amount) and 👥 Teams 2 vs 2 (team slots in the lobby: take an empty slot or ask to 🔄 swap; team colours, 🤝 partner's cards in the game, Shuffle).
- **Rules & features** (admins only, from the profile): every rule and feature in one page, to explain the app to friends.
- **Phone back button:** closes one step at a time (sheet, page, lobby → home, in a game it opens the menu) and only leaves the app from the home page (`src/lib/back.ts`).
- **Motion:** cards deal out to every seat at the start, fly to the pile on each play and to whoever picks it up after a reveal; the turn seat gets a running gold ring; reveals land like a stamp; confetti when someone finishes, for a caught liar's caller and for winners; coins and XP count up. Home has a swaying card fan (tap it to peek), a shining title and floating suits. All of it turns off with the phone's reduce-motion setting.
- **Intro screen** while the app loads and the free server wakes up (`components/Splash.tsx`, with the same markup in `index.html` for the first paint).

## Game screen

- Top bar: room code, pot, 👀 join requests (host, only when someone is waiting), 💬 quick chat and ⋯ (voice, people, stop game, leave).
- Quick chat is a small tray (emoji row + message pills); messages float up like emoji, wait a second at the top, and also show on the sender's seat.
- Tap an opponent's seat to throw an emoji at them (🌹💋👏🎉😂🍅🥚💣) or, for friends, send 🎁 coins. Everyone sees it fly and land with its own effect (`components/Flyers.tsx`): 💣 explodes and shakes the seat, 🍅 and 🥚 splat and drip, 💋 beats with hearts, 🌹 sways with petals, 👏 claps, 😂 rocks with HA HA, 🎉 pops confetti.
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
| `src/components/Hand.tsx` | Fits any hand size into overlapping rows |
| `src/components/Overlays.tsx` | Rank picker, pick-one sheet, bluff reveal, game over |
| `src/lib/speech.ts` | Voice queue and iPhone unlock |
| `src/types.ts` | Copy of `bluff-backend/src/types.ts`; keep both in sync |
