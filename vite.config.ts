import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { cssFallbacks } from './tools/cssFallbacks';

export default defineConfig({
  plugins: [react()],
  // plain fallbacks for older Android browsers (no dvh / color-mix): tools/cssFallbacks.ts
  css: { postcss: { plugins: [cssFallbacks()] } },
  // keep those fallbacks through minifying: CSS is built for browsers from 2021 on
  build: { cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'] },
  server: { port: 5173 },
});
