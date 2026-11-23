import { insideShell, startShell, wantsShell } from './lib/landscapeShell';
// styles load with the page so the intro screen is styled from the first paint
import './styles.css';
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

// service worker only in production builds so it never caches the dev server
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// touch phones and tablets: the app runs inside a frame that turns sideways when the phone is upright,
// so the game opens in landscape even with the rotation lock on (lib/landscapeShell.ts)
if (wantsShell() && !insideShell()) startShell();
else void import('./boot');
