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
