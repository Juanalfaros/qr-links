import type { APIRoute } from 'astro';
import { toCsv } from '@/lib/csv';

export const GET: APIRoute = async ({ params, url, locals }) => {
  if (!locals.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  // RLS (analytics_select_own_or_superadmin) scopes this to the caller's own
  // links or, for a superadmin, any link — a non-owner requesting someone
  // else's id just gets zero rows back.
  let query = locals.supabase
    .from('analytics')
    .select('scanned_at, country, city, device, os, browser, referrer, utm_source')
    .eq('link_id', params.id)
    .order('scanned_at', { ascending: true });

  if (from) query = query.gte('scanned_at', new Date(from).toISOString());
  if (to) query = query.lte('scanned_at', new Date(`${to}T23:59:59.999Z`).toISOString());

  const { data, error } = await query;
  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const csv = toCsv(
    ['scanned_at', 'country', 'city', 'device', 'os', 'browser', 'referrer', 'utm_source'],
    (data ?? []).map((row) => [
      row.scanned_at,
      row.country,
      row.city,
      row.device,
      row.os,
      row.browser,
      row.referrer,
      row.utm_source,
    ]),
  );

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="analytics-${params.id}.csv"`,
    },
  });
};
