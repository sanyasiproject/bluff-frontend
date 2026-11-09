import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { unlockAudio } from './lib/sounds';
import { unlockSpeech } from './lib/speech';
import './styles.css';

for (const type of ['click', 'touchend'] as const) {
  window.addEventListener(type, unlockSpeech, { once: true, capture: true });
}
// kept on: phones can suspend audio in the background, and the next tap resumes it
window.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });

// service worker only in production builds so it never caches the dev server
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
