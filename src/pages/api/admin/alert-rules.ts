import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createAlertRuleSchema, deleteByIdSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = createAlertRuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  // A null link_id (company-wide alert) is only allowed for a superadmin —
  // enforced again here (not just in the RLS insert policy) so the error
  // message is clear instead of a generic RLS-violation string.
  if (!parsed.data.linkId && locals.user.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Solo un superadmin puede crear alertas de toda la empresa' }), {
      status: 403,
    });
  }

  // notify_email must belong to a profile in this instance — otherwise a
  // user could exfiltrate click-count data to an arbitrary external address.
  // Uses the admin client (not locals.supabase) because RLS only lets a
  // plain "user" role see their own profile row — this check must find any
  // profile in the instance, not just ones visible to the caller.
  const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: recipient, error: recipientError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.notifyEmail)
    .maybeSingle();

  if (recipientError) {
    return new Response(JSON.stringify({ error: recipientError.message }), { status: 500 });
  }
  if (!recipient) {
    return new Response(
      JSON.stringify({ error: 'notify_email debe ser el email de un usuario existente en esta instancia' }),
      { status: 400 },
    );
  }

  const { data, error } = await locals.supabase
    .from('alert_rules')
    .insert({
      created_by: locals.user.id,
      link_id: parsed.data.linkId,
      threshold_count: parsed.data.thresholdCount,
      window_hours: parsed.data.windowHours,
      notify_email: parsed.data.notifyEmail,
    })
    .select('id, link_id, threshold_count, window_hours, notify_email, last_triggered_at, created_at')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ rule: data }), { status: 201 });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const parsed = deleteByIdSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const { error } = await locals.supabase.from('alert_rules').delete().eq('id', parsed.data.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
