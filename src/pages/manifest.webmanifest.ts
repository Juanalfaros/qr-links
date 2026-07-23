import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { env } from 'cloudflare:workers';
import { getBranding } from '@/lib/branding';
import { defaultPrimaryHex, defaultBackgroundHex } from '@/lib/theme';

// Dynamic route, not a static public/manifest.json — name/colors/icons are
// 100% per-instance (same principle as favicon/title, which already work
// this way). No special cache-control: always reflects live branding, same
// as every other branding-derived response in this app.
//
// This path is deliberately NOT in src/middleware.ts's needsSession() list,
// same reasoning as the public redirect route ([code].astro): no session is
// needed (branding_settings_select_public's RLS policy is `using (true)`),
// so this creates its own plain anon client instead of paying for a
// cookie-parse + getUser() round trip on every manifest fetch.
export const GET: APIRoute = async () => {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const branding = await getBranding(supabase);

  const manifest = {
    id: '/',
    name: branding.name,
    short_name: branding.name.slice(0, 12),
    description: `Acortador de enlaces y generador de QR de ${branding.name}`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: defaultBackgroundHex(),
    theme_color: branding.primaryColor ?? defaultPrimaryHex(),
    icons: [
      {
        src: branding.pwaIcon192Url ?? '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: branding.pwaIcon512Url ?? '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: branding.pwaIcon512MaskableUrl ?? '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
};
