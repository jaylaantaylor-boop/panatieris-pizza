/* Cache Storage is scoped per ORIGIN, not per path, and every one of our apps
   is served from jaylaantaylor-boop.github.io. So this worker namespaces its
   cache and, on activate, only ever deletes ITS OWN older versions. The
   obvious `keys.filter(k => k !== CACHE_NAME)` would delete Kitchen Stock's
   and the trucks' shells too, leaving whichever app was opened least recently
   with no offline copy. */
/* Named for the repo, not just "panatieris": Mamma Mia's live worker was
   itself caching under 'panatieris-shell-v1' until Aug 2026, and inheriting
   that exact name would have had the two apps sharing one cache bucket. */
const CACHE_PREFIX = 'panatieris-pizza-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v3';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Only manage the app shell itself. Sync calls (Apps Script), fonts, and any
// other cross-origin requests pass straight through untouched — this app
// already has its own localStorage-backed offline/sync handling for data.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        return res;
      })
      // Look only in THIS app's cache; the bare caches.match() searches every
      // cache on the origin and could serve a sibling app's stale copy.
      .catch(() => caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) => cached || cache.match('./index.html'))))
  );
});
