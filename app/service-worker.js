// Pet Store service worker — caches the app shell for offline use.
const CACHE = 'pet-store-v1';
const SHELL = [
  '/pet-store/app/index.html',
  '/pet-store/app/main.js',
  '/pet-store/app/manifest.json',
  '/pet-store/specs/petstore.json',
  '/pet-store/specs/workflow.json',
  '/jcule/dist/index.js',
  '/jellicule/dist/index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Cache-first for the app shell; network-first (with cache fallback) for API calls.
  if (event.request.method !== 'GET') return;

  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
