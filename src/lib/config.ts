export const siteConfig = {
  name: 'G&G · Links',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.svg',
  shortCodeLength: 7,
  qr: {
    defaultSize: 240,
    margin: 1,
  },
  security: {
    // Per-user link creation cap, enforced atomically by check_and_increment_link_quota.
    linksPerDayLimit: 200,
    // Per-IP redirect throttle, enforced at the edge via Cloudflare KV — see src/lib/rate-limit.ts.
    redirectRateLimit: { limit: 60, windowSeconds: 60 },
  },
} as const;
