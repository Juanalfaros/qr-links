create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.link_tags (
  link_id uuid not null references public.links(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (link_id, tag_id)
);

alter table public.tags enable row level security;
alter table public.link_tags enable row level security;

create policy "tags_all_own_or_superadmin" on public.tags for all
  using (user_id = auth.uid() or public.is_superadmin())
  with check (user_id = auth.uid() or public.is_superadmin());

-- Scoped via the parent link's ownership, same join pattern as the
-- analytics_select_own_or_superadmin policy in 0002_rls_policies.sql.
create policy "link_tags_all_own_or_superadmin" on public.link_tags for all
  using (
    public.is_superadmin()
    or exists (select 1 from public.links where links.id = link_tags.link_id and links.user_id = auth.uid())
  )
  with check (
    public.is_superadmin()
    or exists (select 1 from public.links where links.id = link_tags.link_id and links.user_id = auth.uid())
  );
