-- Fase: personalización de apariencia. Lets a superadmin pick a brand hue
-- (0-359) plus a few discrete appearance knobs, all nullable so an existing
-- (or freshly seeded) instance renders byte-for-byte identical to today
-- until someone actually opens the appearance panel — see src/lib/theme.ts
-- for how these are turned into CSS. No new RLS policies needed: the
-- existing whole-row branding_settings_select_public/_update_superadmin
-- policies (0028_branding_settings.sql) already cover these columns.
alter table public.branding_settings
  add column brand_hue smallint check (brand_hue is null or brand_hue between 0 and 359),
  add column radius_rem numeric(3, 2) check (radius_rem is null or radius_rem between 0 and 2),
  add column sidebar_style text check (sidebar_style is null or sidebar_style in ('dark', 'brand')),
  add column qr_dark_color text check (qr_dark_color is null or qr_dark_color ~* '^#[0-9a-f]{6}$');
