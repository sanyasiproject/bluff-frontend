// Vite plugin: writes the files offline play needs (app shell, offline screens, the 9 games' tables, the engine, the chess worker) into sw.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

type Out = { type: 'chunk' | 'asset'; fileName: string; name?: string; names?: string[]; isEntry?: boolean; facadeModuleId?: string | null; moduleIds?: string[]; imports?: string[]; dynamicImports?: string[]; viteMetadata?: { importedCss?: Set<string>; importedAssets?: Set<string> } };

/** the 9 offline games' tables: taken with everything they load later */
const TABLES = /\/src\/games\/(ludo\/LudoTable|snakes\/SnakesTable|chess\/ChessTable|gomoku\/GomokuTable|uttt\/UtttTable|dots\/DotsTable|colorwar\/ColorWarTable|carrom\/CarromTable|darts\/DartsTable)\.tsx$/;
/** the app itself (boot) and the offline screens' chunk (with the engine): taken with what they import at once */
const SCREENS = /\/src\/(offline\/|boot\.tsx$|lib\/i18n\/)/;
/** files from public/ the app shell shows */
const STATIC = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

export function swPrecache(): Plugin {
  return {
    name: 'sw-precache',
    apply: 'build',
    writeBundle(opts, bundle) {
      const files = Object.values(bundle) as unknown as Out[];
      const byName = new Map(files.map((f) => [f.fileName, f]));
      const want = new Set<string>();
      const walk = (name: string, deep: boolean) => {
        if (want.has(name)) return;
        const f = byName.get(name);
        if (!f) return;
        want.add(name);
        if (f.type !== 'chunk') return;
        for (const c of f.viteMetadata?.importedCss ?? []) want.add(c);
        for (const a of f.viteMetadata?.importedAssets ?? []) want.add(a);
        for (const i of f.imports ?? []) walk(i, deep);
        if (deep) for (const i of f.dynamicImports ?? []) walk(i, deep);
      };
      // the entry and everything it loads at start
      for (const f of files) if (f.type === 'chunk' && f.isEntry) walk(f.fileName, false);
      // the offline screens, then the tables with their own lazy parts
      for (const f of files) {
        const id = (f.type === 'chunk' && f.facadeModuleId ? f.facadeModuleId : '').replace(/\\/g, '/');
        if (SCREENS.test(id)) walk(f.fileName, false);
      }
      for (const f of files) {
        const id = (f.type === 'chunk' && f.facadeModuleId ? f.facadeModuleId : '').replace(/\\/g, '/');
        if (TABLES.test(id)) walk(f.fileName, true);
      }
      // the chess engine worker is its own file
      for (const f of files) if (/worker/i.test(f.fileName) && /\.(js|wasm)$/.test(f.fileName)) want.add(f.fileName);
      const list = [...STATIC, ...[...want].filter((n) => !n.endsWith('.html') && !n.endsWith('.map')).map((n) => `/${n}`)].sort();
      const file = resolve(opts.dir ?? 'dist', 'sw.js');
      const src = readFileSync(file, 'utf8');
      if (!src.includes('/*__PRECACHE__*/')) throw new Error('sw.js has no /*__PRECACHE__*/ marker');
      writeFileSync(file, src.replace('/*__PRECACHE__*/', list.map((n) => JSON.stringify(n)).join(',')));
      this.info?.(`sw precache: ${list.length} files`);
    },
  };
}
