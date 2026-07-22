import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { resetPasswordSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';

export const POST: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const parsed = resetPasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  // Uses Supabase's own built-in recovery email (no Resend/custom mailer
  // needed) — same free-tier constraint as the rest of this project.
  const { error } = await locals.supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(null, { status: 204 });
};
