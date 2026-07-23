-- Fase 7: configurable alert rules, checked hourly by the Cron Trigger
-- scheduled handler (src/worker-entry.ts) using the service-role key — a
-- background job has no single "acting user" whose RLS should scope it, it
-- legitimately needs to see every user's rules to check them all.
create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  -- null = company-wide (superadmin-only, see the insert policy below)
  link_id uuid references public.links(id) on delete cascade,
  threshold_count int not null,
  window_hours int not null default 24,
  notify_email text not null,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index alert_rules_link_id_idx on public.alert_rules (link_id);

alter table public.alert_rules enable row level security;

create policy "alert_rules_select_own_or_superadmin" on public.alert_rules for select
  using (created_by = auth.uid() or public.is_superadmin());

create policy "alert_rules_insert_own_or_superadmin" on public.alert_rules for insert
  with check (
    created_by = auth.uid()
    and (link_id is not null or public.is_superadmin())
    and (
      link_id is null
      or exists (select 1 from public.links where links.id = link_id and (links.user_id = auth.uid() or public.is_superadmin()))
    )
  );

create policy "alert_rules_delete_own_or_superadmin" on public.alert_rules for delete
  using (created_by = auth.uid() or public.is_superadmin());
