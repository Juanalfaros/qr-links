import type { APIRoute } from 'astro';
import { updateProfileSchema } from '@/lib/schemas/profile';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = updateProfileSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  // profiles_update_self only allows id = auth.uid(), and the guard trigger
  // rejects role/email/department/suspension changes — this route only ever
  // sends full_name/avatar_url, so it never trips that guard.
  const { data, error } = await locals.supabase
    .from('profiles')
    .update({ full_name: parsed.data.full_name, avatar_url: parsed.data.avatar_url })
    .eq('id', locals.user.id)
    .select('id, email, role, created_at, full_name, avatar_url, department_id, suspended_at')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ profile: data }), { status: 200 });
};
