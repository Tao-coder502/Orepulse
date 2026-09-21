// OrePulse AI — PWA Service Worker
// Caches application shell for offline-capable operation.

const CACHE_NAME = 'orepulse-shell-v1';

// Resources to pre-cache on install (application shell)
const SHELL_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching application shell...');
      return cache.addAll(SHELL_RESOURCES).catch((err) => {
        console.warn('[SW] Pre-cache partial failure (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first with shell fallback for navigation requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always bypass service worker for API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests: network first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html')
      )
    );
    return;
  }

  // For static assets: cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses for static assets
        if (
          response.ok &&
          (event.request.destination === 'script' ||
           event.request.destination === 'style' ||
           event.request.destination === 'font' ||
           event.request.destination === 'image')
        ) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      });
    })
  );
});
