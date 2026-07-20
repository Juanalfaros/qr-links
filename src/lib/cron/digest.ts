import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Uses the service-role key deliberately: a scheduled job has no single
// "acting user" for RLS to scope against, and a company-wide digest needs to
// see every link's analytics regardless of owner — same reasoning as the
// admin.* Supabase Auth calls elsewhere in this app.
export async function sendWeeklyDigest(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: totalClicks }, { data: uniqueVisitors }, { data: byCountry }, { data: superadmins }] =
    await Promise.all([
      supabase.from('analytics').select('*', { count: 'exact', head: true }).gte('scanned_at', since),
      supabase.rpc('get_analytics_summary_unique_visitors', { p_from: since, p_to: null }),
      supabase.rpc('get_analytics_summary_by_country', { p_from: since, p_to: null }),
      supabase.from('profiles').select('email').eq('role', 'superadmin'),
    ]);

  if (!superadmins || superadmins.length === 0) return;

  const topCountries = ((byCountry ?? []) as { country: string; clicks: number }[]).slice(0, 5);
  const topCountriesHtml = topCountries.map((c) => `<li>${c.country}: ${c.clicks} clics</li>`).join('');

  const html = `
    <h1>Resumen semanal de clics</h1>
    <p><strong>Clics totales:</strong> ${totalClicks ?? 0}</p>
    <p><strong>Visitantes únicos:</strong> ${Number(uniqueVisitors ?? 0)}</p>
    <h2>Top países</h2>
    <ul>${topCountriesHtml || '<li>Sin datos todavía.</li>'}</ul>
  `;

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: superadmins.map((s: { email: string }) => s.email),
    subject: 'Resumen semanal de clics',
    html,
  });
}
