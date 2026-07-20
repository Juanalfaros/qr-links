-- Bug found while deleting departments: profiles.department_id has
-- `on delete set null`, so deleting a department with users assigned to it
-- fires an UPDATE on those profiles as a cascade side effect. That UPDATE
-- has no JWT/session actor (auth.uid() is null for this system-level write —
-- same for any service-role write done outside a user's PostgREST request),
-- so is_superadmin() returned false and the guard trigger rejected its own
-- database's cascade with "only a superadmin can change department".
--
-- A null actor means there's no meaningful user identity to check in the
-- first place — the trust boundary for that already sits one level up
-- (RLS/triggers don't apply extra scrutiny to service-role writes elsewhere
-- in this schema either), so this adds `auth.uid() is null` alongside the
-- existing is_superadmin() bypass.
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    if new.role is distinct from old.role then
      raise exception 'only a superadmin can change role';
    end if;
    if new.email is distinct from old.email then
      raise exception 'only a superadmin can change email';
    end if;
    if new.department_id is distinct from old.department_id then
      raise exception 'only a superadmin can change department';
    end if;
    if new.suspended_at is distinct from old.suspended_at then
      raise exception 'only a superadmin can change suspension status';
    end if;
  end if;
  return new;
end;
$$;
