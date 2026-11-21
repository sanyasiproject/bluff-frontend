import { getLang, onLangChange } from './lang';

// the Hindi tables load only once Hindi is picked
let translateLine: ((text: string) => string | null) | null = null;
let loading = false;

const ATTRS = ['placeholder', 'aria-label', 'title'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
const SKIP_SEL = '[data-no-translate],script,style,noscript,textarea,[contenteditable="true"]';

interface Rec {
  en: string;
  out: string;
}
const texts = new WeakMap<Text, Rec>();
const attrs = new WeakMap<Element, Map<string, Rec>>();

function doText(node: Text, on: boolean): void {
  const rec = texts.get(node);
  const cur = node.data;
  // our own write: leave it, or put the English back
  if (rec && cur === rec.out) {
    if (!on) {
      node.data = rec.en;
      texts.delete(node);
    }
    return;
  }
  texts.delete(node);
  if (!on) return;
  const hi = translateLine?.(cur) ?? null;
  if (hi === null || hi === cur) return;
  texts.set(node, { en: cur, out: hi });
  node.data = hi;
}

function doAttrs(el: Element, on: boolean): void {
  let recs = attrs.get(el);
  for (const name of ATTRS) {
    const cur = el.getAttribute(name);
    const rec = recs?.get(name);
    if (rec && cur === rec.out) {
      if (!on) {
        el.setAttribute(name, rec.en);
        recs!.delete(name);
      }
      continue;
    }
    recs?.delete(name);
    if (!on || cur === null) continue;
    const hi = translateLine?.(cur) ?? null;
    if (hi === null || hi === cur) continue;
    if (!recs) attrs.set(el, (recs = new Map()));
    recs.set(name, { en: cur, out: hi });
    el.setAttribute(name, hi);
  }
}

const skipEl = (el: Element) => el.hasAttribute('data-no-translate') || SKIP_TAGS.has(el.tagName) || el.getAttribute('contenteditable') === 'true';

/** one subtree: every text node and attribute, skipping marked parts */
function walk(root: Node, on: boolean): void {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text, on);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const first = root as Element;
  if (first.hasAttribute('data-no-translate')) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      const el = n as Element;
      // inputs keep their text but a placeholder still changes
      if (el.tagName === 'TEXTAREA') doAttrs(el, on);
      return skipEl(el) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  if (!skipEl(first) || first.tagName === 'TEXTAREA') doAttrs(first, on);
  if (skipEl(first)) return;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text, on);
    else doAttrs(n as Element, on);
  }
}

const inSkipped = (el: Element | null) => !el || el.closest(SKIP_SEL) !== null;

let observer: MutationObserver | null = null;
const pendingNodes = new Set<Node>();
const pendingAttrs = new Set<Element>();
let frame = 0;

function flush(): void {
  frame = 0;
  const on = getLang() === 'hi';
  for (const n of pendingNodes) {
    if (!n.isConnected) continue;
    if (n.nodeType === Node.TEXT_NODE) {
      if (!inSkipped(n.parentElement)) doText(n as Text, on);
    } else if (n.nodeType === Node.ELEMENT_NODE && !inSkipped((n as Element).parentElement)) walk(n, on);
  }
  for (const el of pendingAttrs) {
    if (el.isConnected && !el.closest('[data-no-translate]')) doAttrs(el, on);
  }
  pendingNodes.clear();
  pendingAttrs.clear();
  // drop the records of our own writes
  observer?.takeRecords();
}

function onMutations(list: MutationRecord[]): void {
  for (const m of list) {
    if (m.type === 'childList') m.addedNodes.forEach((n) => pendingNodes.add(n));
    else if (m.type === 'characterData') pendingNodes.add(m.target);
    else pendingAttrs.add(m.target as Element);
  }
  if (!frame && (pendingNodes.size || pendingAttrs.size)) frame = requestAnimationFrame(flush);
}

function apply(): void {
  const on = getLang() === 'hi';
  if (on && !translateLine) {
    if (!loading) {
      loading = true;
      void import('./translate').then((m) => {
        translateLine = m.translateLine;
        apply();
      }).catch(() => {
        // offline: try again on the next switch
        loading = false;
      });
    }
    return;
  }
  document.documentElement.lang = on ? 'hi' : 'en';
  if (on) {
    walk(document.body, true);
    if (!observer) {
      observer = new MutationObserver(onMutations);
      observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ATTRS });
    }
  } else {
    observer?.disconnect();
    observer = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    pendingNodes.clear();
    pendingAttrs.clear();
    walk(document.body, false);
  }
}

let started = false;

/** call once at boot: translates the page while Hindi is chosen */
export function startI18n(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  onLangChange(apply);
  if (getLang() === 'hi') apply();
}
