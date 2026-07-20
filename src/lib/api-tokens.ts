const TOKEN_PREFIX = 'qrgyg_';

// High-entropy random tokens (unlike user passwords) don't need a slow KDF —
// a single SHA-256 pass is standard practice for API token storage (GitHub,
// Stripe, etc.) and matches the SubtleCrypto pattern already used for
// visitor hashing in src/pages/[code].astro.
export function generateApiToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const random = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${TOKEN_PREFIX}${random}`;
}

export async function hashApiToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
