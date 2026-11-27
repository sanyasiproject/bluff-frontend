# bluff-frontend — guide for Claude

Landscape-first React app (phones play sideways, like Uno) for **Game Baithak** (`APP_NAME`), a home for free real-time 2–4 player games with friends: Ludo, Saanp Seedhi, Raja Mantri Chor Sipahi, Bluff, Crazy 7, Rang. The Bluff *game* keeps its name; repo names, storage keys and socket paths stay `bluff`.
Deployed on Vercel (https://bluff-frontend.vercel.app, auto-deploys `main`). The server is the sibling repo
`bluff-backend` (Render). If both repos sit side by side, the parent folder's `CLAUDE.md` has the whole-project
guide, the feature list and the owner's working preferences. Read it first.

## Stack

React 18 + Vite 8 + TypeScript, socket.io-client, no UI library. All styles are in `src/styles.css` (colour tokens in
`:root`, green felt theme). Voice: Web Speech API (`lib/speech.ts`); sounds: Web Audio (`lib/sounds.ts`); PWA via
`public/manifest.webmanifest` and `public/sw.js`.

## Map

| File | Role |
|---|---|
| `src/types.ts` | Copy of `bluff-backend/src/types.ts`. **Never edit here first**: change the backend file and copy it over |
| `src/App.tsx` | Picks the screen: intro (`Splash`) → admin → Home → Lobby → Table; popups |
| `src/useBluff.ts` | Socket connection, room state, every game/room action |
| `src/useAuth.ts` | Login state, coins, friend-request count, profile data |
| `components/Lobby.tsx` | Game picker (🃏 Bluff / 7️⃣ Crazy 7, host), players (bots get a 🤖 row and 🤖 Add a bot), settings per game (Bluff extras: Peek, Bet, Teams, and 🤖 Bot level once a bot is seated; Crazy 7: cards each, picks per turn, Stack 7s; stake capped with bots), 2v2 slots and swap popup, host tools via `PlayerSheet` |
| `components/LobbyRoom.tsx`, `LobbySettings.tsx`, `styles/land-room.css` | Landscape room: the same 3D table as the game, players seated at the rail, glowing "+" open seats (host: add a bot or invite), you at the near side, a settings summary sign on the felt and the settings in a right drawer (`SettingsDrawer`, the same blocks as portrait), dock with Leave, Invite, Play/Watch and Start / I'm ready. All state and actions stay in `Lobby.tsx` |
| `components/FriendsSheet.tsx` | Search, requests, friends, invites; Ask to join / 👀 Watch a friend's room (they say yes in `JoinAsks`, top right) (`actions.joinFriend`) |
| `components/GameHub.tsx`, `games/lastPlayed.ts`, `styles/land-hub.css` | Home game hub: a tile per `GAME_CATALOG` game (category chips, NEW, ▶ Last played per phone), sideways one scrolling row; a tile opens `PlayPanel` with that game picked (`actions.create(name, game)`) |
| `games/registry.tsx`, `games/GameOptions.tsx` | The game registry: every game after Rang plugs in here (`PLUGGED` kind → lazy `Table` + `Rules`); `App` routes `isPlugged` games to `PluggedTable`; lobby rows from catalog `options` (`when`), stored in `config.opts`; moves go through `actions.gameMove` (`game:move`); the handshake sends `games: [...PLUGGED_GAMES]` |
| `games/ludo/` (`LudoTable`, `LudoBoard`, `Gotis`, `Dice`, `LudoSeat`, `LudoOver`, `LudoLooks`, `looks.ts`, `geometry.ts`, `sounds.ts`, `LudoLesson`, `LudoRules`, `preview.tsx`), `styles/land-ludo*.css` | Ludo: tilted SVG board turned so my colour is near-left, standing gotis that hop along `ludoPath` from `LudoView.last`, CSS 3D dice on `rollSeq`, kill fly-back + shake, banners, podium + kill recap then `GameOver`, looks per phone by level. Dev only: `?ludoPreview=1|auto|kill|over`, `?homePreview`, `?lobbyPreview=ludo` (`games/devPreviews.tsx`, wired in `boot.tsx`) |
| `games/snakes/` (`SnakesTable`, `SnakesBoard`, `Tokens`, `SnakesSeat`, `SnakesOver`, `SnakesRules`, `geometry.ts`, `sounds.ts`, `preview.tsx`), `styles/land-snakes.css` | Saanp Seedhi: a flat, bright board (reuses the Ludo CSS with `--lu-tilt: 0deg`, `Pawn`, `Dice`, `LudoMenus`, looks), SVG snakes and ladders from `SNAKES`/`LADDERS`, gotis animated from `SnakesView.last` (hop, bounce, slide, bite), the dice held by the roller until the goti moved. Dev only: `?snakesPreview=1|auto|over&dice=N&me=N` |
| `games/rmcs/` (`RmcsTable`, `Chit`, `RmcsSeat`, `RmcsOver`, `RmcsRules`, `fx.ts`, `sounds.ts`, `preview.tsx`), `styles/land-rmcs*.css` | Raja Mantri Chor Sipahi: seats round a wooden table, paper chits (deal, unfold, Raja reveal, Mantri spotlight and guess, siren / runner, flying points), score board, podium with round history. Lobby blocks Start below the catalog's `minPlayers`. Dev only: `?rmcsPreview=1|mantri|raja|chor|result|over|watch` |
| `games/fruit/` (`FruitTable`, `engine.ts`, `draw.ts`, `art.ts`, `ArcadeSeat`, `clock.ts`, `FruitOver`, `FruitRules`, `sounds.ts`, `preview.tsx`), `styles/land-arcade.css`, `styles/land-fruit.css` | Fruit Slice Duel: a bright sky dojo with bokeh, everyone's same big fruit (`fruitWave(seed)`) on a 60 fps canvas, swipe blade, halves + juice, combo/bomb popups, shake, others' cuts as coloured slashes, player cards in left and right columns (fruit fly between them), timer + mini scoreboard, podium. `clock.ts` keeps the server-clock offset from each view's `now`; `ArcadeSeat` and the sound helpers are shared with Spike Attack. Moves go through `actions.gameMoveQuiet` (no toasts for late swipes). Dev only: `?fruitPreview=1|over&n=2..4&time=45|60` |
| `games/spikes/` (`SpikesTable`, `Arena`, `Pad`, `SpikesOver`, `SpikesRules`, `sim.ts`, `sounds.ts`, `preview.tsx`), `styles/land-spikes.css` | Spike Attack: a neon arena redrawn each frame (red striped warning lines with 3-2-1, edge launcher, a sliding spike wall, red hit flash), blob players with hearts and name tags that hop (my steps predicted), hearts and ghosts, arrow pad under the right thumb, swipe / drag-walk and keyboard arrows / WASD, ticking before strikes. Dev only: `?spikesPreview=1|over&n=2..4&size=5|6&speed=fast` (local sim with bots) |
| `games/turnkit/` (`base.ts`, `PartySeat`, `PartyChrome`, `PartyOver`, `audio.ts`, `fakeRoom.ts`), `styles/land-party.css` | Shared by the turn-based party tables (Darts, Dots and Boxes, Colour Wars): seat order and `PARTY_COLORS`, corner seats, banners, the top bar / menus (with game wording) / game over flow, a podium in player colours, Web Audio helpers and the dev previews' fake room |
| `games/darts/` (`DartsTable`, `DartBoard`, `Aim`, `Dart`, `Chalkboard`, `DartsRules`, `sounds.ts`, `preview.tsx`), `styles/land-darts.css` | Darts: our own dartboard on a pub wall, hold-to-aim reticle that wobbles (`wobble`, steadiest after ~0.7 s, lifted above a finger), dart flight + thud + wobble, caller's pops, bust / 180 / checkout moments, chalkboard of points left. Dev only: `?dartsPreview=1|finish|over&n=2..4&start=301|501` |
| `games/dots/` (`DotsTable`, `DotsBoard`, `DotsRules`, `sounds.ts`, `preview.tsx`), `styles/land-dots.css` | Dots and Boxes: graph paper on the tilted table drawn in HTML (SVG blurred in the 3D plane), tap diamonds per line, drag dot to dot, ghost line, pen-stroke lines, boxes pop with initials, "Go again!". Dev only: `?dotsPreview=1|late|over&n=2..4&size=4..6` |
| `games/colorwar/` (`ColorWarTable`, `ColorWarBoard`, `sim.ts`, `ColorWarRules`, `sounds.ts`, `preview.tsx`), `styles/land-colorwar.css` | Colour Wars: a tray of rounded cells with glossy blobs (3-dot cells tremble), each tap replayed wave by wave from `last.waves` (`sim.replay`: flash, flying blobs, colour flips), out toasts. Dev only: `?colorwarPreview=1|mid|over&n=2..4&size=5|7` |
| `games/RulesSheet.tsx` | Rules sheet shown by `TutorialPage` for registry games without a practice lesson (Saanp Seedhi, Raja Mantri) |
| `components/GameStats.tsx` | Profile 🎮 Games: a card per game from `stats.perGame` (older totals as fallback), Ludo kills/home/sixes |
| `components/Home.tsx`, `PlayPanel.tsx`, `HomeDock.tsx`, `HomeNotice.tsx` | Home is a game main menu: logo and one ▶ Play (opens `PlayPanel`: name, Create a room, Join with a code; invite links open it straight away), a dock of round buttons (Missions, League, Shop, Spin, Friends, How to play, Get app; locked for guests), an "Online now" list on the left (`OnlineList`) and the green online count by the profile and at most one small one-time notice (name check, invite notifications). Keep the main stage clean: new home features go in the dock |
| `components/OnlineFriends.tsx`, `lib/onlineFriends.ts` | 🟢 Home "Online now" strip and the online count (corner pill, lobby Friends button); one shared friends poll (`useOnlineFriends`) |
| `components/FriendOnline.tsx`, `FriendAlertsRow.tsx`, `lib/friendAlerts.ts` | "👋 came online" card (top right, every screen, mounted in `App`; groups arrivals; Invite in a lobby; chime) and its per-phone Profile switch |
| `components/Table.tsx` | The Bluff game: seats, pile, Bluff / Peek / Bet, partner cards, hand, menus, end game. Exports `Seat`, `SeatSheet`, `GameMenu`, `useOnChange` for Crazy 7 |
| `components/Crazy7Table.tsx` | The Crazy 7 game (`App` picks it when `view.config.game === 'crazy7'`): deck, pile, 7 penalty banner, playable cards glow (`Hand` `playable`/`dimRest`), Pick / Pass / 📢 Last card, move animations from view diffs |
| `main.tsx`, `boot.tsx`, `lib/landscapeShell.ts` | Touch phones and tablets run the app inside a shell frame that turns 90° while the phone is upright, so the game always sees landscape (no "turn your phone"); `boot.tsx` is the app itself. Code inside the game can check `insideShell()` |
| `components/RotateGate.tsx`, `lib/orientation.ts`, `lib/useLandscape.ts`, `styles/landscape.css` | Landscape helpers: the fallback "Turn your phone" card, `autoFullscreen` (touch phones go full screen on the first tap to hide the status bar; through the shell when inside it), `useLandscape()`, shared tokens (`--u`, `--safe-*`) |
| `components/TableScene.tsx`, `Table3D.tsx`, `styles/land-world.css` | The 3D table world every game shares: one tilted plane (rim, felt, lamp); `OnTable` puts things on it (lying, or `stand` facing you), `seatSpots` seats opponents at the far rail, `OppCards` / `Pile3D` are cards on the felt. Keep felt items 2px+ above the felt |
| `components/TableFx.tsx`, `styles/table-fx.css` | Uno-style effects for Rang and Crazy 7: `useTableFx()` gives `fx(kind, element, { text, color, shake })` (skip, reverse, draw, wild, call, missed) and a `layer` to render once; fired from each table's move effects |
| `components/TableInfo.tsx` | The one place for what isn't needed every second: ☰ room button (secret-mission badge) and its panel (secret mission, my counts, `tableRules`, tips, last moves) |
| `components/FanHand.tsx`, `FlyingCards.tsx`, `styles/land-table.css` | The hand, centred with equal room both sides (`fanLayout`, 3D lift when picked, Bluff's rank stacks with a how-many chooser), cards in flight (arc, turn over, land at the table's lean), top bar, the corner buttons (`.side-actions`, `.action-bar`) |
| `components/RangTable.tsx`, `RangCard.tsx` | The Rang game (third game): colour cards, deck and pile, penalties, colour and swap pickers |
| `components/Overlays.tsx` | `Backdrop` (every sheet/modal), rank/pick/peek/bet sheets, reveal, game over, people list |
| `components/ProfilePage.tsx`, `ProfileParts.tsx`, `ProfileTabs.tsx`, `XpGuide.tsx` | Your profile: header, then Stats · Social · Looks · Settings tabs (last tab remembered per phone); levels, achievements, games |
| `components/MissionsPage.tsx`, `SecretMissions.tsx` | 🎯 Missions page and its Home/Profile button (daily and weekly sets, the daily swap, the games ladder); 🤫 secret mission card pill by the hand and its game-over reveal |
| `components/LeaguePage.tsx`, `Rivals.tsx`, `Ranked.tsx` | 🏆 Friends league page and button; ❤️ games together on friends' cards and the profile (💖 for the most played); 🏅 rank card (season day / countdown, past seasons), chip and game-over line |
| `components/LieRecap.tsx`, `Saza.tsx` | Game-over Lie reveal (tap a name for every play and leftover cards) and Saza badges (sticker, picker) |
| `components/LiveVoice.tsx`, `lib/liveVoice.ts` | 🎧 Live voice: hear/talk buttons, seat marks, the one quiet line; WebRTC peers kept in step with `RoomView` by `LiveVoiceSync` in `App` |
| `components/PlayerSheet.tsx` | Public card for any player (no private data) |
| `components/AdminPanel.tsx`, `AdminUserPage.tsx` | Admin user list and user page |
| `components/RulesPage.tsx` | Admin-only "📖 Rules & features": **update it whenever a rule or feature changes** |
| `lib/back.ts` | `useBack(handler)`: the phone back button closes one step at a time |
| `lib/progress.ts` | Titles, level info, achievements, daily-ladder helpers |
| `lib/motion.ts` | `confetti` / `confettiAt`, `useCountUp`, `reducedMotion` |
| `components/Flyers.tsx`, `components/fx/`, `lib/throwSounds.ts`, `styles/throws.css`, `public/fx/` | Emoji throws and coin gifts: lazy-loaded effects engine, Noto animated emoji (Lottie, CC BY 4.0: keep the credit under the throw buttons) played by `lottie-web` light |
| `components/Ambient.tsx`, `Rolling.tsx`, `FlyingCards.tsx` | Home card fan (tap to peek), shining title, floating suits; counting numbers; cards flying to the pile, seats and hand |

## Patterns to reuse

- Sheets and popups: `Backdrop` (bottom sheet, or `center` for a modal). Full-screen pages: `FullPage`. Both handle the phone back button.
- Risky actions get an in-app confirm popup (see `confirm-box` in Table / AdminUserPage), not `window.confirm`.
- Keep screens simple: few words, one button that opens a sheet rather than many inline controls. Design for a phone held sideways first (844x390, 667x375), then check a laptop (1440x900). New landscape styles go in the screen's own `styles/land-*.css` inside `@media (orientation: landscape)`; portrait styles stay for narrow desktop windows.
- `vercel.json` sets security headers. Its CSP `connect-src` lists the Render backend (https + wss): update it if the backend URL changes. No inline scripts (CSP `script-src 'self'`).
- Motion: animate only `transform` / `opacity` (the "motion pass" section at the end of `styles.css`). Containers that may hold fixed sheets use `backwards` fill so no transform is left behind. Everything stops under the phone's reduced-motion setting; JS motion checks `reducedMotion()`.
- `cx(...)` joins class names; coins are shown with `formatCoins` / `compactCoins` (Indian grouping).

## Commands

```bash
npm run dev
```
(Vite on :5173; it talks to `http://<same host>:3001` unless `VITE_SERVER_URL` is set)

```bash
npm run build
```
(type-checks, then builds; must pass before committing)

To try several players in one browser, use different addresses for separate storage: `http://localhost:5173`,
`http://127.0.0.1:5173`, `http://[::1]:5173`.

## How to add a new game (frontend)

1. Backend first (`GameKind`, `PLUGGED_GAMES`, `GAME_CATALOG` entry, `PluggedView`/`PluggedMove` variants), then copy `types.ts` here.
2. `src/games/<kind>/`: a table taking `TableProps` that reads `view.plugged` and sends `actions.gameMove({ kind, move })`; optional `Rules`.
3. Add it to `PLUGGED` in `games/registry.tsx`. Routing, handshake, lobby options, home tile and profile card then follow from the catalog.
4. Reuse `Seat`/`SeatSheet`, `TableInfo`, `GameOver`, `useTableFx`, `confetti`; own `styles/land-<game>*.css`; transform/opacity only, `reducedMotion()`.
5. Lesson or rules sheet (branch in `TutorialPage`), Rules page section, `lib/i18n/hi.<game>.ts`, a map row here and in the README.

## Rules of thumb

- Commit or push only when the owner asks. Commit with the repo's configured identity and end messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push after the backend:
  ```bash
  GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main
  ```
- Match the existing style; short one-line comments; no secrets in code.
