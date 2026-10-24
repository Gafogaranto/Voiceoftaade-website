const CACHE_NAME = "voiceoftaade-pwa-v12";

const APP_FILES = [
  "./",
  "./index.html",
  "./about.html",
  "./books.html",
  "./contact.html",
  "./contact.js",
  "./community.html",
  "./community.js",
  "./journals.html",
  "./account.html",
  "./account.js",
  "./styles.css",
  "./script.js",
  "./manifest.webmanifest",
  "./assets/voiceoftaade-logo.jpg",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES).catch(error => {
        // Do not block installation if a non-critical asset is unavailable.
        console.warn("Some Voiceoftaade assets were not cached", error);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith("voiceoftaade-pwa-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          // Cache each page under its own URL; never overwrite index.html with another page.
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cachedPage = await caches.match(request);
        if (cachedPage) return cachedPage;
        const path = url.pathname.replace(/\/$/, "");
        if (path === "" || path.endsWith("/Voiceoftaade-website")) {
          return (await caches.match("./index.html")) || (await caches.match("./"));
        }
        return new Response(
          "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Offline | Voiceoftaade</title><body style=\"font-family:Arial,sans-serif;padding:2rem;color:#07172b\"><h1>You’re offline</h1><p>This page is not available offline yet. Reconnect and refresh to load it.</p><p><a href=\"./\">Return to Voiceoftaade home</a></p></body></html>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
