export interface Session {
  code: string;
  token: string;
  name: string;
}

const SESSION_KEY = 'bluff.session';
const NAME_KEY = 'bluff.name';

// Storage can be blocked (private mode), so every access is guarded
function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

function write(store: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    // ignore
  }
}

function parse(raw: string | null): Session | null {
  try {
    const s = raw ? (JSON.parse(raw) as Session) : null;
    return s && typeof s.code === 'string' && typeof s.token === 'string' ? s : null;
  } catch {
    return null;
  }
}

/** this tab's seat, restored automatically on reload */
export const loadTabSession = () => parse(read(() => sessionStorage, SESSION_KEY));

/** last seat on this device, offered as a "Rejoin" button */
export const loadSavedSession = () => parse(read(() => localStorage, SESSION_KEY));

export function saveSession(s: Session): void {
  write(() => sessionStorage, SESSION_KEY, JSON.stringify(s));
  write(() => localStorage, SESSION_KEY, JSON.stringify(s));
}

export function clearSession(): void {
  write(() => sessionStorage, SESSION_KEY, null);
  write(() => localStorage, SESSION_KEY, null);
}

export const loadName = () => read(() => localStorage, NAME_KEY) ?? '';
export const saveName = (name: string) => write(() => localStorage, NAME_KEY, name);
export const loadPref = (key: string) => read(() => localStorage, `bluff.${key}`);
export const savePref = (key: string, value: string) => write(() => localStorage, `bluff.${key}`, value);
