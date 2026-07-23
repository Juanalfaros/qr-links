-- A soft-deleted (archived) link must stop redirecting immediately, not just
-- disappear from the owner's dashboard.
create or replace function public.get_link_for_redirect(p_short_code text)
returns table (id uuid, destination_url text)
language sql security definer set search_path = public stable as $$
  select id, destination_url from public.links where short_code = p_short_code and deleted_at is null;
$$;
