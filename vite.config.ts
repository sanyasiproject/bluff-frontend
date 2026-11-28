import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { cssFallbacks } from './tools/cssFallbacks';

/** starts waking the (sleeping) server from the first line of the page, while the app's code still downloads */
function wakeServer(url: string | undefined): Plugin {
  return {
    name: 'wake-server',
    transformIndexHtml: () =>
      url
        ? [
            { tag: 'link', attrs: { rel: 'preconnect', href: url.replace(/\/$/, ''), crossorigin: 'anonymous' }, injectTo: 'head-prepend' },
            { tag: 'link', attrs: { rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href: `${url.replace(/\/$/, '')}/health` }, injectTo: 'head-prepend' },
          ]
        : [],
  };
}

/** a new cache name in sw.js on every build, so each deploy replaces the installed app's old files */
function swVersion(): Plugin {
  return {
    name: 'sw-version',
    apply: 'build',
    writeBundle(opts) {
      const file = resolve(opts.dir ?? 'dist', 'sw.js');
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD__', (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 12) || Date.now().toString(36)));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), wakeServer(loadEnv(mode, process.cwd(), 'VITE_').VITE_SERVER_URL?.trim()), swVersion()],
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
}));
