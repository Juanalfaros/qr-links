create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log_select_superadmin" on public.audit_log for select
  using (public.is_superadmin());

-- Deliberately no insert/update/delete policy for any role: every row is
-- written exclusively by the SECURITY DEFINER trigger functions below, which
-- bypass RLS entirely — the audit trail can't be edited or added to via the
-- API, only observed by a superadmin.

create or replace function public.audit_profiles_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (auth.uid(), 'role_changed', 'profiles', new.id, jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.suspended_at is distinct from old.suspended_at then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (
      auth.uid(),
      case when new.suspended_at is null then 'user_unsuspended' else 'user_suspended' end,
      'profiles',
      new.id,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit_changes
  after update on public.profiles
  for each row execute function public.audit_profiles_changes();

create or replace function public.audit_links_soft_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (auth.uid(), 'link_deleted', 'links', new.id, jsonb_build_object('short_code', new.short_code));
  end if;
  return new;
end;
$$;

create trigger links_audit_soft_delete
  after update on public.links
  for each row execute function public.audit_links_soft_delete();
