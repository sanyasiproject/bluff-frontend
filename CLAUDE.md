# bluff-frontend — guide for Claude

Landscape-first React app (phones play sideways, like Uno) for **Bluff**, a free real-time card game for a group of friends.
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
| `components/FriendsSheet.tsx` | Search, requests, friends, invites; Ask to join / 👀 Watch a friend's room (they say yes in `JoinAsks`, top right) (`actions.joinFriend`) |
| `components/OnlineFriends.tsx`, `lib/onlineFriends.ts` | 🟢 Home "Online now" strip and the online count (corner pill, lobby Friends button); one shared friends poll (`useOnlineFriends`) |
| `components/FriendOnline.tsx`, `FriendAlertsRow.tsx`, `lib/friendAlerts.ts` | "👋 came online" card (top right, every screen, mounted in `App`; groups arrivals; Invite in a lobby; chime) and its per-phone Profile switch |
| `components/Table.tsx` | The Bluff game: seats, pile, Bluff / Peek / Bet, partner cards, hand, menus, end game. Exports `Seat`, `SeatSheet`, `GameMenu`, `useOnChange` for Crazy 7 |
| `components/Crazy7Table.tsx` | The Crazy 7 game (`App` picks it when `view.config.game === 'crazy7'`): deck, pile, 7 penalty banner, playable cards glow (`Hand` `playable`/`dimRest`), Pick / Pass / 📢 Last card, move animations from view diffs |
| `main.tsx`, `boot.tsx`, `lib/landscapeShell.ts` | Touch phones and tablets run the app inside a shell frame that turns 90° while the phone is upright, so the game always sees landscape (no "turn your phone"); `boot.tsx` is the app itself. Code inside the game can check `insideShell()` |
| `components/RotateGate.tsx`, `lib/orientation.ts`, `lib/useLandscape.ts`, `styles/landscape.css` | Landscape helpers: the fallback "Turn your phone" card, ⛶ full screen (through the shell when inside it), `useLandscape()`, shared tokens (`--u`, `--safe-*`) |
| `components/TableScene.tsx`, `Table3D.tsx`, `styles/land-world.css` | The 3D table world every game shares: one tilted plane (rim, felt, lamp); `OnTable` puts things on it (lying, or `stand` facing you), `seatSpots` seats opponents at the far rail, `OppCards` / `Pile3D` are cards on the felt. Keep felt items 2px+ above the felt |
| `components/TableInfo.tsx` | The one place for what isn't needed every second: ☰ room button (secret-mission badge) and its panel (secret mission, my counts, `tableRules`, tips, last moves) |
| `components/FanHand.tsx`, `styles/land-table.css` | The fanned hand (`fanLayout`, Bluff's rank stacks for big hands), top bar, the right-hand action column (`.side-actions`, `.action-bar`) |
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

## Rules of thumb

- Commit or push only when the owner asks. Commit with the repo's configured identity and end messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push after the backend:
  ```bash
  GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main
  ```
- Match the existing style; short one-line comments; no secrets in code.
