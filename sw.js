const CACHE_NAME = "grova-document-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=201",
  "./app.js?v=201",
  "./data/data.js?v=201",
  "./manifest.json?v=201",
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
            .filter(
              (name) =>
                name.startsWith("grova-document-") &&
                name !== CACHE_NAME
            )
            .map(
              (name) =>
                caches.delete(name)
            )

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

  if (request.method !== "GET") {
    return;
  }


  const url = new URL(request.url);


  /* ===================================================
     Chỉ xử lý request cùng website
  =================================================== */

  if (
    url.origin !== self.location.origin
  ) {

    return;

  }


  /* ===================================================
     HTML
     
     Ưu tiên mạng để luôn lấy phiên bản mới.
     Offline → dùng cache.
  =================================================== */

  if (
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

            caches
              .open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  clone
                );

              });

          }

          return response;

        })
        .catch(() => {

          return caches.match(request)
            .then((cached) => {

              return (
                cached ||
                caches.match("./index.html")
              );

            });

        })

    );

    return;

  }


  /* ===================================================
     JAVASCRIPT / CSS / DATA
     
     Ưu tiên mạng.
     Nếu offline → cache.
     
     Điều này giúp khi anh commit phiên bản mới,
     app không bị giữ JS/CSS cũ.
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

            caches
              .open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  clone
                );

              });

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
     
     Cache trước → mạng sau.
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


            caches
              .open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  clone
                );

              });


            return response;

          });

      })

  );

});