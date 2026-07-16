/* Meal Planner service worker — offline app shell cache */
const CACHE = 'mealplanner-v25';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './js/db.js',
  './js/grocery-engine.js',
  './js/cook-log.js',
  './js/helpers-render.js',
  './js/screen-plan.js',
  './js/screen-recipes.js',
  './js/screen-grocery.js',
  './js/cook-modal.js',
  './js/screen-more.js',
  './js/cookbook-backlog.js',
  './js/plan-builder.js',
  './js/app-boot.js',
  './js/sync.js',
  './js/inventory.js',
  './js/screen-cook.js',
  './js/pwa.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Live sync data must NEVER be served from cache — it has to reach the server.
  // Otherwise an offline/Tailscale-down sync silently "succeeds" against a stale
  // cached sync.json. Let these go straight to the network so fetch() rejects when
  // offline and the app reports a real failure.
  const path = new URL(e.request.url).pathname;
  if (path.endsWith('/sync.json') || path.endsWith('/sync') || path.endsWith('/feedback')) return;
  e.respondWith(
    caches.match(e.request).then((cached) =>
      cached || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached)
    )
  );
});
