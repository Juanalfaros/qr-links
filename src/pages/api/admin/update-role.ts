import type { APIRoute } from 'astro';
import { updateRoleSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = updateRoleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  // Deliberately not the admin client: this is a plain data change already
  // covered by the profiles_update_superadmin RLS policy.
  const { error } = await locals.supabase
    .from('profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
