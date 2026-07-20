import type { SupabaseClient } from '@supabase/supabase-js';

export interface LinkAnalyticsStats {
  total: number;
  unique: number;
  days: { day: string; clicks: number }[];
  byCountry: { label: string; clicks: number }[];
  byDevice: { label: string; clicks: number }[];
  byReferrer: { label: string; clicks: number }[];
  byChannel: { label: string; clicks: number }[];
}

const CHANNEL_LABELS: Record<string, string> = { qr: 'Código QR', link: 'Link directo' };

export async function fetchLinkAnalytics(
  supabase: SupabaseClient,
  linkId: string,
  fromIso: string | null,
  toIso: string | null,
): Promise<LinkAnalyticsStats> {
  let totalQuery = supabase.from('analytics').select('*', { count: 'exact', head: true }).eq('link_id', linkId);
  if (fromIso) totalQuery = totalQuery.gte('scanned_at', fromIso);
  if (toIso) totalQuery = totalQuery.lte('scanned_at', toIso);

  const [
    { count: total },
    { data: uniqueCount },
    { data: daily },
    { data: byCountry },
    { data: byDevice },
    { data: byReferrer },
    { data: byChannel },
  ] = await Promise.all([
    totalQuery,
    supabase.rpc('get_link_analytics_unique_visitors', { p_link_id: linkId, p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_link_analytics_daily', { p_link_id: linkId, p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_link_analytics_by_country', { p_link_id: linkId, p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_link_analytics_by_device', { p_link_id: linkId, p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_link_analytics_by_referrer', { p_link_id: linkId, p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_link_analytics_by_channel', { p_link_id: linkId, p_from: fromIso, p_to: toIso }),
  ]);

  return {
    total: total ?? 0,
    unique: Number(uniqueCount ?? 0),
    days: (daily ?? []) as { day: string; clicks: number }[],
    byCountry: ((byCountry ?? []) as { country: string; clicks: number }[]).map((c) => ({
      label: c.country,
      clicks: c.clicks,
    })),
    byDevice: ((byDevice ?? []) as { device: string; clicks: number }[]).map((d) => ({
      label: d.device,
      clicks: d.clicks,
    })),
    byReferrer: ((byReferrer ?? []) as { referrer: string; clicks: number }[]).map((r) => ({
      label: r.referrer,
      clicks: r.clicks,
    })),
    byChannel: ((byChannel ?? []) as { channel: string; clicks: number }[]).map((c) => ({
      label: CHANNEL_LABELS[c.channel] ?? c.channel,
      clicks: c.clicks,
    })),
  };
}

// Fase 7: company-wide equivalent, backing the superadmin dashboard's
// aggregate view. RLS (analytics_select_own_or_superadmin) scopes this
// naturally — a regular user calling it would just see their own links'
// totals, though only the superadmin dashboard actually calls it today.
export async function fetchCompanyAnalytics(
  supabase: SupabaseClient,
  fromIso: string | null,
  toIso: string | null,
): Promise<LinkAnalyticsStats> {
  let totalQuery = supabase.from('analytics').select('*', { count: 'exact', head: true });
  if (fromIso) totalQuery = totalQuery.gte('scanned_at', fromIso);
  if (toIso) totalQuery = totalQuery.lte('scanned_at', toIso);

  const [
    { count: total },
    { data: uniqueCount },
    { data: daily },
    { data: byCountry },
    { data: byDevice },
    { data: byReferrer },
    { data: byChannel },
  ] = await Promise.all([
    totalQuery,
    supabase.rpc('get_analytics_summary_unique_visitors', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_analytics_summary_daily', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_analytics_summary_by_country', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_analytics_summary_by_device', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_analytics_summary_by_referrer', { p_from: fromIso, p_to: toIso }),
    supabase.rpc('get_analytics_summary_by_channel', { p_from: fromIso, p_to: toIso }),
  ]);

  return {
    total: total ?? 0,
    unique: Number(uniqueCount ?? 0),
    days: (daily ?? []) as { day: string; clicks: number }[],
    byCountry: ((byCountry ?? []) as { country: string; clicks: number }[]).map((c) => ({
      label: c.country,
      clicks: c.clicks,
    })),
    byDevice: ((byDevice ?? []) as { device: string; clicks: number }[]).map((d) => ({
      label: d.device,
      clicks: d.clicks,
    })),
    byReferrer: ((byReferrer ?? []) as { referrer: string; clicks: number }[]).map((r) => ({
      label: r.referrer,
      clicks: r.clicks,
    })),
    byChannel: ((byChannel ?? []) as { channel: string; clicks: number }[]).map((c) => ({
      label: CHANNEL_LABELS[c.channel] ?? c.channel,
      clicks: c.clicks,
    })),
  };
}
