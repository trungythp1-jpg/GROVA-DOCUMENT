const CACHE_NAME = "grova-document-v3";

const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];


/* =====================================================
   INSTALL
===================================================== */

self.addEventListener("install", (event) => {

    event.waitUntil(

        caches
            .open(CACHE_NAME)
            .then((cache) => {

                return cache.addAll(
                    APP_SHELL
                );
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

    const request =
        event.request;


    if (
        request.method !== "GET"
    ) {

        return;
    }


    const url =
        new URL(
            request.url
        );


    /*
     * DATA LUÔN ƯU TIÊN LẤY BẢN MỚI
     *
     * Đây là phần quan trọng nhất.
     */

    if (
        url.pathname.endsWith(
            "/data/data.js"
        )
    ) {

        event.respondWith(

            fetch(request)
                .then((response) => {

                    if (
                        response &&
                        response.status === 200
                    ) {

                        return response;
                    }

                    return caches.match(
                        request
                    );
                })
                .catch(() => {

                    return caches.match(
                        request
                    );
                })
        );

        return;
    }


    /*
     * Các file giao diện:
     * cache trước, nếu không có thì lấy mạng.
     */

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
                    })
                    .catch(() => {

                        return caches.match(
                            "./index.html"
                        );
                    });
            })
    );
});