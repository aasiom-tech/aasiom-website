const CACHE_NAME = 'aasiom-core-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/projects.html',
  '/innovation.html',
  '/technology.html',
  '/contact.html',
  '/404.html',
  '/css/styles.css',
  '/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Stale-While-Revalidate strategy for core assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // If valid response from same origin, update cache
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails and it's a navigation request, return 404 page if no cache
          if (event.request.mode === 'navigate') {
            return caches.match('/404.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
