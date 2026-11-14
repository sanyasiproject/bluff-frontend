// Makes Bluff installable and able to open without network; game data always comes live from the server
const CACHE = 'bluff-shell-v1';
const MAX_ENTRIES = 40;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function remember(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  // drop the oldest files so old deploys don't pile up
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((k) => cache.delete(k)));
}

// Network first so a new deploy shows up right away; the cache is only an offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // avatar pictures use the browser's own cache, so they never push the app's files out of this one
  if (url.pathname.startsWith('/avatars/')) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) event.waitUntil(remember(request, response.clone()));
        return response;
      })
      .catch(async () => {
        const navigate = request.mode === 'navigate';
        const hit = await caches.match(request, { ignoreSearch: navigate });
        return hit || (navigate ? caches.match('/', { ignoreSearch: true }) : Response.error());
      }),
  );
});

// Friend invites arrive as push messages, even when Bluff is closed
self.addEventListener('push', (event) => {
  let msg = null;
  try {
    msg = event.data ? event.data.json() : null;
  } catch {
    msg = null;
  }
  const ok = msg && typeof msg.title === 'string';
  const tag = ok && typeof msg.tag === 'string' ? msg.tag : undefined;
  const url = ok && typeof msg.url === 'string' && msg.url.startsWith('/') ? msg.url : '/';
  // every push must show something, or the phone may stop delivering them
  event.waitUntil(
    self.registration.showNotification(ok ? msg.title : 'Bluff', {
      body: ok && typeof msg.body === 'string' ? msg.body : 'Open Bluff',
      icon: '/icons/icon-192.png',
      // the small status-bar icon: Android paints it from the alpha only, so it's white cards on transparent
      badge: '/icons/badge-96.png',
      tag,
      renotify: Boolean(tag),
      data: { url },
    }),
  );
});

// Tapping it opens Bluff on the invite; an open Bluff window is reused
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (wins) => {
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (!win) return self.clients.openWindow(url);
      await win.focus();
      return win.navigate(url).catch(() => self.clients.openWindow(url));
    }),
  );
});
