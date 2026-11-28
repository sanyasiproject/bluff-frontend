import { markFxLite } from './lib/fxLite';
import { showDiag } from './lib/diag';
import { insideShell, startShell, wantsShell } from './lib/landscapeShell';
// styles load with the page so the intro screen is styled from the first paint
import './styles.css';
// night lobby design system: tokens and shared pieces (both apps)
import './styles/night.css';
// table themes and card backs, after the base styles so they win
import './styles/looks.css';
import './styles/missions.css';
import './styles/pass.css';
import './styles/shop.css';
import './styles/shop-fx.css';
import './styles/secrets.css';
import './styles/league.css';
import './styles/rivals.css';
import './styles/ranked.css';
import './styles/daily.css';
import './styles/room-chat.css';
import './styles/voice.css';
import './styles/twists.css';
import './styles/replay.css';
// avatar rings, shine and picker layout, last so they win
import './styles/avatars.css';
import './styles/lang.css';
import './styles/shield.css';
import './styles/c7power.css';
import './styles/rang.css';
import './styles/friends.css';
// landscape redesign, last so it wins over the portrait styles
import './styles/landscape.css';
import './styles/land-home.css';
import './styles/land-lobby.css';
import './styles/land-room.css';
import './styles/land-pages.css';
import './styles/land-pages2.css';
import './styles/land-overlays.css';
import './styles/land-table.css';
import './styles/land-world.css';
// each table theme's own art on the 3D felt
import './styles/land-felt-art.css';
import './styles/land-c7.css';
import './styles/land-rang.css';
// skip, reverse, +2/+4, wild and last-card effects (components/TableFx.tsx)
import './styles/table-fx.css';
// night lobby restyle of the app's chrome (home, pages, sheets, room), last so it wins
import './styles/land-night-chrome.css';
import './styles/land-night-home.css';
import './styles/land-night-room.css';
import './styles/land-night-pages.css';
// voice picker and the host's get-ready buzz
import './styles/voice-pick.css';
import './styles/nudge.css';
// tablets drop backdrop blur (must stay after every other style)
import './styles/fx-lite.css';

// service worker only in production builds so it never caches the dev server
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// a page left open across a deploy asks for chunks that are gone: reload once to get the new build
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('bluff.chunkReload')) return;
    sessionStorage.setItem('bluff.chunkReload', '1');
  } catch {
    return;
  }
  e.preventDefault();
  location.reload();
});
// a page that stayed up a while may reload again for a later deploy
setTimeout(() => {
  try {
    sessionStorage.removeItem('bluff.chunkReload');
  } catch {
    // storage blocked
  }
}, 15000);

// touch phones and tablets: the app runs inside a frame that turns sideways when the phone is upright,
// so the game opens in landscape even with the rotation lock on (lib/landscapeShell.ts)
markFxLite();
showDiag();
if (wantsShell() && !insideShell()) startShell();
else void import('./boot');
