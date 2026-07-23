-- Rewrites get_link_for_redirect to atomically validate-and-increment in a
-- single UPDATE ... RETURNING statement (the row lock it takes serializes
-- concurrent hits, so two simultaneous requests can't both slip past
-- max_clicks). Falls back to a read-only lookup ONLY to explain why nothing
-- matched (not_found / expired / limit_reached / password_required) — that
-- fallback never touches click_count, so it carries no race risk.
--
-- The return shape gained a column (show_interstitial), and Postgres refuses
-- to CREATE OR REPLACE a function when its RETURNS TABLE shape changes — it
-- must be dropped first, which also drops its grants, so they're reissued below.
drop function if exists public.get_link_for_redirect(text);

create function public.get_link_for_redirect(p_short_code text)
returns table (id uuid, destination_url text, status text, show_interstitial boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_result record;
  v_existing record;
begin
  update public.links l
  set click_count = l.click_count + 1
  where l.short_code = p_short_code
    and l.deleted_at is null
    and (l.expires_at is null or l.expires_at > now())
    and (l.max_clicks is null or l.click_count < l.max_clicks)
    and l.password_hash is null
  returning l.id, l.destination_url, l.show_interstitial into v_result;

  if found then
    return query select v_result.id, v_result.destination_url, 'ok'::text, v_result.show_interstitial;
    return;
  end if;

  select l.id, l.expires_at, l.max_clicks, l.click_count, l.password_hash
    into v_existing
    from public.links l
    where l.short_code = p_short_code and l.deleted_at is null;

  if not found then
    return query select null::uuid, null::text, 'not_found'::text, null::boolean;
  elsif v_existing.expires_at is not null and v_existing.expires_at <= now() then
    return query select null::uuid, null::text, 'expired'::text, null::boolean;
  elsif v_existing.max_clicks is not null and v_existing.click_count >= v_existing.max_clicks then
    return query select null::uuid, null::text, 'limit_reached'::text, null::boolean;
  elsif v_existing.password_hash is not null then
    return query select v_existing.id, null::text, 'password_required'::text, null::boolean;
  else
    return query select null::uuid, null::text, 'not_found'::text, null::boolean;
  end if;
end;
$$;

revoke all on function public.get_link_for_redirect from public;
grant execute on function public.get_link_for_redirect to anon, authenticated;

-- Same atomic pattern as above, but only matches when the supplied password's
-- bcrypt hash (via pgcrypto's crypt()) matches the stored one. Used by the
-- redirect route's password-entry form; never exposes password_hash itself.
--
-- search_path includes `extensions` because Supabase installs pgcrypto there
-- by default, not into `public` — omitting it makes crypt()/gen_salt()
-- unresolvable ("function gen_salt(unknown) does not exist").
create or replace function public.verify_link_password(p_short_code text, p_password text)
returns table (id uuid, destination_url text, status text, show_interstitial boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_result record;
begin
  update public.links l
  set click_count = l.click_count + 1
  where l.short_code = p_short_code
    and l.deleted_at is null
    and (l.expires_at is null or l.expires_at > now())
    and (l.max_clicks is null or l.click_count < l.max_clicks)
    and l.password_hash is not null
    and l.password_hash = crypt(p_password, l.password_hash)
  returning l.id, l.destination_url, l.show_interstitial into v_result;

  if found then
    return query select v_result.id, v_result.destination_url, 'ok'::text, v_result.show_interstitial;
  else
    return query select null::uuid, null::text, 'invalid_password'::text, null::boolean;
  end if;
end;
$$;

revoke all on function public.verify_link_password from public;
grant execute on function public.verify_link_password to anon, authenticated;

-- Deliberately SECURITY INVOKER (the default): runs as the calling user, so
-- the existing links_update_own_or_superadmin RLS policy already scopes this
-- UPDATE to links the caller owns — no separate grant/ownership check needed
-- here. Passing NULL/empty clears the password.
create or replace function public.set_link_password(p_link_id uuid, p_password text)
returns void language plpgsql set search_path = public, extensions as $$
begin
  update public.links
  set password_hash = case when p_password is null or p_password = '' then null else crypt(p_password, gen_salt('bf')) end
  where id = p_link_id;
end;
$$;

revoke all on function public.set_link_password from public;
grant execute on function public.set_link_password to authenticated;
