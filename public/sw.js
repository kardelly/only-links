// Service Worker for only.link PWA
// Strategy: network-first for app files (always fresh), cache-first only for images/fonts

const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `onlylinks-${CACHE_VERSION}`;

// Only truly static assets get cache-first (images, fonts, icons)
const IMMUTABLE_ASSETS = [
  '/logo.png',
  '/favicon-192.png',
  '/favicon-512.png'
];

// Install: cache only immutable assets, skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(IMMUTABLE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.error('[SW] Install error:', err))
  );
});

// Activate: delete all old caches, claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our own origin — never intercept external images/fonts
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls: always network, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Network request failed' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // App JS/CSS/HTML: network-first, fall back to cache if offline
  if (
    url.pathname.startsWith('/mobile/') ||
    url.pathname.startsWith('/components/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Immutable assets (images, fonts, icons): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
