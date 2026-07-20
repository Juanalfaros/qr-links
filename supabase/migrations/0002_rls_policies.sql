-- Gotcha: a policy on `profiles` that queries `profiles` to check the caller's role
-- recurses through RLS again. Fixed with a SECURITY DEFINER helper (bypasses RLS
-- internally, safe because it only ever returns a boolean).
create or replace function public.is_superadmin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'superadmin'
  );
$$;

-- Postgres grants EXECUTE to PUBLIC by default on function creation. Only
-- `authenticated` sessions ever evaluate a policy that calls this (anon never
-- queries profiles/links/analytics directly — see 0003_redirect_rpcs.sql).
revoke execute on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.analytics enable row level security;

-- profiles: no self-service policy — role changes are superadmin-only in this design.
create policy "profiles_select_own_or_superadmin" on public.profiles for select
  using (id = auth.uid() or public.is_superadmin());

create policy "profiles_update_superadmin" on public.profiles for update
  using (public.is_superadmin()) with check (public.is_superadmin());

create policy "profiles_insert_superadmin" on public.profiles for insert
  with check (public.is_superadmin()); -- normal signup goes through the SECURITY DEFINER trigger, bypassing RLS

-- links
create policy "links_select_own_or_superadmin" on public.links for select
  using (user_id = auth.uid() or public.is_superadmin());
create policy "links_insert_own_or_superadmin" on public.links for insert
  with check (user_id = auth.uid() or public.is_superadmin());
create policy "links_update_own_or_superadmin" on public.links for update
  using (user_id = auth.uid() or public.is_superadmin())
  with check (user_id = auth.uid() or public.is_superadmin());
create policy "links_delete_own_or_superadmin" on public.links for delete
  using (user_id = auth.uid() or public.is_superadmin());

-- analytics: read-only via RLS; inserts happen exclusively through the
-- SECURITY DEFINER RPC record_scan (see 0003_redirect_rpcs.sql).
create policy "analytics_select_own_or_superadmin" on public.analytics for select
  using (
    public.is_superadmin()
    or exists (select 1 from public.links where links.id = analytics.link_id and links.user_id = auth.uid())
  );
