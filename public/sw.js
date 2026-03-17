const SHELL_CACHE = "adaptiq-shell-v1"
const DYNAMIC_CACHE = "adaptiq-dynamic-v1"

const APP_SHELL = [
  "/",
  "/student/dashboard",
  "/student/lessons",
  "/student/chat",
  "/manifest.webmanifest",
  "/placeholder-logo.png",
  "/apple-icon.png",
  "/pwa-192.png",
  "/pwa-512.png",
  "/icon.svg",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, DYNAMIC_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          const cloned = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned))
          return response
        })
        .catch(() => cachedResponse)

      return cachedResponse || networkFetch
    }),
  )
})

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
