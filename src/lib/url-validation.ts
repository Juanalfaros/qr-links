import type { SupabaseClient } from '@supabase/supabase-js';

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesDomain(hostname: string, domain: string): boolean {
  const normalized = domain.toLowerCase();
  return hostname === normalized || hostname.endsWith(`.${normalized}`);
}

// Google Safe Browsing was considered for this check and rejected — see
// migration 0019's comment. This validates against two hand-maintained,
// superadmin-managed lists instead: an allowlist (only enforced once it has
// at least one row, so a fresh install doesn't lock everyone out) and a
// blocklist of hostname substrings/domains.
export async function validateDestinationUrl(
  supabase: SupabaseClient,
  destinationUrl: string,
): Promise<UrlValidationResult> {
  const hostname = getHostname(destinationUrl);
  if (!hostname) {
    return { valid: false, error: 'destination_url must be a valid URL' };
  }

  const [{ data: allowedDomains }, { data: blockedPatterns }] = await Promise.all([
    supabase.from('allowed_domains').select('domain'),
    supabase.from('blocked_url_patterns').select('pattern'),
  ]);

  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some((d: { domain: string }) => matchesDomain(hostname, d.domain));
    if (!isAllowed) {
      return { valid: false, error: 'El dominio de destino no está permitido por la política de la empresa' };
    }
  }

  if (blockedPatterns) {
    const isBlocked = blockedPatterns.some((p: { pattern: string }) => hostname.includes(p.pattern.toLowerCase()));
    if (isBlocked) {
      return { valid: false, error: 'El dominio de destino está bloqueado por seguridad' };
    }
  }

  return { valid: true };
}

const PRIVATE_IPV4_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // private
  /^172\.(1[6-9]|2\d|3[01])\./, // private
  /^192\.168\./, // private
  /^169\.254\./, // link-local
  /^0\./, // "this network"
];

function isPrivateOrLoopbackHost(hostname: string): boolean {
  if (hostname === 'localhost') return true;
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))) return true;
  // IPv6 loopback (::1), unique local (fc00::/7), and link-local (fe80::/10).
  if (hostname === '::1' || /^\[?::1\]?$/.test(hostname)) return true;
  if (/^\[?f[cd][0-9a-f]{2}:/i.test(hostname)) return true;
  if (/^\[?fe[89ab][0-9a-f]:/i.test(hostname)) return true;
  return false;
}

// Server-side webhook fetch (src/pages/[code].astro) has no reason to ever
// reach an internal/private address — this blocks the obvious SSRF targets
// by inspecting the hostname as written. It does NOT resolve DNS, so a
// hostname that only resolves to a private IP at request time (DNS
// rebinding) isn't caught here; that would require a resolve-then-check
// fetch implementation, which this project doesn't do.
export function validateWebhookUrl(url: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'webhook_url must be a valid URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'webhook_url must use https' };
  }

  if (isPrivateOrLoopbackHost(parsed.hostname.toLowerCase())) {
    return { valid: false, error: 'webhook_url no puede apuntar a una dirección privada o local' };
  }

  return { valid: true };
}
