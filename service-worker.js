const CACHE_NAME = "control-stock-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/script_firebase.js",
  "/manifest.json",
  "/hamburguesa.png",
  "/hamburguesa.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
