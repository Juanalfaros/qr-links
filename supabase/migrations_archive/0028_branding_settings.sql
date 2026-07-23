-- Fase: self-service onboarding. Replaces the manual "run SQL in the
-- dashboard to promote the first superadmin" step with an in-app /setup
-- flow, and moves company name/logo/favicon out of hardcoded source
-- (src/lib/config.ts) into the database so a cloned repo stays generic and
-- each deployment configures itself.

-- Singleton table: `id int primary key default 1 check (id = 1)` forces
-- exactly one row to ever exist (any second insert collides on the PK).
-- No insert/delete policies below — the only row is the one seeded here.
create table public.branding_settings (
  id int primary key default 1 check (id = 1),
  name text not null,
  logo_url text,
  favicon_url text,
  updated_at timestamptz not null default now()
);

insert into public.branding_settings (id, name, logo_url, favicon_url)
values (1, 'My Company', '/logo.svg', '/favicon.svg');

alter table public.branding_settings enable row level security;

-- Not sensitive data — needed pre-auth on /login, the [code].astro
-- interstitial, and the public favicon/title on every page.
create policy "branding_settings_select_public" on public.branding_settings for select
  using (true);

create policy "branding_settings_update_superadmin" on public.branding_settings for update
  using (public.is_superadmin()) with check (public.is_superadmin());

-- Whether the first-run /setup flow still needs to run, derived from
-- profiles rather than a stored flag: if the last superadmin is ever
-- deleted/demoted, /setup reopens automatically instead of leaving the
-- instance permanently unmanageable — intentional self-healing, not a bug.
-- Same SECURITY DEFINER shape as is_superadmin() (0002_rls_policies.sql),
-- but grantable to anon too since it must be callable before any session
-- exists.
create or replace function public.onboarding_needed()
returns boolean language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where role = 'superadmin');
$$;

revoke execute on function public.onboarding_needed() from public;
grant execute on function public.onboarding_needed() to anon, authenticated;
