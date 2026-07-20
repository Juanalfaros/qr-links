import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { inviteUserSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = inviteUserSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${env.PUBLIC_SITE_URL}/login`,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ user: { id: data.user.id, email: data.user.email } }), { status: 201 });
};
