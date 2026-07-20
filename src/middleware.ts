import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { createSupabaseServerClient } from './lib/supabase/server';
import { createSupabaseAdminClient } from './lib/supabase/admin';
import { hashApiToken } from './lib/api-tokens';

const needsSession = (pathname: string) =>
  pathname.startsWith('/admin') ||
  pathname.startsWith('/superadmin') ||
  pathname === '/login' ||
  pathname.startsWith('/api/');

interface ApiTokenLookupRow {
  id: string;
  user_id: string;
  // Unlike the audit_log -> profiles embed elsewhere in this codebase, this
  // one comes back as a single object, not an array — user_id -> profiles.id
  // is a to-one FK against a primary key, which PostgREST embeds directly.
  profiles: { email: string; role: import('./lib/types').UserRole; suspended_at: string | null } | null;
}

// The public API (src/pages/api/public/*) is for external/scripted callers,
// not a browser session — it authenticates via a static Bearer token instead
// of the cookie-based Supabase session the rest of the app uses. Token
// lookup has to happen before we know which user it belongs to, so this uses
// the service-role client rather than the RLS-scoped one; every public route
// must therefore filter explicitly by `user_id` itself (RLS provides no
// safety net here), same discipline already used by the admin-only routes
// under src/pages/api/admin/*.
async function authenticatePublicApi(
  request: Request,
  cfContext: ExecutionContext,
): Promise<App.Locals['user'] | null> {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const tokenHash = await hashApiToken(token);
  const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await admin
    .from('api_tokens')
    .select('id, user_id, profiles(email, role, suspended_at)')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .single<ApiTokenLookupRow>();

  const profile = data?.profiles;
  if (!data || !profile || profile.suspended_at) return null;

  cfContext.waitUntil(
    (async () => {
      await admin.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
    })(),
  );

  return { id: data.user_id, email: profile.email, role: profile.role };
}

export const onRequest = defineMiddleware(async ({ request, locals, cookies, url, redirect }, next) => {
  if (url.pathname.startsWith('/api/public/')) {
    locals.user = await authenticatePublicApi(request, locals.cfContext);
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Invalid or missing API token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    locals.supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    return next();
  }

  // Only resolve the Supabase session for paths that actually need it — this keeps
  // the public, high-traffic redirect route ([code].astro) from paying for a
  // cookie parse + getUser() round trip before it fires the 302.
  if (!needsSession(url.pathname)) return next();

  const supabase = createSupabaseServerClient(request, cookies, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  locals.supabase = supabase;

  locals.user = null;
  try {
    // getUser() revalidates against the Supabase Auth server; getSession() only reads
    // the JWT from cookies and must never be used for authorization decisions.
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, role, suspended_at')
        .eq('id', authUser.id)
        .single();
      // A suspended profile is treated exactly like "no session": this is the
      // fast, reliable enforcement path (checked on every request); the
      // ban_duration set via the Admin API in suspend-user.ts is a
      // defense-in-depth backstop that also blocks new logins/token refreshes
      // at the Supabase Auth layer itself.
      if (profile && !profile.suspended_at) {
        locals.user = { id: authUser.id, email: profile.email, role: profile.role };
      }
    }
  } catch (err) {
    // A transient network/DNS failure reaching Supabase must not 500 every
    // protected page — treat it the same as "not authenticated".
    console.error('failed to resolve Supabase session', err);
  }

  const isProtected = url.pathname.startsWith('/admin') || url.pathname.startsWith('/superadmin');
  if (isProtected && !locals.user) {
    return redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
  if (url.pathname.startsWith('/superadmin') && locals.user?.role !== 'superadmin') {
    return redirect('/admin/dashboard');
  }

  // Superadmin accounts must complete TOTP 2FA before reaching any other
  // /superadmin page — the most powerful role gets the strongest gate.
  // These two pages are excluded from the checks below to avoid redirecting
  // them to themselves.
  const isMfaPage = url.pathname === '/superadmin/mfa-setup' || url.pathname === '/superadmin/mfa-verify';
  if (url.pathname.startsWith('/superadmin') && locals.user?.role === 'superadmin' && !isMfaPage) {
    // A failure here (rare — this rarely hits the network per Supabase's own
    // docs) is treated as "needs to verify", the safe default: it blocks
    // access rather than silently granting it.
    let aal: { currentLevel: string | null; nextLevel: string | null } | null = null;
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      aal = data;
    } catch (err) {
      console.error('failed to resolve MFA assurance level', err);
    }

    const hasFactorToStepUpTo = aal?.nextLevel === 'aal2';
    const alreadyAtAal2 = aal?.currentLevel === 'aal2';

    if (!alreadyAtAal2) {
      if (!hasFactorToStepUpTo) {
        return redirect('/superadmin/mfa-setup');
      }
      return redirect(`/superadmin/mfa-verify?redirectTo=${encodeURIComponent(url.pathname)}`);
    }
  }

  return next();
});
