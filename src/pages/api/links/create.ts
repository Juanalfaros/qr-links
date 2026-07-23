import type { APIRoute } from 'astro';
import { generateShortCode } from '@/lib/short-code';
import { createLinkSchema } from '@/lib/schemas/link';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { validateDestinationUrl, validateWebhookUrl } from '@/lib/url-validation';
import { siteConfig } from '@/lib/config';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = createLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { title, destination_url, short_code: customShortCode, password, ...rest } = parsed.data;

  const urlCheck = await validateDestinationUrl(locals.supabase, destination_url);
  if (!urlCheck.valid) {
    return new Response(JSON.stringify({ error: urlCheck.error }), { status: 400 });
  }

  if (rest.webhook_url) {
    const webhookCheck = validateWebhookUrl(rest.webhook_url);
    if (!webhookCheck.valid) {
      return new Response(JSON.stringify({ error: webhookCheck.error }), { status: 400 });
    }
  }

  const { data: quotaOk, error: quotaError } = await locals.supabase.rpc('check_and_increment_link_quota', {
    p_user_id: locals.user.id,
    p_daily_limit: siteConfig.security.linksPerDayLimit,
  });
  if (quotaError) {
    return new Response(JSON.stringify({ error: quotaError.message }), { status: 500 });
  }
  if (!quotaOk) {
    return new Response(JSON.stringify({ error: 'Alcanzaste el límite diario de links creados' }), { status: 429 });
  }

  const short_code = customShortCode || generateShortCode();

  const { data, error } = await locals.supabase
    .from('links')
    .insert({ title, destination_url, short_code, user_id: locals.user.id, ...rest })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'short_code already in use' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (password) {
    const { error: passwordError } = await locals.supabase.rpc('set_link_password', {
      p_link_id: data.id,
      p_password: password,
    });
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ link: { ...data, has_password: Boolean(password) } }), { status: 201 });
};
