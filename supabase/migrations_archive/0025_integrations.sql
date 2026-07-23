-- Fase 10: integrations — public API tokens, scan webhooks, and optional
-- GA/GTM injection on the interstitial page. The Bitly CSV importer needs no
-- schema change (it just calls the existing link-creation path per row).

alter table public.links add column webhook_url text;
alter table public.links add column ga_tracking_id text;

create table public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_tokens_user_id_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

create policy "api_tokens_select_own" on public.api_tokens for select
  using (user_id = auth.uid());

create policy "api_tokens_insert_own" on public.api_tokens for insert
  with check (user_id = auth.uid());

-- Only revoking (setting revoked_at) ever happens from the client — name and
-- token_hash are otherwise immutable once created.
create policy "api_tokens_revoke_own" on public.api_tokens for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The redirect RPCs gain two columns (webhook_url, ga_tracking_id) so the hot
-- redirect path can fire a scan webhook and, on the interstitial, inject a GA
-- tag without a second round trip. Postgres refuses to CREATE OR REPLACE
-- across a RETURNS TABLE shape change, so both are dropped and recreated,
-- same as migration 0010.
drop function if exists public.get_link_for_redirect(text);

create function public.get_link_for_redirect(p_short_code text)
returns table (
  id uuid,
  destination_url text,
  status text,
  show_interstitial boolean,
  webhook_url text,
  ga_tracking_id text
)
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
  returning l.id, l.destination_url, l.show_interstitial, l.webhook_url, l.ga_tracking_id into v_result;

  if found then
    return query select
      v_result.id, v_result.destination_url, 'ok'::text, v_result.show_interstitial,
      v_result.webhook_url, v_result.ga_tracking_id;
    return;
  end if;

  select l.id, l.expires_at, l.max_clicks, l.click_count, l.password_hash
    into v_existing
    from public.links l
    where l.short_code = p_short_code and l.deleted_at is null;

  if not found then
    return query select null::uuid, null::text, 'not_found'::text, null::boolean, null::text, null::text;
  elsif v_existing.expires_at is not null and v_existing.expires_at <= now() then
    return query select null::uuid, null::text, 'expired'::text, null::boolean, null::text, null::text;
  elsif v_existing.max_clicks is not null and v_existing.click_count >= v_existing.max_clicks then
    return query select null::uuid, null::text, 'limit_reached'::text, null::boolean, null::text, null::text;
  elsif v_existing.password_hash is not null then
    return query select v_existing.id, null::text, 'password_required'::text, null::boolean, null::text, null::text;
  else
    return query select null::uuid, null::text, 'not_found'::text, null::boolean, null::text, null::text;
  end if;
end;
$$;

revoke all on function public.get_link_for_redirect from public;
grant execute on function public.get_link_for_redirect to anon, authenticated;

drop function if exists public.verify_link_password(text, text);

create function public.verify_link_password(p_short_code text, p_password text)
returns table (
  id uuid,
  destination_url text,
  status text,
  show_interstitial boolean,
  webhook_url text,
  ga_tracking_id text
)
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
  returning l.id, l.destination_url, l.show_interstitial, l.webhook_url, l.ga_tracking_id into v_result;

  if found then
    return query select
      v_result.id, v_result.destination_url, 'ok'::text, v_result.show_interstitial,
      v_result.webhook_url, v_result.ga_tracking_id;
  else
    return query select null::uuid, null::text, 'invalid_password'::text, null::boolean, null::text, null::text;
  end if;
end;
$$;

revoke all on function public.verify_link_password from public;
grant execute on function public.verify_link_password to anon, authenticated;
