export const siteConfig = {
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
    // Per-IP throttle on the self-service "forgot password" endpoint — this
    // is the one public, unauthenticated route that can trigger a real
    // Supabase email send, and the free tier's email quota is easy to burn.
    forgotPasswordRateLimit: { limit: 3, windowSeconds: 3600 },
  },
} as const;
