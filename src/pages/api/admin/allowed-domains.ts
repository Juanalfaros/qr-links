import type { APIRoute } from 'astro';
import { createAllowedDomainSchema, deleteByIdSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = createAllowedDomainSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { data, error } = await locals.supabase
    .from('allowed_domains')
    .insert({ domain: parsed.data.domain })
    .select('id, domain')
    .single();

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'Ese dominio ya está en la lista' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ domain: data }), { status: 201 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { error } = await locals.supabase.from('allowed_domains').delete().eq('id', parsed.data.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
