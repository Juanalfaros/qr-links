create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'superadmin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  short_code text not null unique,
  destination_url text not null,
  title text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index links_user_id_idx on public.links (user_id);
create index links_short_code_idx on public.links (short_code);

create table public.analytics (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  country text,
  city text,
  device text,
  os text,
  browser text,
  utm_source text,
  scanned_at timestamptz not null default now()
);
create index analytics_link_id_idx on public.analytics (link_id);
create index analytics_scanned_at_idx on public.analytics (scanned_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger-only function: Postgres grants EXECUTE to PUBLIC by default on
-- function creation, which would otherwise make this reachable directly via
-- /rest/v1/rpc/handle_new_user. Triggers don't need EXECUTE on the invoking
-- role to fire, so revoking it only closes that direct API path.
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
