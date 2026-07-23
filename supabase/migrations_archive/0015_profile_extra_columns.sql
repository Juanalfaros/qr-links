alter table public.profiles
  add column full_name text,
  add column avatar_url text,
  add column suspended_at timestamptz;
