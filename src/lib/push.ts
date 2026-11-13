// Friend-invite notifications (Web Push): they reach the phone even when Bluff is closed
import { api } from './api';
import { isInstalled, isIos } from './install';
import { loadPref, savePref } from './storage';

/** what the Profile switch shows */
export type PushState = 'unsupported' | 'unavailable' | 'install' | 'denied' | 'off' | 'on';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** the service worker, or null when there is none (dev builds register none) */
async function worker(ms = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

let keyCache: Promise<string | null> | null = null;

/** the server's public key; null when notifications aren't set up there */
export function pushKey(): Promise<string | null> {
  keyCache ??= api<{ publicKey: string | null }>('/push/key')
    .then((r) => r.publicKey ?? null)
    .catch(() => {
      // try again next time
      keyCache = null;
      return null;
    });
  return keyCache;
}

/** base64url (the key's format) to the bytes the browser wants */
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const b64 = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** a subscription made with an older server key has to be replaced */
function sameKey(sub: PushSubscription, key: string): boolean {
  const had = sub.options.applicationServerKey;
  if (!had) return false;
  const a = new Uint8Array(had);
  const b = keyBytes(key);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export async function pushState(): Promise<PushState> {
  // iPhone and iPad only get notifications in the app opened from the Home Screen
  if (isIos() && !isInstalled()) return (await pushKey()) ? 'install' : 'unavailable';
  if (!supported()) return 'unsupported';
  if (!(await pushKey())) return 'unavailable';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await worker();
  if (!reg) return 'unsupported';
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** call straight from a tap: the permission prompt only shows then */
export async function enablePush(token: string | null): Promise<void> {
  if (!token) throw new Error('Log in first');
  if (!supported()) throw new Error("This browser can't get notifications");
  // first, before anything else is awaited, so the tap still counts
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(permission === 'denied' ? "Notifications are blocked for Bluff in your phone's settings" : 'Notifications were not allowed');
  }
  await subscribeThisPhone(token);
}

/** invites are on by default: only a player who switched them off in Profile keeps them off on this phone */
const offPref = (userId: string) => `pushOff.${userId}`;
export const pushTurnedOff = (userId: string) => loadPref(offPref(userId)) === '1';
export const rememberPushOff = (userId: string, off: boolean) => savePref(offPref(userId), off ? '1' : '0');

/** starts the phone's prompt from a tap (login, sign-up) without waiting on anything; null where it can't work */
export function askPermission(): Promise<NotificationPermission> | null {
  if (!supported() || (isIos() && !isInstalled())) return null;
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
  return Notification.requestPermission();
}

/** turns invites on for this phone when it allows notifications (asked just now, or earlier), unless the player switched them off */
export async function autoPush(token: string | null, userId: string, permission?: Promise<NotificationPermission> | null): Promise<boolean> {
  if (!token || !supported() || pushTurnedOff(userId)) return false;
  const answer = permission ? await permission.catch(() => 'denied' as const) : Notification.permission;
  if (answer !== 'granted') return false;
  try {
    await subscribeThisPhone(token);
    return true;
  } catch {
    return false;
  }
}

/** subscribes (or re-subscribes with a new server key) and tells the server this phone is this account's */
async function subscribeThisPhone(token: string): Promise<void> {
  const key = await pushKey();
  if (!key) throw new Error('Notifications are not set up on this server');
  const reg = await worker();
  if (!reg) throw new Error("This browser can't get notifications");
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) {
    await sub.unsubscribe().catch(() => false);
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  await api('/push/subscribe', { body: sub.toJSON(), token });
}

/** this phone stops getting invites (switch off, or logging out) */
export async function disablePush(token: string | null): Promise<void> {
  const reg = supported() ? await worker(1500) : null;
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  await sub.unsubscribe().catch(() => false);
  if (token) await api('/push/unsubscribe', { body: { endpoint }, token }).catch(() => undefined);
}

/** tells the server again which account this phone belongs to (it may have changed since) */
export async function syncPush(token: string | null): Promise<void> {
  if (!token || !supported() || Notification.permission !== 'granted') return;
  const reg = await worker(1500);
  const sub = await reg?.pushManager.getSubscription();
  if (sub) await api('/push/subscribe', { body: sub.toJSON(), token }).catch(() => undefined);
}
