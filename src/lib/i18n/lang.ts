import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'hi';

const KEY = 'bluff.lang';
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

let current: Lang = readLang();

export const getLang = (): Lang => current;

/** saved on this phone; applies at once */
export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // storage blocked: still switches for this visit
  }
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const useLang = (): Lang => useSyncExternalStore(onLangChange, getLang, getLang);
