const CACHE_NAME = "agenda-v19";
const APP_FILES = [
  "./",
  "./index.html",
  "./dinsdag.html",
  "./woensdag.html",
  "./donderdag.html",
  "./vrijdag.html",
  "./zaterdag.html",
  "./zondag.html",
  "./notities.html",
  "./todo.html",
  "./links.html",
  "./profiel.html",
  "./index.js",
  "./i18n.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseCopy);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          const offlinePage = await caches.match("./index.html");
          if (offlinePage) {
            return offlinePage;
          }
          throw new Error("De pagina is offline niet beschikbaar.");
        }),
    );
    return;
  }

  if (request.destination === "script") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseCopy);
            });
          }
          return response;
        })
        .catch(async (error) => {
          const cachedScript = await caches.match(request);
          if (cachedScript) {
            return cachedScript;
          }
          throw error;
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseCopy);
          });
        }
        return response;
      });
    }),
  );
});
