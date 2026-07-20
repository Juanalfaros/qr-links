-- Fase 7: company-wide analytics aggregates for the superadmin dashboard,
-- mirroring the per-link RPCs from migration 0011 but without a link_id
-- filter — relies entirely on RLS (analytics_select_own_or_superadmin) to
-- scope rows: a regular user would see only their own links' analytics,
-- a superadmin sees the whole company's.
create function public.get_analytics_summary_daily(p_from timestamptz default null, p_to timestamptz default null)
returns table (day date, clicks bigint)
language sql stable set search_path = public as $$
  select date_trunc('day', scanned_at)::date as day, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 1;
$$;
revoke all on function public.get_analytics_summary_daily from public;
grant execute on function public.get_analytics_summary_daily to authenticated;

create function public.get_analytics_summary_by_country(p_from timestamptz default null, p_to timestamptz default null)
returns table (country text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(country, 'Unknown') as country, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_country from public;
grant execute on function public.get_analytics_summary_by_country to authenticated;

create function public.get_analytics_summary_by_device(p_from timestamptz default null, p_to timestamptz default null)
returns table (device text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(device, 'Unknown') as device, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_device from public;
grant execute on function public.get_analytics_summary_by_device to authenticated;

create function public.get_analytics_summary_by_referrer(p_from timestamptz default null, p_to timestamptz default null)
returns table (referrer text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(referrer, 'Directo') as referrer, count(*) as clicks
  from public.analytics
  where (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_analytics_summary_by_referrer from public;
grant execute on function public.get_analytics_summary_by_referrer to authenticated;

create function public.get_analytics_summary_unique_visitors(p_from timestamptz default null, p_to timestamptz default null)
returns bigint
language sql stable set search_path = public as $$
  select count(distinct visitor_hash) from public.analytics
  where visitor_hash is not null
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to);
$$;
revoke all on function public.get_analytics_summary_unique_visitors from public;
grant execute on function public.get_analytics_summary_unique_visitors to authenticated;
