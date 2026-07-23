import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { forgotPasswordSchema } from '@/lib/schemas/auth';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { checkRateLimit } from '@/lib/rate-limit';
import { siteConfig } from '@/lib/config';

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = forgotPasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const clientIp = request.headers.get('cf-connecting-ip') ?? '';
  if (clientIp) {
    const rateLimit = await checkRateLimit(
      env.RATE_LIMIT_KV,
      `forgot-password:${clientIp}`,
      siteConfig.security.forgotPasswordRateLimit.limit,
      siteConfig.security.forgotPasswordRateLimit.windowSeconds,
    );
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Demasiados intentos, prueba de nuevo más tarde' }), {
        status: 429,
      });
    }
  }

  await locals.supabase.auth.resetPasswordForEmail(parsed.data.email, {
    captchaToken: parsed.data.captchaToken,
    redirectTo: `${env.PUBLIC_SITE_URL}/reset-password`,
  });

  // Always 204 regardless of whether the email exists or the send itself
  // succeeded — this route is public/unauthenticated, so leaking which
  // outcome occurred would let it be used to enumerate registered emails.
  return new Response(null, { status: 204 });
};
