-- Fase 9: in-app notifications. Two real event sources feed this — no
-- synthetic/demo events:
--   1. A role/suspension change to the AFFECTED user's own profile (reuses
--      the exact detection already in audit_profiles_changes(), just adds an
--      insert targeted at the affected user instead of the audit trail).
--   2. An alert_rules threshold firing (inserted directly by the cron
--      handler's service-role client — see src/lib/cron/alerts.ts).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  link_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications for select
  using (user_id = auth.uid());

-- Only read_at is ever meant to change from the client (marking as read) —
-- there's no column-level RLS, but the app's own PATCH route only ever sets
-- that one field, matching the same convention as profiles self-service.
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No insert policy for any role: rows are written exclusively by the
-- SECURITY DEFINER trigger below and by the cron handler's service-role
-- client (which bypasses RLS entirely).

create or replace function public.audit_profiles_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, target_table, target_id, metadata)
    values (auth.uid(), 'role_changed', 'profiles', new.id, jsonb_build_object('from', old.role, 'to', new.role));

    insert into public.notifications (user_id, title, body)
    values (new.id, 'Tu rol cambió', format('Tu nuevo rol es "%s".', new.role));
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

    insert into public.notifications (user_id, title, body)
    values (
      new.id,
      case when new.suspended_at is null then 'Cuenta reactivada' else 'Cuenta suspendida' end,
      case
        when new.suspended_at is null then 'Tu cuenta fue reactivada y ya puedes volver a acceder.'
        else 'Tu cuenta fue suspendida por un administrador.'
      end
    );
  end if;
  return new;
end;
$$;
