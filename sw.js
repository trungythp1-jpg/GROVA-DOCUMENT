const CACHE_NAME = "grova-document-v7";

const APP_SHELL = [
  "./",
  "./index.html",

  "./style.css?v=202",
  "./auth.css?v=202",

  "./app.js?v=220",
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
   Xóa toàn bộ cache GROVA cũ khi v7 kích hoạt.
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
   Cho phép app yêu cầu cập nhật ngay.
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
     Network First.
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
