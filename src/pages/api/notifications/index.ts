import type { APIRoute } from 'astro';
import { markNotificationReadSchema } from '@/lib/schemas/notifications';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // RLS (notifications_select_own) already scopes this to the caller.
  const { data, error } = await locals.supabase
    .from('notifications')
    .select('id, title, body, link_url, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const unreadCount = (data ?? []).filter((n) => !n.read_at).length;
  return new Response(JSON.stringify({ notifications: data ?? [], unreadCount }), { status: 200 });
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = markNotificationReadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  let query = locals.supabase.from('notifications').update({ read_at: new Date().toISOString() });
  query = parsed.data.markAll ? query.is('read_at', null) : query.eq('id', parsed.data.id ?? '');

  const { error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
