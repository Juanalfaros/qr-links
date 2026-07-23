-- Fase 5: per-user daily cap on link creation, enforced atomically (same
-- single-statement UPDATE...RETURNING pattern as the max_clicks check in
-- migration 0010) so concurrent requests can't both slip past the limit.
create table public.link_creation_quota (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start date not null default current_date,
  count int not null default 0
);

-- No RLS policies at all: this table is never read/written directly via the
-- API, only through the SECURITY DEFINER function below, which bypasses RLS.
alter table public.link_creation_quota enable row level security;

create or replace function public.check_and_increment_link_quota(p_user_id uuid, p_daily_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  insert into public.link_creation_quota (user_id, window_start, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id) do update
    set count = case
        when link_creation_quota.window_start = current_date then link_creation_quota.count + 1
        else 1
      end,
      window_start = current_date
  returning count into v_count;

  return v_count <= p_daily_limit;
end;
$$;

revoke all on function public.check_and_increment_link_quota from public;
grant execute on function public.check_and_increment_link_quota to authenticated;
