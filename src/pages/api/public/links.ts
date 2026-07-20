import type { APIRoute } from 'astro';
import { generateShortCode } from '@/lib/short-code';
import { createPublicLinkSchema } from '@/lib/schemas/tokens';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { validateDestinationUrl } from '@/lib/url-validation';
import { siteConfig } from '@/lib/config';

// locals.supabase is the service-role client here (see src/middleware.ts's
// Bearer-token branch) — RLS doesn't scope these queries, so every one below
// filters by user_id explicitly instead.
export const GET: APIRoute = async ({ url, locals }) => {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);

  const { data, error } = await locals.supabase
    .from('links')
    .select('id, title, short_code, destination_url, created_at, click_count')
    .eq('user_id', locals.user!.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ links: data ?? [] }), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = createPublicLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { title, destination_url, short_code: customShortCode } = parsed.data;

  const urlCheck = await validateDestinationUrl(locals.supabase, destination_url);
  if (!urlCheck.valid) {
    return new Response(JSON.stringify({ error: urlCheck.error }), { status: 400 });
  }

  const { data: quotaOk, error: quotaError } = await locals.supabase.rpc('check_and_increment_link_quota', {
    p_user_id: locals.user!.id,
    p_daily_limit: siteConfig.security.linksPerDayLimit,
  });
  if (quotaError) {
    return new Response(JSON.stringify({ error: quotaError.message }), { status: 500 });
  }
  if (!quotaOk) {
    return new Response(JSON.stringify({ error: 'Daily link creation limit reached' }), { status: 429 });
  }

  const short_code = customShortCode || generateShortCode();

  const { data, error } = await locals.supabase
    .from('links')
    .insert({ title, destination_url, short_code, user_id: locals.user!.id })
    .select('id, title, short_code, destination_url, created_at, click_count')
    .single();

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'short_code already in use' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ link: data }), { status: 201 });
};
