import type { APIRoute } from 'astro';
import { updateBrandingSchema } from '@/lib/schemas/admin';
import { firstErrorMessage } from '@/lib/schemas/validate';
import { uploadBrandingAsset, BrandingAssetError } from '@/lib/storage';
import { parseNullableNumberField, parseNullableStringField } from '@/lib/schemas/form-fields';

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (locals.user?.role !== 'superadmin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const formData = await request.formData();
  const parsed = updateBrandingSchema.safeParse({
    name: formData.get('name'),
    tokenPrefix: formData.get('tokenPrefix'),
    primaryColor: parseNullableStringField(formData.get('primaryColor')),
    accentColor: parseNullableStringField(formData.get('accentColor')),
    accentYellowColor: parseNullableStringField(formData.get('accentYellowColor')),
    accentPinkColor: parseNullableStringField(formData.get('accentPinkColor')),
    accentGreenColor: parseNullableStringField(formData.get('accentGreenColor')),
    accentBlueColor: parseNullableStringField(formData.get('accentBlueColor')),
    accentLilacColor: parseNullableStringField(formData.get('accentLilacColor')),
    radiusRem: parseNullableNumberField(formData.get('radiusRem')),
    sidebarStyle: parseNullableStringField(formData.get('sidebarStyle')),
    qrDarkColor: parseNullableStringField(formData.get('qrDarkColor')),
  });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const logoFile = formData.get('logo');
  const faviconFile = formData.get('favicon');
  const pwaIcon192File = formData.get('pwaIcon192');
  const pwaIcon512File = formData.get('pwaIcon512');
  const pwaIcon512MaskableFile = formData.get('pwaIcon512Maskable');

  // RLS-scoped client, not the admin/service-role one — this route always
  // runs with a real superadmin session, same convention as
  // update-role.ts: rely on branding_settings_update_superadmin (RLS) and
  // branding_bucket_*_superadmin (storage RLS) as the actual enforcement,
  // the role check above is defense-in-depth.
  try {
    const [logoUrl, faviconUrl, pwaIcon192Url, pwaIcon512Url, pwaIcon512MaskableUrl] = await Promise.all([
      logoFile instanceof File ? uploadBrandingAsset(locals.supabase, 'logo', logoFile) : Promise.resolve(null),
      faviconFile instanceof File
        ? uploadBrandingAsset(locals.supabase, 'favicon', faviconFile)
        : Promise.resolve(null),
      pwaIcon192File instanceof File
        ? uploadBrandingAsset(locals.supabase, 'pwa-icon-192', pwaIcon192File)
        : Promise.resolve(null),
      pwaIcon512File instanceof File
        ? uploadBrandingAsset(locals.supabase, 'pwa-icon-512', pwaIcon512File)
        : Promise.resolve(null),
      pwaIcon512MaskableFile instanceof File
        ? uploadBrandingAsset(locals.supabase, 'pwa-icon-512-maskable', pwaIcon512MaskableFile)
        : Promise.resolve(null),
    ]);

    const { data, error } = await locals.supabase
      .from('branding_settings')
      .update({
        name: parsed.data.name,
        token_prefix: parsed.data.tokenPrefix,
        ...(logoUrl && { logo_url: logoUrl }),
        ...(faviconUrl && { favicon_url: faviconUrl }),
        ...(pwaIcon192Url && { pwa_icon_192_url: pwaIcon192Url }),
        ...(pwaIcon512Url && { pwa_icon_512_url: pwaIcon512Url }),
        ...(pwaIcon512MaskableUrl && { pwa_icon_512_maskable_url: pwaIcon512MaskableUrl }),
        ...(parsed.data.primaryColor !== undefined && { primary_color: parsed.data.primaryColor }),
        ...(parsed.data.accentColor !== undefined && { accent_color: parsed.data.accentColor }),
        ...(parsed.data.accentYellowColor !== undefined && { accent_yellow_color: parsed.data.accentYellowColor }),
        ...(parsed.data.accentPinkColor !== undefined && { accent_pink_color: parsed.data.accentPinkColor }),
        ...(parsed.data.accentGreenColor !== undefined && { accent_green_color: parsed.data.accentGreenColor }),
        ...(parsed.data.accentBlueColor !== undefined && { accent_blue_color: parsed.data.accentBlueColor }),
        ...(parsed.data.accentLilacColor !== undefined && { accent_lilac_color: parsed.data.accentLilacColor }),
        ...(parsed.data.radiusRem !== undefined && { radius_rem: parsed.data.radiusRem }),
        ...(parsed.data.sidebarStyle !== undefined && { sidebar_style: parsed.data.sidebarStyle }),
        ...(parsed.data.qrDarkColor !== undefined && { qr_dark_color: parsed.data.qrDarkColor }),
      })
      .eq('id', 1)
      .select(
        'name, logo_url, favicon_url, token_prefix, primary_color, accent_color, accent_yellow_color, accent_pink_color, accent_green_color, accent_blue_color, accent_lilac_color, radius_rem, sidebar_style, qr_dark_color, pwa_icon_192_url, pwa_icon_512_url, pwa_icon_512_maskable_url',
      )
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message ?? 'No se pudo actualizar el branding' }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({
        name: data.name,
        logoUrl: data.logo_url,
        faviconUrl: data.favicon_url,
        tokenPrefix: data.token_prefix,
        primaryColor: data.primary_color,
        accentColor: data.accent_color,
        accentYellowColor: data.accent_yellow_color,
        accentPinkColor: data.accent_pink_color,
        accentGreenColor: data.accent_green_color,
        accentBlueColor: data.accent_blue_color,
        accentLilacColor: data.accent_lilac_color,
        radiusRem: data.radius_rem,
        sidebarStyle: data.sidebar_style,
        qrDarkColor: data.qr_dark_color,
        pwaIcon192Url: data.pwa_icon_192_url,
        pwaIcon512Url: data.pwa_icon_512_url,
        pwaIcon512MaskableUrl: data.pwa_icon_512_maskable_url,
      }),
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof BrandingAssetError) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
    throw err;
  }
};
