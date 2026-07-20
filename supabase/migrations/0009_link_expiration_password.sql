alter table public.links
  add column expires_at timestamptz,
  add column max_clicks int,
  add column click_count int not null default 0,
  add column password_hash text,
  add column show_interstitial boolean not null default false;
