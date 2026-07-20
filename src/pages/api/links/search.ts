import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) {
    return new Response(JSON.stringify({ links: [] }), { status: 200 });
  }

  // RLS scopes this to the caller's own links (or all, for a superadmin) —
  // same command palette markup works for every role without special-casing.
  const escapedQ = q.replace(/[,()]/g, '');
  const { data, error } = await locals.supabase
    .from('links')
    .select('id, title, short_code')
    .is('deleted_at', null)
    .or(`title.ilike.*${escapedQ}*,short_code.ilike.*${escapedQ}*`)
    .limit(8);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ links: data ?? [] }), { status: 200 });
};
