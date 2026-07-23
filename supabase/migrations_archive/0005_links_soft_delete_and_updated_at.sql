alter table public.links
  add column deleted_at timestamptz,
  add column updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();
