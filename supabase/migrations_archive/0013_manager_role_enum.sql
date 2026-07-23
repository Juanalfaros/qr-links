-- Postgres forbids using a new enum value in the same transaction/migration
-- that adds it, so this file does nothing else — the helper and policies
-- that reference 'manager' live in migration 0014.
alter type public.user_role add value 'manager';
