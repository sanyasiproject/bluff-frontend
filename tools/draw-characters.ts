// Draws every character avatar to public/avatars/<id>.svg (run: npm run avatars). Re-run after changing src/lib/characters.ts
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { CHARACTER_ART, drawArt } from '../src/lib/characters.ts';
import { AVATAR_CHARACTERS } from '../src/types.ts';

const out = new URL('../public/avatars/', import.meta.url);
const ids = AVATAR_CHARACTERS.map((c) => c.id as string);
const missing = ids.filter((id) => !CHARACTER_ART[id]);
const extra = Object.keys(CHARACTER_ART).filter((id) => !ids.includes(id));
if (missing.length || extra.length) throw new Error(`art and catalog differ: missing ${missing.join(', ') || '-'}; extra ${extra.join(', ') || '-'}`);

mkdirSync(out, { recursive: true });
// drop drawings of characters that were removed
for (const f of readdirSync(out)) if (f.endsWith('.svg') && !ids.includes(f.slice(0, -4))) rmSync(new URL(f, out));
let bytes = 0;
for (const id of ids) {
  const svg = drawArt(CHARACTER_ART[id]);
  writeFileSync(new URL(`${id}.svg`, out), svg);
  bytes += svg.length;
}
console.log(`drew ${ids.length} characters, ${Math.round(bytes / 1024)} KB in all`);
