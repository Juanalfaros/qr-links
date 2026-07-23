-- Fase 4: departments are the unit "manager" scoping is built on (migrations
-- 0013/0014) — created first so later migrations can reference department_id
-- without a forward dependency.
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column department_id uuid references public.departments(id) on delete set null;

alter table public.departments enable row level security;

-- Every authenticated user needs to read the department list to populate a
-- "department" select somewhere (profile view, admin assignment, etc.);
-- only a superadmin may create/edit/remove departments.
create policy "departments_select_authenticated" on public.departments for select
  to authenticated using (true);
create policy "departments_insert_superadmin" on public.departments for insert
  with check (public.is_superadmin());
create policy "departments_update_superadmin" on public.departments for update
  using (public.is_superadmin()) with check (public.is_superadmin());
create policy "departments_delete_superadmin" on public.departments for delete
  using (public.is_superadmin());
