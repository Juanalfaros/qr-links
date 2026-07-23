import type { SupabaseClient } from '@supabase/supabase-js';

export interface Branding {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  tokenPrefix: string;
  primaryColor: string | null;
  accentColor: string | null;
  accentYellowColor: string | null;
  accentPinkColor: string | null;
  accentGreenColor: string | null;
  accentBlueColor: string | null;
  accentLilacColor: string | null;
  radiusRem: number | null;
  sidebarStyle: 'dark' | 'brand' | null;
  qrDarkColor: string | null;
  pwaIcon192Url: string | null;
  pwaIcon512Url: string | null;
  pwaIcon512MaskableUrl: string | null;
}

// Generic fallback — used before /setup has run, if the branding_settings
// fetch fails, or for the handful of low-stakes pages (404, link-expired,
// MFA setup/verify) that don't bother fetching real branding.
export const DEFAULT_BRANDING: Branding = {
  name: 'My Company',
  logoUrl: '/logo.svg',
  faviconUrl: '/favicon.svg',
  tokenPrefix: 'api_',
  primaryColor: null,
  accentColor: null,
  accentYellowColor: null,
  accentPinkColor: null,
  accentGreenColor: null,
  accentBlueColor: null,
  accentLilacColor: null,
  radiusRem: null,
  sidebarStyle: null,
  qrDarkColor: null,
  pwaIcon192Url: '/icons/icon-192.png',
  pwaIcon512Url: '/icons/icon-512.png',
  pwaIcon512MaskableUrl: '/icons/icon-512-maskable.png',
};

// Spread onto <BaseLayout> so every page threads the same 9 theme-related
// props the same way — see src/lib/theme.ts for what they do.
export function brandingThemeProps(branding: Branding) {
  return {
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    accentYellowColor: branding.accentYellowColor,
    accentPinkColor: branding.accentPinkColor,
    accentGreenColor: branding.accentGreenColor,
    accentBlueColor: branding.accentBlueColor,
    accentLilacColor: branding.accentLilacColor,
    radiusRem: branding.radiusRem,
    sidebarStyle: branding.sidebarStyle,
  };
}

// Resolved (never-null) icon URLs for the manifest route and BaseLayout's
// apple-touch-icon — falls back to the static defaults in public/icons/
// exactly like siteName/faviconUrl already do in BaseLayout's own props.
export function brandingPwaProps(branding: Branding): {
  pwaIcon192Url: string;
  pwaIcon512Url: string;
  pwaIcon512MaskableUrl: string;
} {
  return {
    pwaIcon192Url: branding.pwaIcon192Url ?? DEFAULT_BRANDING.pwaIcon192Url!,
    pwaIcon512Url: branding.pwaIcon512Url ?? DEFAULT_BRANDING.pwaIcon512Url!,
    pwaIcon512MaskableUrl: branding.pwaIcon512MaskableUrl ?? DEFAULT_BRANDING.pwaIcon512MaskableUrl!,
  };
}

// Deployment-specific confirmation phrase shown/checked on the superadmin
// "wipe all data" danger-zone action — shared between the dialog (display)
// and the API route (server-side re-validation), so they can never drift.
export function wipeConfirmationPhrase(companyName: string): string {
  return `ELIMINAR TODO ${companyName}`;
}

export async function getBranding(supabase: SupabaseClient): Promise<Branding> {
  const { data } = await supabase
    .from('branding_settings')
    .select(
      'name, logo_url, favicon_url, token_prefix, primary_color, accent_color, accent_yellow_color, accent_pink_color, accent_green_color, accent_blue_color, accent_lilac_color, radius_rem, sidebar_style, qr_dark_color, pwa_icon_192_url, pwa_icon_512_url, pwa_icon_512_maskable_url',
    )
    .limit(1)
    .single();

  if (!data) return DEFAULT_BRANDING;

  return {
    name: data.name,
    logoUrl: data.logo_url,
    faviconUrl: data.favicon_url,
    tokenPrefix: data.token_prefix,
    primaryColor: data.primary_color,
    accentColor: data.accent_color,
    accentYellowColor: data.accent_yellow_color,
    accentPinkColor: data.accent_pink_color,
    accentGreenColor: data.accent_green_color,
    accentBlueColor: data.accent_blue_color,
    accentLilacColor: data.accent_lilac_color,
    radiusRem: data.radius_rem,
    sidebarStyle: data.sidebar_style,
    qrDarkColor: data.qr_dark_color,
    pwaIcon192Url: data.pwa_icon_192_url,
    pwaIcon512Url: data.pwa_icon_512_url,
    pwaIcon512MaskableUrl: data.pwa_icon_512_maskable_url,
  };
}
