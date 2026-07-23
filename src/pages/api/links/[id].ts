import type { APIRoute } from 'astro';
import { updateLinkSchema } from '@/lib/schemas/link';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { validateDestinationUrl, validateWebhookUrl } from '@/lib/url-validation';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = updateLinkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  // `password` isn't a real column — hashed server-side via set_link_password,
  // never written directly. Split it off before the plain column update.
  const { password, ...columns } = parsed.data;

  if (columns.destination_url) {
    const urlCheck = await validateDestinationUrl(locals.supabase, columns.destination_url);
    if (!urlCheck.valid) {
      return new Response(JSON.stringify({ error: urlCheck.error }), { status: 400 });
    }
  }

  if (columns.webhook_url) {
    const webhookCheck = validateWebhookUrl(columns.webhook_url);
    if (!webhookCheck.valid) {
      return new Response(JSON.stringify({ error: webhookCheck.error }), { status: 400 });
    }
  }

  if (Object.keys(columns).length > 0) {
    const { error } = await locals.supabase.from('links').update(columns).eq('id', params.id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  if ('password' in parsed.data) {
    const { error: passwordError } = await locals.supabase.rpc('set_link_password', {
      p_link_id: params.id,
      p_password: password ?? null,
    });
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError.message }), { status: 500 });
    }
  }

  const { data, error: selectError } = await locals.supabase.from('links').select('*').eq('id', params.id).single();

  if (selectError) {
    if (selectError.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Link not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ error: selectError.message }), { status: 500 });
  }

  const { password_hash, ...linkWithoutHash } = data;
  return new Response(JSON.stringify({ link: { ...linkWithoutHash, has_password: password_hash !== null } }), {
    status: 200,
  });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Soft delete: the redirect RPC (get_link_for_redirect) already excludes
  // deleted_at is not null, so this takes effect immediately.
  const { data, error } = await locals.supabase
    .from('links')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Link not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const { password_hash, ...linkWithoutHash } = data;
  return new Response(JSON.stringify({ link: { ...linkWithoutHash, has_password: password_hash !== null } }), {
    status: 200,
  });
};
