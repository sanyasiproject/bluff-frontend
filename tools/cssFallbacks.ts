// Build-time CSS fallbacks for older Android browsers (Chrome / WebView / Samsung Internet before 2023).
// Without them a browser that doesn't know `dvh` drops every size built on it and the game screens come out blank or squashed.
// Each declaration using dvh/svh/lvh or color-mix() gets a plain fallback just before it; custom properties get an @supports copy.
import type { AtRule, Declaration, Plugin, Rule } from 'postcss';

const VIEWPORT = /(\d*\.?\d+)(dvh|svh|lvh|dvw|svw|lvw|dvmin|dvmax)\b/g;
const hasViewport = (v: string) => /\d(dvh|svh|lvh|dvw|svw|lvw|dvmin|dvmax)\b/.test(v);

/** 100dvh → 100vh (inside the app's sideways frame they are the same; on a desktop too) */
const plainViewport = (v: string) => v.replace(VIEWPORT, (_m, n: string, u: string) => `${n}${u.replace(/^[dsl]v/, 'v')}`);

/** color-mix(in srgb, A 35%, B) → A: the first colour, close enough where mixing isn't known */
function plainColorMix(v: string): string {
  let out = v;
  for (let i = out.indexOf('color-mix('); i >= 0; i = out.indexOf('color-mix(')) {
    let depth = 0;
    let end = -1;
    const args: string[] = [];
    let from = i + 'color-mix('.length;
    for (let k = from; k < out.length; k++) {
      const ch = out[k];
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (depth === 0) {
          args.push(out.slice(from, k));
          end = k;
          break;
        }
        depth--;
      } else if (ch === ',' && depth === 0) {
        args.push(out.slice(from, k));
        from = k + 1;
      }
    }
    if (end < 0) return v;
    const first = (args[1] ?? 'transparent').trim().replace(/\s+\d*\.?\d+%$/, '');
    out = out.slice(0, i) + first + out.slice(end + 1);
  }
  return out;
}

const inKeyframes = (d: Declaration) => {
  for (let p = d.parent; p; p = p.parent as typeof p) if (p.type === 'atrule' && /keyframes$/i.test((p as AtRule).name)) return true;
  return false;
};

const INDIVIDUAL = ['translate', 'rotate', 'scale'] as const;

/** translate / rotate / scale properties as one transform (they apply in that order, before `transform`) */
function asTransform(parts: Record<string, string>, own?: string): string | null {
  const out: string[] = [];
  const t = parts.translate?.trim();
  if (t && t !== 'none') {
    const v = t.split(/\s+(?![^(]*\))/);
    out.push(v.length === 3 ? `translate3d(${v.join(', ')})` : `translate(${v.join(', ')})`);
  }
  const r = parts.rotate?.trim();
  if (r && r !== 'none') {
    const v = r.split(/\s+(?![^(]*\))/);
    if (v.length === 1) out.push(`rotate(${v[0]})`);
    else if (v.length === 2 && /^[xyz]$/.test(v[0])) out.push(`rotate${v[0].toUpperCase()}(${v[1]})`);
    else return null;
  }
  const sc = parts.scale?.trim();
  if (sc && sc !== 'none') out.push(`scale(${sc.split(/\s+(?![^(]*\))/).slice(0, 2).join(', ')})`);
  if (own && own !== 'none') out.push(own);
  return out.length ? out.join(' ') : null;
}

/** adds the fallbacks: a plain copy before each modern declaration, or an @supports block for custom properties */
export function cssFallbacks(): Plugin {
  return {
    postcssPlugin: 'game-baithak-css-fallbacks',
    // browsers before the translate / rotate / scale properties (Chrome 104) get them folded into a transform
    Rule(rule, { AtRule: MakeAt }) {
      const done = rule as Rule & { foldDone?: boolean };
      if (done.foldDone || (rule.parent?.type === 'atrule' && /keyframes$/i.test((rule.parent as AtRule).name))) return;
      const parts: Record<string, string> = {};
      let own: string | undefined;
      rule.each((n) => {
        if (n.type !== 'decl') return;
        if ((INDIVIDUAL as readonly string[]).includes(n.prop)) parts[n.prop] = n.value;
        if (n.prop === 'transform') own = n.value;
      });
      if (!Object.keys(parts).length) return;
      const value = asTransform(parts, own);
      if (!value) return;
      done.foldDone = true;
      const at = new MakeAt({ name: 'supports', params: 'not (translate: 0)' });
      at.append({ selector: rule.selector });
      (at.first as Rule & { foldDone?: boolean }).foldDone = true;
      (at.first as Rule).append({ prop: 'transform', value });
      rule.after(at);
    },
    Declaration(decl, { AtRule: MakeAt }) {
      const viewport = hasViewport(decl.value);
      const mix = decl.value.includes('color-mix(');
      if ((!viewport && !mix) || inKeyframes(decl) || (decl as Declaration & { fallbackDone?: boolean }).fallbackDone) return;
      let plain = decl.value;
      if (viewport) plain = plainViewport(plain);
      if (mix) plain = plainColorMix(plain);
      if (plain === decl.value) return;
      (decl as Declaration & { fallbackDone?: boolean }).fallbackDone = true;
      if (!decl.prop.startsWith('--')) {
        // older browsers drop the modern line as invalid and keep this one
        const prev = decl.prev();
        if (prev?.type === 'decl' && prev.prop === decl.prop && prev.value === plain) return;
        const copy = decl.clone({ value: plain });
        (copy as Declaration & { fallbackDone?: boolean }).fallbackDone = true;
        decl.before(copy);
        return;
      }
      // a custom property always "parses", so the plain value goes in an @supports block after its rule
      const rule = decl.parent as Rule | undefined;
      if (!rule || rule.type !== 'rule') return;
      const test = viewport && mix ? 'not ((height: 1dvh) and (color: color-mix(in srgb, red, blue)))' : viewport ? 'not (height: 1dvh)' : 'not (color: color-mix(in srgb, red, blue))';
      const at = new MakeAt({ name: 'supports', params: test });
      const copy = decl.clone({ value: plain });
      (copy as Declaration & { fallbackDone?: boolean }).fallbackDone = true;
      at.append({ selector: rule.selector });
      (at.first as Rule).append(copy);
      rule.after(at);
    },
  };
}
cssFallbacks.postcss = true;
