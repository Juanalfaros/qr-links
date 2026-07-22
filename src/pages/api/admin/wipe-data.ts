import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { env } from 'cloudflare:workers';
import { wipeDataSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { getBranding, wipeConfirmationPhrase } from '@/lib/branding';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = wipeDataSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  // Never trust a client-supplied "expected phrase" — re-fetch the real
  // branding name server-side and compare against that.
  const branding = await getBranding(locals.supabase);
  if (parsed.data.confirmationPhrase !== wipeConfirmationPhrase(branding.name)) {
    return new Response(JSON.stringify({ error: 'La frase de confirmación no coincide' }), { status: 400 });
  }

  // Re-verify the acting superadmin's current password via a throwaway,
  // non-persisted client — proves the request isn't coming from a hijacked/
  // unattended open session, without disturbing the real session cookies.
  const reauthClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: reauthError } = await reauthClient.auth.signInWithPassword({
    email: locals.user.email,
    password: parsed.data.password,
  });
  if (reauthError) {
    return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), { status: 401 });
  }

  const { error: wipeError } = await locals.supabase.rpc('wipe_all_data');
  if (wipeError) {
    return new Response(JSON.stringify({ error: wipeError.message }), { status: 500 });
  }

  // audit_log itself was just truncated by wipe_all_data — write one row
  // documenting the wipe so there's at least a minimal forensic trace. Best
  // effort: the wipe already succeeded, so a failure here shouldn't turn the
  // response into an error.
  try {
    const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    await admin
      .from('audit_log')
      .insert({ actor_id: locals.user.id, action: 'data_wiped', target_table: 'all', metadata: {} });
  } catch (err) {
    console.error('failed to record data_wiped audit entry', err);
  }

  return new Response(null, { status: 204 });
};
