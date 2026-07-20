import type { APIRoute } from 'astro';
import { createTagSchema } from '@/lib/schemas/tag';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data, error } = await locals.supabase.from('tags').select('id, name').order('name', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ tags: data }), { status: 200 });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = createTagSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { data, error } = await locals.supabase
    .from('tags')
    .insert({ name: parsed.data.name, user_id: locals.user.id })
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') {
      return new Response(JSON.stringify({ error: 'a tag with that name already exists' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ tag: data }), { status: 201 });
};
