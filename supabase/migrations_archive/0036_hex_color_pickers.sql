-- Replaces the raw 0-359 brand_hue slider (0035_brand_hue.sql) with real hex
-- color pickers — a bare numeric hue was confusing UX with no visual
-- feedback. Superadmins now pick actual colors (native <input type="color">
-- in BrandingManager/SetupForm); only each color's *hue* is ever extracted
-- and used (see src/lib/theme.ts) — lightness/chroma always come from the
-- hand-tuned base palette, so contrast stays guaranteed regardless of what
-- hex was picked. All nullable: null means "use the hardcoded default",
-- same zero-diff guarantee as before. No new RLS policies needed — the
-- existing whole-row branding_settings_select_public/_update_superadmin
-- policies (0028_branding_settings.sql) already cover these columns.
alter table public.branding_settings
  drop column brand_hue,
  add column primary_color text check (primary_color is null or primary_color ~* '^#[0-9a-f]{6}$'),
  add column accent_color text check (accent_color is null or accent_color ~* '^#[0-9a-f]{6}$'),
  add column accent_yellow_color text check (accent_yellow_color is null or accent_yellow_color ~* '^#[0-9a-f]{6}$'),
  add column accent_pink_color text check (accent_pink_color is null or accent_pink_color ~* '^#[0-9a-f]{6}$'),
  add column accent_green_color text check (accent_green_color is null or accent_green_color ~* '^#[0-9a-f]{6}$'),
  add column accent_blue_color text check (accent_blue_color is null or accent_blue_color ~* '^#[0-9a-f]{6}$'),
  add column accent_lilac_color text check (accent_lilac_color is null or accent_lilac_color ~* '^#[0-9a-f]{6}$');
