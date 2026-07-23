-- check_and_increment_link_quota accepted an arbitrary p_user_id with no
-- binding to the caller, so a session-authenticated user could call the RPC
-- directly via PostgREST (bypassing the app's own routes, which always pass
-- their own id) and tamper with another user's quota bucket. Not exploitable
-- through any exposed route today, but free to close.
--
-- Signature is unchanged deliberately: src/pages/api/public/links.ts (the
-- Bearer-token public API) calls this via the service-role client, which has
-- no session JWT — auth.uid() is null there, same null-actor situation as
-- guard_profile_self_update's system-write bypass (migration 0020). So a
-- session-authenticated caller (auth.uid() is not null) always uses their own
-- id, ignoring p_user_id; a null-actor caller falls back to the trusted
-- p_user_id the app already validated at that layer.
create or replace function public.check_and_increment_link_quota(p_user_id uuid, p_daily_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_user_id uuid := coalesce(auth.uid(), p_user_id);
begin
  insert into public.link_creation_quota (user_id, window_start, count)
  values (v_user_id, current_date, 1)
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
