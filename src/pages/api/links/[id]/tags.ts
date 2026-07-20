import type { APIRoute } from 'astro';
import { setLinkTagsSchema } from '@/lib/schemas/tag';
import { firstErrorMessage } from '@/lib/schemas/validate';

// Replaces the full set of tags for a link (RLS on link_tags scopes both the
// delete and insert to links the caller owns, mirroring links_update_own_or_superadmin).
export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = setLinkTagsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const linkId = params.id;

  const { error: deleteError } = await locals.supabase.from('link_tags').delete().eq('link_id', linkId);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  if (parsed.data.tagIds.length > 0) {
    const { error: insertError } = await locals.supabase
      .from('link_tags')
      .insert(parsed.data.tagIds.map((tagId) => ({ link_id: linkId, tag_id: tagId })));
    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }
  }

  return new Response(null, { status: 204 });
};
