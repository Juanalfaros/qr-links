-- Lets each deployment brand its own API tokens (e.g. "acme_" instead of the
-- generic default) — purely cosmetic, never parsed/validated anywhere
-- (src/lib/api-tokens.ts hashes the whole token string), so changing it
-- doesn't affect already-issued tokens.
alter table public.branding_settings add column token_prefix text not null default 'api_';
