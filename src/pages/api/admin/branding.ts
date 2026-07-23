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
    hue: parseNullableNumberField(formData.get('hue')),
    radiusRem: parseNullableNumberField(formData.get('radiusRem')),
    sidebarStyle: parseNullableStringField(formData.get('sidebarStyle')),
    qrDarkColor: parseNullableStringField(formData.get('qrDarkColor')),
  });
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: firstErrorMessage(parsed) }), { status: 400 });
  }

  const logoFile = formData.get('logo');
  const faviconFile = formData.get('favicon');

  // RLS-scoped client, not the admin/service-role one — this route always
  // runs with a real superadmin session, same convention as
  // update-role.ts: rely on branding_settings_update_superadmin (RLS) and
  // branding_bucket_*_superadmin (storage RLS) as the actual enforcement,
  // the role check above is defense-in-depth.
  try {
    const [logoUrl, faviconUrl] = await Promise.all([
      logoFile instanceof File ? uploadBrandingAsset(locals.supabase, 'logo', logoFile) : Promise.resolve(null),
      faviconFile instanceof File
        ? uploadBrandingAsset(locals.supabase, 'favicon', faviconFile)
        : Promise.resolve(null),
    ]);

    const { data, error } = await locals.supabase
      .from('branding_settings')
      .update({
        name: parsed.data.name,
        token_prefix: parsed.data.tokenPrefix,
        ...(logoUrl && { logo_url: logoUrl }),
        ...(faviconUrl && { favicon_url: faviconUrl }),
        ...(parsed.data.hue !== undefined && { brand_hue: parsed.data.hue }),
        ...(parsed.data.radiusRem !== undefined && { radius_rem: parsed.data.radiusRem }),
        ...(parsed.data.sidebarStyle !== undefined && { sidebar_style: parsed.data.sidebarStyle }),
        ...(parsed.data.qrDarkColor !== undefined && { qr_dark_color: parsed.data.qrDarkColor }),
      })
      .eq('id', 1)
      .select('name, logo_url, favicon_url, token_prefix, brand_hue, radius_rem, sidebar_style, qr_dark_color')
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
        hue: data.brand_hue,
        radiusRem: data.radius_rem,
        sidebarStyle: data.sidebar_style,
        qrDarkColor: data.qr_dark_color,
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
