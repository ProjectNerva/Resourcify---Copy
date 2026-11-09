/* Static app files only. Never intercept API requests, uploads or remote traffic. */
const PREFIX = "resourcify-static-";
const STATIC = [
  "/",
  "/offline.html",
  "/privacy.html",
  "/terms.html",
  "/policy.css",
  "/404.html",
  "/manifest.json",
  "/icons/resourcify-192.png",
  "/icons/resourcify-512.png",
];
let activeCache;
async function currentCache() {
  if (activeCache) return activeCache;
  const names = await caches.keys();
  activeCache =
    typeof BUILD_VERSION !== "undefined"
      ? PREFIX + BUILD_VERSION
      : names.find((name) => name.startsWith(PREFIX));
  return activeCache;
}
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const response = await fetch("/precache-assets.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Offline asset manifest unavailable");
      const manifest = await response.json();
      if (
        typeof BUILD_VERSION !== "undefined" &&
        manifest.version !== BUILD_VERSION
      )
        throw new Error(
          "Offline manifest changed during deployment. Retry the update.",
        );
      if (
        !/^[a-f0-9]{16}$/.test(manifest.version) ||
        !Array.isArray(manifest.files) ||
        manifest.files.some(
          (file) => !/^\/(assets\/[^?]+|index\.html)$/.test(file),
        )
      )
        throw new Error("Invalid offline asset manifest");
      const name = PREFIX + manifest.version,
        cache = await caches.open(name);
      try {
        await cache.addAll([...new Set([...STATIC, ...manifest.files])]);
        activeCache = name;
        await self.skipWaiting();
      } catch (error) {
        await caches.delete(name);
        throw error;
      }
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const keep = await currentCache();
      for (const name of await caches.keys())
        if (
          (name.startsWith("resourcify") || name.startsWith("mesh-")) &&
          name !== keep
        )
          await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (
    !STATIC.includes(url.pathname) &&
    !url.pathname.startsWith("/assets/") &&
    url.pathname !== "/index.html"
  )
    return;
  event.respondWith(
    (async () => {
      const name = await currentCache(),
        cache = name ? await caches.open(name) : null;
      const cached = cache ? await cache.match(url.pathname) : undefined;
      if (cached) return cached;
      return fetch(request);
    })(),
  );
});
