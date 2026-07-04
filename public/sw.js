/* The Pile — service worker.
 * Shell: cache-first (hashed assets are immutable).
 * Card images: cache-first with a size cap.
 * Scryfall API: network-first with cache fallback for offline resume.
 */
const VERSION = 'v1';
const SHELL_CACHE = `shell-${VERSION}`;
const IMG_CACHE = `img-${VERSION}`;
const API_CACHE = `api-${VERSION}`;
const IMG_CACHE_MAX = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['.', 'index.html', 'manifest.webmanifest']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![SHELL_CACHE, IMG_CACHE, API_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    if (cacheName === IMG_CACHE) trimCache(IMG_CACHE, IMG_CACHE_MAX);
  }
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).catch(() => caches.match('index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (url.hostname === 'cards.scryfall.io' || url.hostname === 'svgs.scryfall.io') {
    event.respondWith(cacheFirst(request, IMG_CACHE));
    return;
  }

  if (url.hostname === 'api.scryfall.com') {
    event.respondWith(networkFirst(request, API_CACHE));
  }
});
