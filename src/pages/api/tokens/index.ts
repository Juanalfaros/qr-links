import type { APIRoute } from 'astro';
import { createTokenSchema } from '@/lib/schemas/tokens';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { generateApiToken, hashApiToken } from '@/lib/api-tokens';
import { getBranding } from '@/lib/branding';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data, error } = await locals.supabase
    .from('api_tokens')
    .select('id, name, last_used_at, revoked_at, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ tokens: data ?? [] }), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = createTokenSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const branding = await getBranding(locals.supabase);
  const token = generateApiToken(branding.tokenPrefix);
  const token_hash = await hashApiToken(token);

  const { data, error } = await locals.supabase
    .from('api_tokens')
    .insert({ user_id: locals.user.id, name: parsed.data.name, token_hash })
    .select('id, name, last_used_at, revoked_at, created_at')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // The plaintext token is only ever available in this one response — only
  // its hash is stored, so it can never be shown again after this.
  return new Response(JSON.stringify({ token: data, plaintext: token }), { status: 201 });
};
