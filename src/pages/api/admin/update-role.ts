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

  const { userId, role } = parsed.data;

  if (role !== 'superadmin') {
    const { data: target, error: targetError } = await locals.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (targetError) {
      return new Response(JSON.stringify({ error: targetError.message }), { status: 500 });
    }

    if (target.role === 'superadmin') {
      const { count, error: countError } = await locals.supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'superadmin');

      if (countError) {
        return new Response(JSON.stringify({ error: countError.message }), { status: 500 });
      }

      if ((count ?? 0) <= 1) {
        return new Response(JSON.stringify({ error: 'No podés quitarle el rol de superadmin al único superadmin' }), {
          status: 400,
        });
      }
    }
  }

  // Deliberately not the admin client: this is a plain data change already
  // covered by the profiles_update_superadmin RLS policy.
  const { error } = await locals.supabase.from('profiles').update({ role }).eq('id', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
