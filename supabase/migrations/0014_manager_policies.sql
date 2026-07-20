-- Mirrors is_superadmin(): SECURITY DEFINER so a policy that calls this while
-- evaluating a profiles/links row doesn't recurse back through RLS on profiles.
create or replace function public.is_manager_of(p_department_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and department_id = p_department_id
  );
$$;
revoke all on function public.is_manager_of from public;
grant execute on function public.is_manager_of to authenticated;

-- Managers get read visibility into their own department's people and links
-- (a "team view"), layered on top of the existing own-row/superadmin
-- policies — deliberately SELECT-only for now, no write access is granted.
create policy "profiles_select_manager" on public.profiles for select
  using (department_id is not null and public.is_manager_of(department_id));

create policy "links_select_manager" on public.links for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = links.user_id
        and profiles.department_id is not null
        and public.is_manager_of(profiles.department_id)
    )
  );
