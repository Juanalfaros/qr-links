-- Safety net for the last-superadmin check already enforced at the
-- application layer (src/pages/api/admin/update-role.ts): if that route
-- guard were ever bypassed or a future code path updated profiles.role
-- directly, this blocks demoting the sole remaining superadmin at the DB
-- level too. Unlike the rest of guard_profile_self_update(), this check is
-- unconditional — it applies even to a superadmin actor or a null actor
-- (service-role/system writes) per the 0020 migration's precedent, because
-- there's no actor for whom leaving the instance with zero superadmins is
-- ever the intended outcome (onboarding_needed() reopens /setup to anonymous
-- users the moment that happens).
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'superadmin' and new.role is distinct from 'superadmin' then
    if (select count(*) from public.profiles where role = 'superadmin') <= 1 then
      raise exception 'cannot demote the last remaining superadmin';
    end if;
  end if;

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
