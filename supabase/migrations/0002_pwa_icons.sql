-- PWA installability: dedicated icon URLs for the web app manifest
-- (src/pages/manifest.webmanifest.ts). Nullable — null means "use the
-- static defaults in public/icons/", generated from the app's own default
-- logo (see scripts/generate-default-pwa-icons.mjs). When set, these are
-- always PNG blobs generated client-side via <canvas> at upload time
-- (src/lib/pwa-icon.ts) — Cloudflare Workers can't process images without a
-- paid service, so no server-side resizing ever happens.
alter table public.branding_settings
  add column pwa_icon_192_url text,
  add column pwa_icon_512_url text,
  add column pwa_icon_512_maskable_url text;
