-- Fase 3: referrer tracking + unique-visitor dedup, and date-range-aware
-- analytics. The old link_analytics_* views had no way to accept a date
-- range parameter, so they're replaced with SQL functions of the same shape
-- (p_link_id, p_from, p_to both optional) callable via .rpc() from any page
-- that needs a filtered breakdown — including the new links-comparison page.
alter table public.analytics
  add column referrer text,
  add column visitor_hash text;

create index analytics_link_id_visitor_hash_idx on public.analytics (link_id, visitor_hash);

-- Adding parameters with defaults at the end of an existing function's
-- argument list is one of the few signature changes CREATE OR REPLACE
-- allows in place — grants survive, no drop/re-grant needed here (unlike
-- the RETURNS TABLE shape change in migration 0010).
create or replace function public.record_scan(
  p_link_id uuid, p_country text, p_city text, p_device text, p_os text, p_browser text, p_utm_source text,
  p_referrer text default null, p_visitor_hash text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.analytics (link_id, country, city, device, os, browser, utm_source, referrer, visitor_hash)
  values (p_link_id, p_country, p_city, p_device, p_os, p_browser, p_utm_source, p_referrer, p_visitor_hash);
end;
$$;

drop view if exists public.link_analytics_daily;
drop view if exists public.link_analytics_by_country;
drop view if exists public.link_analytics_by_device;

-- Plain `language sql` functions default to SECURITY INVOKER (only DEFINER
-- needs to be declared), so these still respect analytics_select_own_or_superadmin
-- exactly like the security_invoker=true views they replace.
create function public.get_link_analytics_daily(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (day date, clicks bigint)
language sql stable set search_path = public as $$
  select date_trunc('day', scanned_at)::date as day, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 1;
$$;
revoke all on function public.get_link_analytics_daily from public;
grant execute on function public.get_link_analytics_daily to authenticated;

create function public.get_link_analytics_by_country(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (country text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(country, 'Unknown') as country, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_country from public;
grant execute on function public.get_link_analytics_by_country to authenticated;

create function public.get_link_analytics_by_device(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (device text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(device, 'Unknown') as device, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_device from public;
grant execute on function public.get_link_analytics_by_device to authenticated;

create function public.get_link_analytics_by_referrer(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns table (referrer text, clicks bigint)
language sql stable set search_path = public as $$
  select coalesce(referrer, 'Directo') as referrer, count(*) as clicks
  from public.analytics
  where link_id = p_link_id
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to)
  group by 1 order by 2 desc;
$$;
revoke all on function public.get_link_analytics_by_referrer from public;
grant execute on function public.get_link_analytics_by_referrer to authenticated;

-- visitor_hash = sha256(link_id|cf-connecting-ip|day), computed in [code].astro
-- and never stored raw — counting distinct hashes approximates unique daily
-- visitors without a cookie or an IP column.
create function public.get_link_analytics_unique_visitors(p_link_id uuid, p_from timestamptz default null, p_to timestamptz default null)
returns bigint
language sql stable set search_path = public as $$
  select count(distinct visitor_hash) from public.analytics
  where link_id = p_link_id
    and visitor_hash is not null
    and (p_from is null or scanned_at >= p_from)
    and (p_to is null or scanned_at <= p_to);
$$;
revoke all on function public.get_link_analytics_unique_visitors from public;
grant execute on function public.get_link_analytics_unique_visitors to authenticated;
