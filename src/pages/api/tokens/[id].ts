import type { APIRoute } from 'astro';

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { error } = await locals.supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Token not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
