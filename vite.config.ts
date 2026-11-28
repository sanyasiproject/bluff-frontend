import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { cssFallbacks } from './tools/cssFallbacks';

export default defineConfig({
  plugins: [react()],
  // plain fallbacks for older Android browsers (no dvh / color-mix): tools/cssFallbacks.ts
  css: { postcss: { plugins: [cssFallbacks()] } },
  // keep those fallbacks through minifying: CSS is built for browsers from 2021 on
  build: {
    cssTarget: ['chrome87', 'edge88', 'firefox78', 'safari14'],
    // React and socket.io in their own chunk: cached across deploys and no longer named after a Ludo file
    rolldownOptions: {
      output: {
        // the shared app chunk (loaded with boot) is named after whichever module comes first: call it core
        chunkFileNames: (c) => (c.name === 'Gotis' ? 'assets/core-[hash].js' : 'assets/[name]-[hash].js'),
        assetFileNames: (a) => (a.names?.[0] === 'Gotis.css' ? 'assets/core-[hash][extname]' : 'assets/[name]-[hash][extname]'),
        codeSplitting: { groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|socket\.io-client|socket\.io-parser|engine\.io-client|engine\.io-parser|@socket\.io)[\\/]/ }] },
      },
    },
  },
  server: { port: 5173 },
});
