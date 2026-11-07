import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { unlockSpeech } from './lib/speech';
import './styles.css';

for (const type of ['click', 'touchend'] as const) {
  window.addEventListener(type, unlockSpeech, { once: true, capture: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
