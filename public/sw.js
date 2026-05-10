const SHELL_CACHE = "shell-cache-v1"
const IMAGE_CACHE = "image-cache-v1"

// Static shell assets to precache — update this list when the build output changes.
const SHELL_URLS = ["/"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_URLS)
    }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key)),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Cache-first for image requests (album art).
  if (request.destination === "image" || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone())
            }
            return response
          })
          return cached || fetchPromise
        }),
      ),
    )
    return
  }

  // Network-first for navigation requests (Inertia pages).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match("/")
        })
      }),
    )
    return
  }

  // Pass through for everything else.
  event.respondWith(fetch(request))
})
