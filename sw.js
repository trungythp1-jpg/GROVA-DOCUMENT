const CACHE_NAME = "grova-document-v4";

const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./data/data.js"
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
            .then((keys) => {

                return Promise.all(

                    keys
                        .filter(
                            (key) =>
                                key !== CACHE_NAME
                        )
                        .map(
                            (key) =>
                                caches.delete(key)
                        )

                );

            })
            .then(() => {

                return self.clients.claim();

            })

    );

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


    /* =================================================
       HTML
       Luôn ưu tiên bản mới trên mạng.
       Nếu mất mạng mới dùng cache.
    ================================================= */

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

                    return caches.match(request);

                })

        );

        return;

    }


    /* =================================================
       DATA.JS
       Luôn lấy bản mới trước.
    ================================================= */

    if (
        url.pathname.endsWith(
            "/data/data.js"
        )
    ) {

        event.respondWith(

            fetch(request)
                .then((response) => {

                    return response;

                })
                .catch(() => {

                    return caches.match(request);

                })

        );

        return;

    }


    /* =================================================
       FILE KHÁC
       Cache trước → mạng sau
    ================================================= */

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