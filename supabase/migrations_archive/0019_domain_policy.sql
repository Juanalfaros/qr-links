-- Fase 5: destination URL validation. Google Safe Browsing was considered
-- and rejected — beyond the unconfirmed GCP billing requirement, its terms
-- restrict it to non-commercial use, which qr-link (a corporate tool) isn't.
-- These two hand-maintained lists replace it at zero cost/dependency.
create table public.allowed_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  created_at timestamptz not null default now()
);

create table public.blocked_url_patterns (
  id uuid primary key default gen_random_uuid(),
  pattern text not null unique,
  created_at timestamptz not null default now()
);

alter table public.allowed_domains enable row level security;
alter table public.blocked_url_patterns enable row level security;

-- Every authenticated user needs read access: create.ts/[id].ts validate the
-- destination URL against both lists using the caller's own session client.
create policy "allowed_domains_select_authenticated" on public.allowed_domains for select
  to authenticated using (true);
create policy "allowed_domains_insert_superadmin" on public.allowed_domains for insert
  with check (public.is_superadmin());
create policy "allowed_domains_delete_superadmin" on public.allowed_domains for delete
  using (public.is_superadmin());

create policy "blocked_url_patterns_select_authenticated" on public.blocked_url_patterns for select
  to authenticated using (true);
create policy "blocked_url_patterns_insert_superadmin" on public.blocked_url_patterns for insert
  with check (public.is_superadmin());
create policy "blocked_url_patterns_delete_superadmin" on public.blocked_url_patterns for delete
  using (public.is_superadmin());
