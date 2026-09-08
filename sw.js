const CACHE_NAME = "grova-document-v13";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=202",
  "./auth.css?v=202",
  "./app.js?v=226",
  "./auth.js?v=202",
  "./data/data.js?v=202",
  "./manifest.json?v=202",
  "./data/grova_logo.png"
];

/* =====================================================
   INSTALL
   Cache đúng bộ tài nguyên hiện tại.
===================================================== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* =====================================================
   ACTIVATE
   Xóa toàn bộ cache GROVA cũ.
===================================================== */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name.startsWith("grova-document-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

/* =====================================================
   MESSAGE
===================================================== */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* =====================================================
   FETCH
   Network First để GitHub Pages luôn lấy bản mới;
   cache chỉ làm fallback khi mất mạng.
===================================================== */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document" || url.pathname.endsWith(".html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
            );
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.endsWith(".json")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
            );
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
