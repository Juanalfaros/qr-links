// Minimal, hand-written service worker (no Workbox/vite-plugin-pwa — that
// integration is built/tested for Astro's static/hybrid output, not
// `output: 'server'` + the Cloudflare Workers adapter this project uses).
//
// Caches ONLY static, content-addressed assets: /_astro/* (Vite/Astro
// content-hashes these filenames, so a URL never changes content),
// /scripts/*, /icons/*, and common static file extensions. Every other
// request — /api/*, /admin/*, /superadmin/*, /login, /setup, /[code], / —
// is left completely untouched (never enters respondWith), since this app's
// session checks, redirect lookups, and analytics all require a live,
// server-verified round trip on every request.
const CACHE_NAME = 'qr-link-static-v1';
const STATIC_PATTERN = /^\/(?:_astro|scripts|icons)\/|\.(?:png|svg|ico|woff2?)$/;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (!STATIC_PATTERN.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    }),
  );
});
