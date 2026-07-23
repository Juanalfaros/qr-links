-- Storage for uploaded branding assets (logo/favicon) — the first use of
-- Supabase Storage in this project. `storage.buckets` is a plain table
-- Supabase's Storage API reads from, so the bucket itself is reproducible
-- via migration like everything else in this schema, rather than a manual
-- one-off dashboard step.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true);

-- The bucket is public, so reads already work with no policy at all via the
-- public URL endpoint — this select policy is added anyway for robustness/
-- defense-in-depth, not because it's strictly required.
create policy "branding_bucket_select_public" on storage.objects for select
  using (bucket_id = 'branding');

-- Onboarding's own upload (before any superadmin/session exists) goes
-- through the service-role admin client, which bypasses storage RLS
-- entirely — same null-actor pattern as profiles writes during /setup. These
-- policies only gate the *ongoing* superadmin-editable Branding settings
-- tab, which uses the RLS-scoped session client.
create policy "branding_bucket_insert_superadmin" on storage.objects for insert
  to authenticated with check (bucket_id = 'branding' and public.is_superadmin());

create policy "branding_bucket_update_superadmin" on storage.objects for update
  to authenticated using (bucket_id = 'branding' and public.is_superadmin())
  with check (bucket_id = 'branding' and public.is_superadmin());

create policy "branding_bucket_delete_superadmin" on storage.objects for delete
  to authenticated using (bucket_id = 'branding' and public.is_superadmin());
