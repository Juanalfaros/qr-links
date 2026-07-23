-- Lets any user update their own row (full_name/avatar_url) — the existing
-- profiles_update_superadmin policy only ever let a superadmin touch profiles.
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- RLS can't restrict which *columns* an UPDATE touches, so
-- profiles_update_self alone would let a self-service caller smuggle a
-- role/email/department/suspension change through the same statement. This
-- trigger is the column-level backstop: the app-level PATCH /api/profile
-- route only ever sets full_name/avatar_url, so this never fires in normal
-- operation — it only guards against a future bug or a crafted request.
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
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

create trigger profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.guard_profile_self_update();
