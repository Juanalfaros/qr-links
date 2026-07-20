import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies, AstroCookieSetOptions } from 'astro';

export function createSupabaseServerClient(request: Request, cookies: AstroCookies, url: string, anonKey: string) {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get('Cookie') ?? '').filter(
          (cookie): cookie is { name: string; value: string } => cookie.value !== undefined,
        ),
      setAll: (cookiesToSet: { name: string; value: string; options: AstroCookieSetOptions }[]) => {
        cookiesToSet.forEach(({ name, value, options }) => cookies.set(name, value, options));
      },
    },
  });
}
