const CACHE_NAME = "grova-document-v6";

const APP_SHELL = [
  "./",
  "./index.html",

  "./style.css?v=202",
  "./auth.css?v=202",

  "./app.js?v=202",
  "./auth.js?v=202",

  "./data/data.js?v=202",

  "./manifest.json?v=202",

  "./data/grova_logo.png"
];


/* =====================================================
   INSTALL
===================================================== */

self.addEventListener("install", (event) => {

  event.waitUntil(

    caches
      .open(CACHE_NAME)

      .then((cache) => {

        return cache.addAll(APP_SHELL);

      })

      .then(() => {

        return self.skipWaiting();

      })

  );

});


/* =====================================================
   ACTIVATE
===================================================== */

self.addEventListener("activate", (event) => {

  event.waitUntil(

    caches
      .keys()

      .then((cacheNames) => {

        return Promise.all(

          cacheNames

            .filter((name) => {

              return (
                name.startsWith("grova-document-") &&
                name !== CACHE_NAME
              );

            })

            .map((name) => {

              return caches.delete(name);

            })

        );

      })

      .then(() => {

        return self.clients.claim();

      })

  );

});


/* =====================================================
   MESSAGE
   Cho phép app yêu cầu cập nhật ngay
===================================================== */

self.addEventListener("message", (event) => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});


/* =====================================================
   FETCH
===================================================== */

self.addEventListener("fetch", (event) => {

  const request = event.request;


  /* ===================================================
     Chỉ xử lý GET
  =================================================== */

  if (request.method !== "GET") {

    return;

  }


  const url =
    new URL(request.url);


  /* ===================================================
     Chỉ xử lý tài nguyên cùng website
  =================================================== */

  if (
    url.origin !== self.location.origin
  ) {

    return;

  }


  /* ===================================================
     HTML / NAVIGATION

     Ưu tiên mạng để luôn lấy phiên bản mới.

     Nếu mất mạng:
     → dùng bản đã cache.
  =================================================== */

  if (
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.pathname.endsWith(".html")
  ) {

    event.respondWith(

      fetch(request)

        .then((response) => {

          if (
            response &&
            response.status === 200
          ) {

            const clone =
              response.clone();

            event.waitUntil(

              caches
                .open(CACHE_NAME)

                .then((cache) => {

                  return cache.put(
                    request,
                    clone
                  );

                })

            );

          }

          return response;

        })

        .catch(() => {

          return caches
            .match(request)

            .then((cachedResponse) => {

              if (cachedResponse) {

                return cachedResponse;

              }


              return caches.match(
                "./index.html"
              );

            });

        })

    );

    return;

  }


  /* ===================================================
     JAVASCRIPT / CSS / JSON

     Network First.

     Online:
     → lấy phiên bản mới
     → cập nhật cache.

     Offline:
     → dùng cache.
  =================================================== */

  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".json")
  ) {

    event.respondWith(

      fetch(request)

        .then((response) => {

          if (
            response &&
            response.status === 200
          ) {

            const clone =
              response.clone();

            event.waitUntil(

              caches
                .open(CACHE_NAME)

                .then((cache) => {

                  return cache.put(
                    request,
                    clone
                  );

                })

            );

          }

          return response;

        })

        .catch(() => {

          return caches.match(request);

        })

    );

    return;

  }


  /* ===================================================
     ẢNH / ICON / FILE KHÁC

     Cache First.

     Có cache:
     → dùng cache.

     Chưa có:
     → lấy mạng.
     → lưu vào cache.
  =================================================== */

  event.respondWith(

    caches
      .match(request)

      .then((cachedResponse) => {

        if (cachedResponse) {

          return cachedResponse;

        }


        return fetch(request)

          .then((response) => {

            if (
              !response ||
              response.status !== 200 ||
              response.type === "opaque"
            ) {

              return response;

            }


            const clone =
              response.clone();


            event.waitUntil(

              caches
                .open(CACHE_NAME)

                .then((cache) => {

                  return cache.put(
                    request,
                    clone
                  );

                })

            );


            return response;

          });

      })

  );

});