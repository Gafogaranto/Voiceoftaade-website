// Voiceoftaade is an online-only website. Do not cache pages or assets for offline use.
const CACHE_PREFIX = "voiceoftaade-pwa-";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});

// If this worker receives a request before it is removed, always use the network.
// Never return cached pages or an offline fallback.
self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request, { cache: "no-store" }));
});
