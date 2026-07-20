import type { APIRoute } from 'astro';
import { createDepartmentSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = createDepartmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { data, error } = await locals.supabase
    .from('departments')
    .insert({ name: parsed.data.name })
    .select('id, name')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ department: data }), { status: 201 });
};
