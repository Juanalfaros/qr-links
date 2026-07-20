import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { suspendUserSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

// ~100 years, matching Supabase's own "ban a user" example — there's no
// dedicated "unlimited" value, so a duration this long is the accepted idiom.
const INDEFINITE_BAN = '876000h';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = suspendUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { userId, suspend } = parsed.data;

  if (userId === locals.user.id) {
    return new Response(JSON.stringify({ error: 'No puedes suspenderte a ti mismo' }), { status: 400 });
  }

  // profiles.suspended_at is the primary, immediate enforcement path — the
  // middleware checks it on every request. The Admin API ban below is
  // defense-in-depth: it also blocks new logins/token refreshes at the
  // Supabase Auth layer, in case a request ever reaches Supabase directly.
  const { error } = await locals.supabase
    .from('profiles')
    .update({ suspended_at: suspend ? new Date().toISOString() : null })
    .eq('id', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? INDEFINITE_BAN : 'none',
  });

  if (banError) {
    return new Response(JSON.stringify({ error: banError.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
