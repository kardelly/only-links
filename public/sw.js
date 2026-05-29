// Service Worker for only.link PWA
// Implements cache-first for static assets, network-first for API calls

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `onlylinks-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/mobile/mobile-app.html',
  '/mobile/mobile-styles.css',
  '/mobile/mobile-app.js',
  '/mobile/components/utils.js',
  '/mobile/components/bottom-nav.js',
  '/mobile/components/base-view.js',
  '/mobile/components/feed-view.js',
  '/mobile/components/search-view.js',
  '/mobile/components/add-bookmark-view.js',
  '/mobile/components/tags-view.js',
  '/mobile/components/profile-view.js',
  '/mobile/components/install-prompt.js',
  '/logo.png',
  '/favicon-192.png',
  '/favicon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network first, no cache fallback (fail fast)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch((error) => {
          console.error('[SW] API fetch failed:', error);
          return new Response(
            JSON.stringify({ error: 'Network request failed' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Static assets: cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok && request.method === 'GET') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          });
      })
      .catch((error) => {
        console.error('[SW] Fetch failed:', error);
        // Return offline fallback for HTML pages
        if (request.headers.get('accept').includes('text/html')) {
          return new Response(
            '<html><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        throw error;
      })
  );
});
