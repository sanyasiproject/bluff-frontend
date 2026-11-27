// the app itself: styles, sound and voice unlock, Hindi, React (main.tsx starts it here or inside the sideways shell)
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { unlockAudio } from './lib/sounds';
import { unlockSpeech } from './lib/speech';
import { startI18n } from './lib/i18n/dom';
import { autoFullscreen } from './lib/orientation';

for (const type of ['click', 'touchend'] as const) {
  window.addEventListener(type, unlockSpeech, { once: true, capture: true });
}
// kept on: phones can suspend audio in the background, and the next tap resumes it
window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });

// phones: hide the status bar like a game, from the first tap
autoFullscreen();

// Hindi, when chosen, is applied over the rendered page
startI18n();

// dev only: ?art=1 / ?ludoPreview / ?homePreview / ?lobbyPreview show screens on fake data (no server); dropped from production builds
const q = new URLSearchParams(location.search);
const LudoPreview = !import.meta.env.DEV
  ? null
  : q.has('art')
    ? lazy(() => import('./art/ArtGallery').then((m) => ({ default: m.ArtGallery })))
    : q.has('ludoPreview')
    ? lazy(() => import('./games/ludo/preview').then((m) => ({ default: m.LudoPreview })))
    : q.has('homePreview')
      ? lazy(() => import('./games/devPreviews').then((m) => ({ default: m.HomePreview })))
      : q.has('lobbyPreview')
        ? lazy(() => import('./games/devPreviews').then((m) => ({ default: m.LobbyPreview })))
        : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {LudoPreview ? (
      <Suspense fallback={null}>
        <LudoPreview />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
