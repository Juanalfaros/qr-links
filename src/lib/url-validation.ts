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
