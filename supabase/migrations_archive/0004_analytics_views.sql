-- security_invoker = true is required for these views to respect RLS on the
-- underlying `analytics` table. Postgres views default to running with the
-- creator's privileges (not the querying user's) unless this is set
-- explicitly — without it, these views silently bypass
-- analytics_select_own_or_superadmin and expose all links' data to anyone.
create or replace view public.link_analytics_daily
with (security_invoker = true) as
select link_id, date_trunc('day', scanned_at)::date as day, count(*) as clicks
from public.analytics group by link_id, day;

create or replace view public.link_analytics_by_country
with (security_invoker = true) as
select link_id, coalesce(country, 'Unknown') as country, count(*) as clicks
from public.analytics group by link_id, country;

create or replace view public.link_analytics_by_device
with (security_invoker = true) as
select link_id, coalesce(device, 'Unknown') as device, count(*) as clicks
from public.analytics group by link_id, device;
