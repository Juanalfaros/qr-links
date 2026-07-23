-- Addresses real findings from Supabase's database linter (function_search_
-- path_mutable, anon/authenticated_security_definer_function_executable).
-- Findings NOT addressed here were checked against each function's actual
-- grants and are intentional: get_link_for_redirect/verify_link_password/
-- record_scan must stay anon-callable (the unauthenticated redirect route
-- uses them), and check_and_increment_link_quota/is_manager_of/is_superadmin
-- already have `revoke all from public; grant ... to authenticated` — the
-- linter's "anon" flag on those doesn't match their real grants.

-- 1. Missing search_path hardening (every other function already has this).
alter function public.set_updated_at() set search_path = public;

-- 2. Trigger-only functions: never invoked directly by the app, only by
-- Postgres's own trigger mechanism, which doesn't check the firing role's
-- EXECUTE grant on the trigger function. They kept Postgres's default
-- grant-to-PUBLIC from CREATE FUNCTION, making them needlessly callable via
-- /rest/v1/rpc/<name> (harmlessly — they'd fail with "trigger functions can
-- only be called as triggers" — but there's no reason to leave them open).
revoke all on function public.audit_links_soft_delete() from public;
revoke all on function public.audit_profiles_changes() from public;
revoke all on function public.guard_profile_self_update() from public;

-- 3. record_scan accumulated three overloads across migrations 0003, 0011,
-- and 0023: each one added trailing default parameters via CREATE OR
-- REPLACE, which Postgres treats as a distinct overload rather than an
-- in-place replacement (unlike get_link_for_redirect/verify_link_password,
-- which were correctly DROP-then-CREATEd each time in migration 0010). The
-- two narrower, superseded overloads are still live and callable; the app
-- only ever calls the current 10-parameter one (migration 0023), so the
-- older two are dead surface area.
drop function if exists public.record_scan(uuid, text, text, text, text, text, text);
drop function if exists public.record_scan(uuid, text, text, text, text, text, text, text, text);
