// Voiceoftaade PWA service worker.
// Cache only the public app shell and static assets; never cache account pages,
// signed ebook URLs, PDFs, EPUBs, or other private/personal content.
const CACHE_NAME = "voiceoftaade-app-shell-v3";
const APP_ROOT = new URL("./", self.location.href);
const SHELL_FILES = [
  new URL("./", self.location.href).href,
  new URL("index.html", APP_ROOT).href,
  new URL("manifest.webmanifest", APP_ROOT).href,
  new URL("assets/icon-192.png", APP_ROOT).href,
  new URL("assets/icon-512.png", APP_ROOT).href,
  new URL("assets/voiceoftaade-app-icon.svg", APP_ROOT).href,
  new URL("assets/voiceoftaade-logo.jpg", APP_ROOT).href
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("voiceoftaade-app-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for the app entry point so published updates appear promptly.
  if (request.mode === "navigate" && url.pathname === APP_ROOT.pathname) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(new URL("./", self.location.href).href, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(new URL("./", self.location.href).href)) ||
          (await caches.match(new URL("index.html", APP_ROOT).href));
      }
    })());
    return;
  }

  // Cache only same-origin static assets. Explicitly exclude documents and downloads.
  if (/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?)$/i.test(url.pathname) &&
      !/\.(?:pdf|epub)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })());
  }
});
