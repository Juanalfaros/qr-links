import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface AlertRule {
  id: string;
  link_id: string | null;
  threshold_count: number;
  window_hours: number;
  notify_email: string;
  last_triggered_at: string | null;
}

// Same service-role reasoning as digest.ts: this background job checks
// every user's alert rules, not just one person's.
export async function checkAlertRules(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rules, error } = await supabase.from('alert_rules').select('*');
  if (error || !rules) return;

  const resend = new Resend(env.RESEND_API_KEY);

  for (const rule of rules as AlertRule[]) {
    // Cooldown: a rule that already fired within its own window shouldn't
    // re-fire on every hourly check until that window has fully elapsed.
    if (rule.last_triggered_at) {
      const cooldownMs = rule.window_hours * 60 * 60 * 1000;
      if (Date.now() - new Date(rule.last_triggered_at).getTime() < cooldownMs) continue;
    }

    const windowStart = new Date(Date.now() - rule.window_hours * 60 * 60 * 1000).toISOString();
    let query = supabase.from('analytics').select('*', { count: 'exact', head: true }).gte('scanned_at', windowStart);
    if (rule.link_id) query = query.eq('link_id', rule.link_id);

    const { count } = await query;
    if ((count ?? 0) < rule.threshold_count) continue;

    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: rule.notify_email,
      subject: 'Alerta de clics superada',
      html: `<p>Se registraron ${count} clics en las últimas ${rule.window_hours} horas, superando el umbral de ${rule.threshold_count}.</p>`,
    });

    await supabase.from('alert_rules').update({ last_triggered_at: new Date().toISOString() }).eq('id', rule.id);
  }
}
