-- Superadmin-only "danger zone" action: wipes the *content* of every
-- business-data table while explicitly preserving user accounts
-- (profiles/auth.users, never named below) and the branding_settings
-- singleton. The table list is hardcoded and reviewed here, not derived from
-- information_schema — adding a new business table later must be a
-- deliberate, reviewable edit to this list, not something that happens
-- automatically.
create or replace function public.wipe_all_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
    raise exception 'only a superadmin can wipe data';
  end if;

  truncate table
    public.analytics,
    public.link_tags,
    public.alert_rules,
    public.notifications,
    public.api_tokens,
    public.link_creation_quota,
    public.links,
    public.tags,
    public.allowed_domains,
    public.blocked_url_patterns,
    public.audit_log,
    public.departments
  restart identity cascade;
end;
$$;

revoke execute on function public.wipe_all_data() from public;
grant execute on function public.wipe_all_data() to authenticated;
