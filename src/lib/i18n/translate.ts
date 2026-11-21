import { HI_DICT, HI_PATTERNS } from './hi';

const LETTERS = /[A-Za-z]/;
const PAD = /^(\s*)([\s\S]*?)(\s*)$/;
// emoji, icons and punctuation around the words ("🎮 Play", "Loading…", "How ranks work ›")
const EDGE = /^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u;
const SPLIT = / · |\. (?=\S)/;
const cache = new Map<string, string | null>();

// the app writes these in place of a name
const who = (name: string) => (name === 'You' ? 'आप' : name === 'Someone' ? 'कोई' : name);

function whole(line: string): string | null {
  const hit = HI_DICT.get(line);
  if (hit !== undefined) return hit;
  for (const [re, rep] of HI_PATTERNS) {
    const m = re.exec(line);
    if (m) return typeof rep === 'string' ? rep.replace(/\$(\d)/g, (_, i: string) => who(m[+i] ?? '')) : rep(m, tr);
  }
  return null;
}

function core(line: string): string | null {
  const direct = whole(line);
  if (direct !== null) return direct;
  const [, pre, mid, post] = EDGE.exec(line)!;
  if (!mid || mid === line) return null;
  // icon in front only ("🪙 Coins at stake (per player)")
  if (pre && post) {
    const rest = whole(line.slice(pre.length));
    if (rest !== null) return pre + rest;
  }
  const inner = whole(mid);
  return inner === null ? null : pre + inner + post.replace(/^\.$/, '।');
}

/** a capture inside a pattern: Hindi if known, else as it is */
export const tr = (text: string): string => core(text) ?? text;

function compute(body: string): string | null {
  const one = core(body);
  if (one !== null) return one;
  // "Free game · 2 decks", "Game over. Ravi wins": each part on its own, unknown parts stay
  if (!SPLIT.test(body)) return null;
  const seps = body.match(/ · |\. (?=\S)/g)!;
  const parts = body.split(SPLIT);
  let changed = false;
  const out = parts.map((p) => {
    const hi = p && LETTERS.test(p) ? core(p) : null;
    if (hi !== null) changed = true;
    return hi ?? p;
  });
  if (!changed) return null;
  return out.map((p, i) => p + (i < seps.length ? (seps[i] === ' · ' ? ' · ' : '। ') : '')).join('');
}

/** Hindi for one line of UI text, or null when it should stay as it is */
export function translateLine(text: string): string | null {
  if (!LETTERS.test(text)) return null;
  const known = cache.get(text);
  if (known !== undefined) return known;
  const [, lead, body, trail] = PAD.exec(text)!;
  const hi = compute(body);
  const out = hi === null ? null : lead + hi + trail;
  if (cache.size > 4000) cache.clear();
  cache.set(text, out);
  return out;
}
