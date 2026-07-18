const CACHE_NAME = 'aasiom-core-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/anvira.html',
  '/strategic-review.html',
  '/contact.html',
  '/css/styles.css',
  '/css/chatbot.css',
  '/js/main.js',
  '/js/topo.js',
  '/js/chatbot.js',
  '/images/aasiom-logo.png',
  '/images/aasiom-logo.webp',
  '/images/aasiom-tab.png'
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
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});
