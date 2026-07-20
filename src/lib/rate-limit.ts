export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// Fixed-window counter keyed by (key, window bucket). Cloudflare KV has no
// atomic increment, so a handful of concurrent requests right at the window
// boundary could slip past the limit by one or two — fine for abuse
// mitigation on a public endpoint, not a hard billing-grade cap.
export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const kvKey = `ratelimit:${key}:${windowStart}`;
  const current = Number((await kv.get(kvKey)) ?? '0');

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // TTL outlives the window itself so a slow write can't resurrect a stale
  // bucket after its window has already passed.
  await kv.put(kvKey, String(current + 1), { expirationTtl: windowSeconds * 2 });
  return { allowed: true, remaining: limit - current - 1 };
}
