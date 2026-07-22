import type { SupabaseClient } from '@supabase/supabase-js';

export interface Branding {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  tokenPrefix: string;
}

// Generic fallback — used before /setup has run, if the branding_settings
// fetch fails, or for the handful of low-stakes pages (404, link-expired,
// MFA setup/verify) that don't bother fetching real branding.
export const DEFAULT_BRANDING: Branding = {
  name: 'My Company',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.svg',
  tokenPrefix: 'api_',
};

// Deployment-specific confirmation phrase shown/checked on the superadmin
// "wipe all data" danger-zone action — shared between the dialog (display)
// and the API route (server-side re-validation), so they can never drift.
export function wipeConfirmationPhrase(companyName: string): string {
  return `ELIMINAR TODO ${companyName}`;
}

export async function getBranding(supabase: SupabaseClient): Promise<Branding> {
  const { data } = await supabase
    .from('branding_settings')
    .select('name, logo_url, favicon_url, token_prefix')
    .limit(1)
    .single();

  if (!data) return DEFAULT_BRANDING;

  return {
    name: data.name,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    tokenPrefix: data.token_prefix,
  };
}
