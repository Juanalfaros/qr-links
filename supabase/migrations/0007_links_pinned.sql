alter table public.links
  add column is_pinned boolean not null default false;
