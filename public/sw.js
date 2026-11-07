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
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
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
