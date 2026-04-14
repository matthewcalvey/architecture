const CACHE_NAME = 'calvey-form-shell-v2';
const APP_SHELL = [
  '/CALVEY_FORM/05_RENDER.html',
  '/CALVEY_FORM/render-api.js',
  '/CALVEY_FORM/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

function isCoreAsset(pathname) {
  return pathname === '/CALVEY_FORM/05_RENDER.html' || pathname === '/CALVEY_FORM/render-api.js';
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/CALVEY_FORM/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (isCoreAsset(url.pathname)) {
      try {
        const fresh = await fetch(event.request);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch (_err) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        return caches.match('/CALVEY_FORM/05_RENDER.html');
      }
    }

    const cached = await cache.match(event.request);
    if (cached) {
      fetch(event.request)
        .then((fresh) => cache.put(event.request, fresh.clone()))
        .catch(() => {});
      return cached;
    }

    try {
      const fresh = await fetch(event.request);
      cache.put(event.request, fresh.clone());
      return fresh;
    } catch (_err) {
      return caches.match('/CALVEY_FORM/05_RENDER.html');
    }
  })());
});
