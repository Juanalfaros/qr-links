-- Two narrow SECURITY DEFINER RPCs, callable with the anon key, used exclusively by
-- the anonymous redirect route (src/pages/[code].astro). Least privilege: the
-- highest-traffic, least-trusted-input code path in the app never loads the
-- service-role key, which can read/write every table.
create or replace function public.get_link_for_redirect(p_short_code text)
returns table (id uuid, destination_url text)
language sql security definer set search_path = public stable as $$
  select id, destination_url from public.links where short_code = p_short_code;
$$;
revoke all on function public.get_link_for_redirect from public;
grant execute on function public.get_link_for_redirect to anon, authenticated;

create or replace function public.record_scan(
  p_link_id uuid, p_country text, p_city text, p_device text, p_os text, p_browser text, p_utm_source text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.analytics (link_id, country, city, device, os, browser, utm_source)
  values (p_link_id, p_country, p_city, p_device, p_os, p_browser, p_utm_source);
end;
$$;
revoke all on function public.record_scan from public;
grant execute on function public.record_scan to anon, authenticated;

-- The service-role key stays reserved exclusively for supabase.auth.admin.* calls
-- (invite/delete user) in src/pages/api/admin/*.ts — the only operation that truly
-- requires the Admin API and cannot be expressed through RLS.
